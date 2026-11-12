import "server-only";
import type { Booking, MeetingType, Participant, Prisma } from "@prisma/client";
import { DateTime } from "luxon";
import { z } from "zod";
import { buildAnswersSchema, formatAnswer, parseFormFields, CORE_FIELDS, type FormField } from "@/lib/forms/schema";
import { isValidTimezone } from "@/lib/format";
import { prisma, isOverlapViolation } from "../db";
import { env } from "../env";
import { DomainError } from "../errors";
import { logger } from "../logger";
import { HOLD_GRACE_MS, verifySlot } from "../availability/service";
import { getEventDestination } from "../calendars/registry";
import { googleEventIdFor } from "../calendars/google";
import { withSyncLog } from "../calendars/sync-log";
import { bookingReference, randomToken, sha256 } from "../security/crypto";
import { getStripe, paymentsAvailable } from "../payments/stripe";

const MINUTE = 60_000;

export const createBookingInput = z.object({
  meetingType: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  start: z.string().datetime({ offset: true }),
  timezone: z.string().min(1).max(64).refine(isValidTimezone, "Zona horaria inválida"),
  answers: z.record(z.unknown()),
});
export type CreateBookingInput = z.infer<typeof createBookingInput>;

export interface CreateBookingResult {
  bookingId: string;
  reference: string;
  status: Booking["status"];
  accessToken: string;
  checkoutUrl?: string;
}

type BookingWithRelations = Booking & {
  meetingType: MeetingType;
  participant: Participant;
  answers: { fieldKey: string; label: string; value: Prisma.JsonValue }[];
};

// ───────────────────────── Utilidades ─────────────────────────

async function getActiveMeetingType(slug: string): Promise<MeetingType> {
  const mt = await prisma.meetingType.findUnique({ where: { slug } });
  if (!mt) throw new DomainError("NOT_FOUND", "Tipo de reunión no encontrado.", 404);
  if (!mt.isActive) throw new DomainError("MEETING_TYPE_INACTIVE", "Este tipo de reunión no está disponible.", 409);
  return mt;
}

function blockedRange(mt: MeetingType, start: Date, end: Date) {
  return {
    blockedStartAt: new Date(start.getTime() - mt.bufferBeforeMinutes * MINUTE),
    blockedEndAt: new Date(end.getTime() + mt.bufferAfterMinutes * MINUTE),
  };
}

async function settings() {
  return (
    (await prisma.appSettings.findUnique({ where: { id: 1 } })) ?? {
      timezone: "America/Lima",
      holdMinutes: 10,
      paymentHoldMinutes: 30,
    }
  );
}

/** Descripción del evento en Google Calendar. */
export function buildEventDescription(b: BookingWithRelations, scheduleTz: string): string {
  const fields: FormField[] = parseFormFields(b.meetingType.formFields);
  const answers = new Map(b.answers.map((a) => [a.fieldKey, a]));
  const lines = [
    `Tipo de reunión: ${b.meetingType.name}`,
    `Nombre completo: ${b.participant.fullName}`,
    `Correo electrónico: ${b.participant.email}`,
    `Teléfono: ${b.participant.phone}`,
    `Zona horaria del participante: ${b.participantTimezone}`,
    "",
    "Respuestas del formulario:",
    ...fields.map((f) => `• ${f.label}: ${formatAnswer(f, answers.get(f.key)?.value)}`),
    "",
    `Horario (${scheduleTz}): ${DateTime.fromJSDate(b.startAt, { zone: scheduleTz }).toFormat("dd/MM/yyyy HH:mm")}`,
    `Reserva: ${b.reference}`,
    `ID interno: ${b.id}`,
    "— Agendado con Smart Booking",
  ];
  return lines.join("\n");
}

async function loadFull(id: string, tx: Prisma.TransactionClient = prisma): Promise<BookingWithRelations> {
  const b = await tx.booking.findUnique({
    where: { id },
    include: { meetingType: true, participant: true, answers: { select: { fieldKey: true, label: true, value: true } } },
  });
  if (!b) throw new DomainError("NOT_FOUND", "Reserva no encontrada.", 404);
  return b;
}

// ───────────────────────── Reservas temporales ─────────────────────────

/** Libera reservas temporales vencidas (más margen). Idempotente; se ejecuta antes de cada reserva y por cron. */
export async function expireStaleHolds(now = Date.now()): Promise<number> {
  const cutoff = new Date(now - HOLD_GRACE_MS);
  const stale = await prisma.booking.findMany({
    where: { status: { in: ["PENDING", "PAYMENT_PENDING"] }, expiresAt: { lt: cutoff } },
    select: { id: true },
  });
  if (!stale.length) return 0;
  const ids = stale.map((s) => s.id);
  await prisma.$transaction([
    prisma.booking.updateMany({
      where: { id: { in: ids }, status: { in: ["PENDING", "PAYMENT_PENDING"] }, expiresAt: { lt: cutoff } },
      data: { status: "EXPIRED" },
    }),
    prisma.payment.updateMany({ where: { bookingId: { in: ids }, status: "PENDING" }, data: { status: "EXPIRED" } }),
  ]);
  logger.info("holds_expired", { count: ids.length });
  return ids.length;
}

// ───────────────────────── Creación ─────────────────────────

/**
 * Flujo de reserva (verificaciones de disponibilidad #3 y #4 del requerimiento):
 *  1. Validación de entrada y formulario (zod).
 *  2. Re-verificación EN VIVO del horario contra Google + Microsoft + reservas propias.
 *  3. Reserva temporal en BD protegida por constraint EXCLUDE (concurrencia).
 *  4a. Gratis: nueva verificación en vivo → evento en Google → CONFIRMED.
 *  4b. Pago: sesión de Stripe Checkout; se confirma solo vía webhook.
 */
export async function createBooking(raw: unknown): Promise<CreateBookingResult> {
  const input = createBookingInput.parse(raw);
  const mt = await getActiveMeetingType(input.meetingType);

  if (mt.requiresPayment && (mt.priceAmount == null || !mt.currency || mt.priceAmount <= 0)) {
    throw new DomainError("PAYMENT_NOT_CONFIGURED", "El precio de esta sesión aún no ha sido configurado.", 503);
  }
  if (mt.requiresPayment && !paymentsAvailable()) {
    throw new DomainError("PAYMENT_NOT_CONFIGURED", "Los pagos aún no están configurados.", 503);
  }

  const fields = parseFormFields(mt.formFields);
  const answers = buildAnswersSchema(fields).parse(input.answers) as Record<string, unknown>;

  const start = new Date(input.start);
  const end = new Date(start.getTime() + mt.durationMinutes * MINUTE);
  if (start.getTime() <= Date.now()) {
    throw new DomainError("SLOT_UNAVAILABLE", "Ese horario ya pasó. Elige otro.", 409);
  }

  // Verificación en vivo antes de reservar
  if (!(await verifySlot(mt, start.getTime()))) {
    throw new DomainError("SLOT_UNAVAILABLE", "Ese horario acaba de ocuparse. Por favor, elige otro.", 409);
  }

  await expireStaleHolds();

  const cfg = await settings();
  const holdMinutes = mt.requiresPayment ? Math.max(30, cfg.paymentHoldMinutes) : cfg.holdMinutes;
  const expiresAt = new Date(Date.now() + holdMinutes * MINUTE);
  const accessToken = randomToken(24);

  let booking: Booking;
  try {
    booking = await prisma.$transaction(async (tx) => {
      const email = String(answers.email);
      const participant =
        (await tx.participant.findFirst({ where: { email }, orderBy: { createdAt: "desc" } })) ??
        (await tx.participant.create({
          data: { email, fullName: String(answers.fullName), phone: String(answers.phone) },
        }));
      if (participant.fullName !== answers.fullName || participant.phone !== answers.phone) {
        await tx.participant.update({
          where: { id: participant.id },
          data: { fullName: String(answers.fullName), phone: String(answers.phone) },
        });
      }
      const created = await tx.booking.create({
        data: {
          reference: bookingReference(),
          meetingTypeId: mt.id,
          participantId: participant.id,
          startAt: start,
          endAt: end,
          ...blockedRange(mt, start, end),
          participantTimezone: input.timezone,
          status: mt.requiresPayment ? "PAYMENT_PENDING" : "PENDING",
          expiresAt,
          accessTokenHash: sha256(accessToken),
        },
      });
      const coreKeys = new Set(CORE_FIELDS.map((f) => f.key));
      const extra = fields.filter((f) => !coreKeys.has(f.key));
      if (extra.length) {
        await tx.formResponse.createMany({
          data: extra.map((f) => ({
            bookingId: created.id,
            fieldKey: f.key,
            label: f.label,
            value: (answers[f.key] ?? null) as Prisma.InputJsonValue,
          })),
        });
      }
      return created;
    });
  } catch (err) {
    if (isOverlapViolation(err)) {
      throw new DomainError("SLOT_UNAVAILABLE", "Alguien acaba de reservar ese horario. Por favor, elige otro.", 409);
    }
    throw err;
  }

  logger.info("booking_hold_created", { bookingId: booking.id, meetingType: mt.slug, paid: mt.requiresPayment });

  if (mt.requiresPayment) {
    try {
      const checkoutUrl = await createCheckout(booking, mt, String(answers.email), accessToken, expiresAt);
      return { bookingId: booking.id, reference: booking.reference, status: booking.status, accessToken, checkoutUrl };
    } catch (err) {
      await prisma.booking.update({ where: { id: booking.id }, data: { status: "FAILED", expiresAt: null } });
      logger.error("checkout_create_failed", { bookingId: booking.id, err });
      if (err instanceof DomainError) throw err;
      throw new DomainError("PAYMENT_ERROR", "No pudimos iniciar el pago. Inténtalo nuevamente.", 502);
    }
  }

  const finalized = await finalizeCalendar(booking.id, { failureStatus: "FAILED" });
  if (finalized.status !== "CONFIRMED") {
    if (finalized.reason === "conflict") {
      throw new DomainError("SLOT_UNAVAILABLE", "Ese horario acaba de ocuparse. Por favor, elige otro.", 409);
    }
    throw new DomainError(
      "CALENDAR_WRITE_FAILED",
      "No pudimos registrar la reunión en el calendario. Tu reserva no se completó; inténtalo nuevamente.",
      502,
    );
  }
  return { bookingId: booking.id, reference: booking.reference, status: "CONFIRMED", accessToken };
}

async function createCheckout(
  booking: Booking,
  mt: MeetingType,
  email: string,
  accessToken: string,
  expiresAt: Date,
): Promise<string> {
  const base = env().APP_URL.replace(/\/$/, "");
  const statusUrl = `${base}/booking/status/${booking.id}?token=${encodeURIComponent(accessToken)}`;
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: email,
      client_reference_id: booking.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: mt.currency!.toLowerCase(),
            unit_amount: mt.priceAmount!,
            product_data: {
              name: mt.name,
              description: `${mt.durationMinutes} min · ${DateTime.fromJSDate(booking.startAt, { zone: booking.participantTimezone })
                .setLocale("es")
                .toFormat("cccc d LLL yyyy, HH:mm")} (${booking.participantTimezone})`,
            },
          },
        },
      ],
      metadata: { bookingId: booking.id, reference: booking.reference },
      payment_intent_data: { metadata: { bookingId: booking.id, reference: booking.reference } },
      // Stripe exige expires_at entre 30 min y 24 h desde ahora.
      expires_at: Math.floor(expiresAt.getTime() / 1000),
      success_url: `${statusUrl}&paid=1`,
      cancel_url: `${statusUrl}&cancelled=1`,
      locale: "es",
    },
    { idempotencyKey: `checkout-${booking.id}` },
  );
  if (!session.url) throw new DomainError("PAYMENT_ERROR", "Stripe no devolvió una URL de pago.", 502);
  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      stripeCheckoutSessionId: session.id,
      amount: mt.priceAmount!,
      currency: mt.currency!.toLowerCase(),
      status: "PENDING",
    },
  });
  return session.url;
}

// ───────────────────────── Confirmación en calendario ─────────────────────────

export interface FinalizeResult {
  status: Booking["status"];
  reason?: "conflict" | "calendar_error" | "not_pending";
}

/**
 * Re-verifica en vivo (verificación #4) y crea el evento en Google Calendar.
 * Solo una reserva con evento creado pasa a CONFIRMED.
 *  - failureStatus "FAILED": reservas gratuitas → se libera el horario y se informa al usuario.
 *  - failureStatus "PENDING": reservas pagadas → se mantiene el horario y el cron reintenta.
 */
export async function finalizeCalendar(
  bookingId: string,
  opts: { failureStatus: "FAILED" | "PENDING" },
): Promise<FinalizeResult> {
  const b = await loadFull(bookingId);
  if (b.status === "CONFIRMED") return { status: "CONFIRMED" };
  if (b.status !== "PENDING") return { status: b.status, reason: "not_pending" };

  const cfg = await settings();
  let available: boolean;
  try {
    available = await verifySlot(b.meetingType, b.startAt.getTime(), {
      excludeBookingId: b.id,
      ignoreNotice: true,
      // Si un intento previo ya creó el evento, no debe contarse como conflicto consigo mismo.
      ignoreExternalInterval:
        b.calendarSyncState !== "NOT_SYNCED" || b.googleEventId
          ? { start: b.startAt.getTime(), end: b.endAt.getTime() }
          : undefined,
    });
  } catch (err) {
    logger.warn("finalize_verify_failed", { bookingId, err });
    await markCalendarFailure(b.id, opts.failureStatus, "No se pudo verificar la disponibilidad");
    return { status: opts.failureStatus, reason: "calendar_error" };
  }
  if (!available || b.startAt.getTime() < Date.now()) {
    await prisma.booking.update({
      where: { id: b.id },
      data: {
        status: opts.failureStatus === "FAILED" ? "FAILED" : "PENDING",
        expiresAt: null,
        calendarSyncError: "Conflicto de agenda detectado antes de crear el evento",
      },
    });
    return { status: opts.failureStatus, reason: "conflict" };
  }

  const destination = getEventDestination();
  if (!destination) {
    await markCalendarFailure(b.id, opts.failureStatus, "Google Calendar no conectado");
    return { status: opts.failureStatus, reason: "calendar_error" };
  }

  try {
    const ev = await withSyncLog(
      "GOOGLE",
      "event.create",
      () =>
        destination.createEvent({
          eventId: googleEventIdFor(b.id),
          bookingId: b.id,
          summary: `${b.meetingType.eventTitle} | ${b.participant.fullName}`,
          description: buildEventDescription(b, cfg.timezone),
          start: b.startAt,
          end: b.endAt,
          timezone: cfg.timezone,
          attendee: { email: b.participant.email, name: b.participant.fullName },
          addVideoConference: b.meetingType.addVideoConference,
          meetingTypeSlug: b.meetingType.slug,
        }),
      b.id,
    );
    const updated = await prisma.booking.updateMany({
      where: { id: b.id, status: "PENDING" },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        expiresAt: null,
        googleEventId: ev.eventId,
        googleCalendarId: ev.calendarId,
        meetingUrl: ev.meetingUrl,
        calendarSyncState: "SYNCED",
        calendarSyncError: null,
      },
    });
    if (updated.count === 0) {
      // La reserva cambió de estado mientras se creaba el evento (p. ej. expiró): revertir el evento.
      logger.warn("finalize_race_rollback", { bookingId: b.id });
      await destination.deleteEvent(ev.calendarId, ev.eventId).catch(() => undefined);
      const current = await prisma.booking.findUnique({ where: { id: b.id }, select: { status: true } });
      return { status: current?.status ?? "FAILED", reason: "not_pending" };
    }
    logger.info("booking_confirmed", { bookingId: b.id });
    return { status: "CONFIRMED" };
  } catch (err) {
    logger.error("calendar_event_create_failed", { bookingId: b.id, err });
    await markCalendarFailure(b.id, opts.failureStatus, (err as Error).message ?? "error");
    return { status: opts.failureStatus, reason: "calendar_error" };
  }
}

async function markCalendarFailure(id: string, failureStatus: "FAILED" | "PENDING", message: string) {
  await prisma.booking.update({
    where: { id },
    data: {
      status: failureStatus,
      ...(failureStatus === "FAILED" ? { expiresAt: null } : {}),
      calendarSyncState: "FAILED",
      calendarSyncError: message.slice(0, 500),
    },
  });
}

// ───────────────────────── Pagos (llamado desde el webhook) ─────────────────────────

export interface PaymentConfirmation {
  bookingId: string;
  checkoutSessionId: string;
  paymentIntentId: string | null;
  amountTotal: number | null;
  currency: string | null;
}

/**
 * Pago confirmado por Stripe. Mantiene el horario (sin expiración) y crea el evento.
 * Si el horario ya no está disponible (expiró y fue tomado, o apareció un conflicto),
 * se reembolsa automáticamente y la reserva queda CANCELLED.
 */
export async function handlePaymentSucceeded(p: PaymentConfirmation): Promise<FinalizeResult> {
  const booking = await prisma.booking.findUnique({ where: { id: p.bookingId }, include: { payments: true } });
  if (!booking) throw new DomainError("NOT_FOUND", "Reserva no encontrada", 404);

  const payment = booking.payments.find((x) => x.stripeCheckoutSessionId === p.checkoutSessionId);
  if (payment && p.amountTotal != null && (p.amountTotal !== payment.amount || p.currency?.toLowerCase() !== payment.currency)) {
    logger.error("payment_amount_mismatch", { bookingId: booking.id });
    throw new DomainError("PAYMENT_ERROR", "El monto pagado no coincide", 400);
  }
  await prisma.payment.updateMany({
    where: { stripeCheckoutSessionId: p.checkoutSessionId, status: { in: ["PENDING", "EXPIRED", "FAILED"] } },
    data: { status: "PAID", paidAt: new Date(), stripePaymentIntentId: p.paymentIntentId },
  });

  if (booking.status === "CONFIRMED") return { status: "CONFIRMED" };
  // Reserva ya reprogramada: el pago vive en la reserva vigente; nunca resucitar la anterior.
  if (booking.status === "RESCHEDULED") return { status: "RESCHEDULED" };
  if (booking.status === "CANCELLED") {
    await refundBookingPayments(booking.id, "Reserva cancelada antes de confirmar el pago");
    return { status: "CANCELLED" };
  }

  // Pasar a PENDING sin expiración (pago recibido). Si estaba EXPIRED/FAILED intentamos recuperar el horario.
  try {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "PENDING", expiresAt: null },
    });
  } catch (err) {
    if (isOverlapViolation(err)) {
      await cancelWithRefund(booking.id, "El horario fue tomado mientras se procesaba el pago");
      return { status: "CANCELLED", reason: "conflict" };
    }
    throw err;
  }

  const result = await finalizeCalendar(booking.id, { failureStatus: "PENDING" });
  if (result.reason === "conflict") {
    await cancelWithRefund(booking.id, "Conflicto de agenda detectado tras el pago");
    return { status: "CANCELLED", reason: "conflict" };
  }
  return result;
}

export async function handleCheckoutExpired(bookingId: string, checkoutSessionId: string) {
  await prisma.payment.updateMany({
    where: { stripeCheckoutSessionId: checkoutSessionId, status: "PENDING" },
    data: { status: "EXPIRED" },
  });
  await prisma.booking.updateMany({
    where: { id: bookingId, status: "PAYMENT_PENDING" },
    data: { status: "EXPIRED" },
  });
}

export async function handlePaymentFailed(bookingId: string, checkoutSessionId: string, reason: string) {
  await prisma.payment.updateMany({
    where: { stripeCheckoutSessionId: checkoutSessionId, status: { in: ["PENDING", "PAID"] } },
    data: { status: "FAILED", failureReason: reason.slice(0, 300) },
  });
  await prisma.booking.updateMany({
    where: { id: bookingId, status: { in: ["PAYMENT_PENDING", "PENDING"] }, confirmedAt: null },
    data: { status: "FAILED", expiresAt: null },
  });
}

async function cancelWithRefund(bookingId: string, reason: string) {
  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason, expiresAt: null },
  });
  await refundBookingPayments(bookingId, reason);
}

export async function refundBookingPayments(bookingId: string, reason: string) {
  const paid = await prisma.payment.findMany({ where: { bookingId, status: "PAID" } });
  for (const pay of paid) {
    if (!pay.stripePaymentIntentId) continue;
    try {
      await getStripe().refunds.create(
        { payment_intent: pay.stripePaymentIntentId, metadata: { bookingId, reason: reason.slice(0, 200) } },
        { idempotencyKey: `refund-${pay.id}` },
      );
      await prisma.payment.update({ where: { id: pay.id }, data: { status: "REFUNDED", refundedAt: new Date() } });
      logger.info("payment_refunded", { bookingId, paymentId: pay.id });
    } catch (err) {
      logger.error("refund_failed", { bookingId, paymentId: pay.id, err });
      await prisma.payment.update({ where: { id: pay.id }, data: { failureReason: "Reembolso fallido: revisar en Stripe" } });
    }
  }
}

// ───────────────────────── Administración ─────────────────────────

export async function cancelBooking(id: string, opts: { reason?: string; refund?: boolean }) {
  const b = await loadFull(id);
  if (!["CONFIRMED", "PENDING", "PAYMENT_PENDING"].includes(b.status)) {
    throw new DomainError("CONFLICT", "Solo se pueden cancelar reservas activas.", 409);
  }
  if (b.googleEventId && b.googleCalendarId) {
    const destination = getEventDestination();
    if (destination) {
      await withSyncLog("GOOGLE", "event.delete", () => destination.deleteEvent(b.googleCalendarId!, b.googleEventId!), b.id);
    }
  }
  await prisma.booking.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: opts.reason?.slice(0, 500) ?? null,
      expiresAt: null,
      calendarSyncState: b.googleEventId ? "DELETED" : b.calendarSyncState,
    },
  });
  // Si había un checkout abierto, se invalida para que no se pueda pagar.
  const pending = await prisma.payment.findMany({ where: { bookingId: id, status: "PENDING" } });
  for (const p of pending) {
    if (p.stripeCheckoutSessionId) await getStripe().checkout.sessions.expire(p.stripeCheckoutSessionId).catch(() => undefined);
    await prisma.payment.update({ where: { id: p.id }, data: { status: "EXPIRED" } });
  }
  if (opts.refund) await refundBookingPayments(id, opts.reason ?? "Cancelada por la organizadora");
}

/**
 * Reprogramación: crea una nueva reserva CONFIRMED vinculada (la anterior queda RESCHEDULED)
 * y mueve el evento existente en Google Calendar (el participante recibe la actualización).
 */
export async function rescheduleBooking(id: string, newStartIso: string): Promise<string> {
  const b = await loadFull(id);
  if (b.status !== "CONFIRMED") throw new DomainError("CONFLICT", "Solo se pueden reprogramar reservas confirmadas.", 409);
  const start = new Date(newStartIso);
  if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
    throw new DomainError("VALIDATION_ERROR", "Fecha inválida.", 422);
  }
  const end = new Date(start.getTime() + b.meetingType.durationMinutes * MINUTE);
  const ok = await verifySlot(b.meetingType, start.getTime(), {
    excludeBookingId: b.id,
    ignoreNotice: true,
    ignoreExternalInterval: { start: b.startAt.getTime(), end: b.endAt.getTime() },
  });
  if (!ok) throw new DomainError("SLOT_UNAVAILABLE", "Ese horario no está disponible.", 409);

  let newId: string;
  try {
    newId = await prisma.$transaction(async (tx) => {
      await tx.booking.update({ where: { id: b.id }, data: { status: "RESCHEDULED" } });
      const nb = await tx.booking.create({
        data: {
          reference: bookingReference(),
          meetingTypeId: b.meetingTypeId,
          participantId: b.participantId,
          startAt: start,
          endAt: end,
          ...blockedRange(b.meetingType, start, end),
          participantTimezone: b.participantTimezone,
          status: "CONFIRMED",
          confirmedAt: new Date(),
          googleEventId: b.googleEventId,
          googleCalendarId: b.googleCalendarId,
          meetingUrl: b.meetingUrl,
          calendarSyncState: b.calendarSyncState,
          accessTokenHash: b.accessTokenHash,
          rescheduledFromId: b.id,
        },
      });
      if (b.answers.length) {
        await tx.formResponse.createMany({
          data: b.answers.map((a) => ({
            bookingId: nb.id,
            fieldKey: a.fieldKey,
            label: a.label,
            value: a.value as Prisma.InputJsonValue,
          })),
        });
      }
      // Los pagos quedan asociados a la reserva vigente.
      await tx.payment.updateMany({ where: { bookingId: b.id }, data: { bookingId: nb.id } });
      return nb.id;
    });
  } catch (err) {
    if (isOverlapViolation(err)) throw new DomainError("SLOT_UNAVAILABLE", "Ese horario no está disponible.", 409);
    throw err;
  }

  if (b.googleEventId && b.googleCalendarId) {
    const destination = getEventDestination();
    const cfg = await settings();
    try {
      if (!destination) throw new Error("Google Calendar no conectado");
      await withSyncLog(
        "GOOGLE",
        "event.reschedule",
        () => destination.updateEventTime(b.googleCalendarId!, b.googleEventId!, start, end, cfg.timezone),
        newId,
      );
    } catch (err) {
      // Revertir para no mostrar una reprogramación que no está en el calendario.
      await prisma.$transaction(async (tx) => {
        await tx.payment.updateMany({ where: { bookingId: newId }, data: { bookingId: b.id } });
        await tx.formResponse.deleteMany({ where: { bookingId: newId } });
        await tx.booking.delete({ where: { id: newId } });
        await tx.booking.update({ where: { id: b.id }, data: { status: "CONFIRMED" } });
      });
      logger.error("reschedule_calendar_failed", { bookingId: b.id, err });
      throw new DomainError("CALENDAR_WRITE_FAILED", "No se pudo mover el evento en Google Calendar.", 502);
    }
  }
  return newId;
}

/** Reintenta crear eventos de reservas pagadas cuyo registro en Google falló (cron). */
export async function retryPendingCalendarSync(): Promise<number> {
  const pending = await prisma.booking.findMany({
    where: { status: "PENDING", expiresAt: null, payments: { some: { status: "PAID" } } },
    select: { id: true },
    take: 20,
  });
  let confirmed = 0;
  for (const { id } of pending) {
    const r = await handleRetry(id);
    if (r === "CONFIRMED") confirmed++;
  }
  return confirmed;
}

async function handleRetry(id: string) {
  const r = await finalizeCalendar(id, { failureStatus: "PENDING" });
  if (r.reason === "conflict") await cancelWithRefund(id, "Conflicto de agenda detectado tras el pago");
  return r.status;
}

// ───────────────────────── Consulta pública ─────────────────────────

export async function getBookingForParticipant(id: string, token: string) {
  const b = await prisma.booking.findUnique({
    where: { id },
    include: { meetingType: true, rescheduledTo: { select: { id: true } } },
  });
  if (!b || !b.accessTokenHash || b.accessTokenHash !== sha256(token)) {
    throw new DomainError("NOT_FOUND", "Reserva no encontrada.", 404);
  }
  return {
    id: b.id,
    reference: b.reference,
    status: b.status,
    meetingType: { slug: b.meetingType.slug, name: b.meetingType.name, durationMinutes: b.meetingType.durationMinutes },
    start: b.startAt.toISOString(),
    end: b.endAt.toISOString(),
    timezone: b.participantTimezone,
    meetingUrl: b.status === "CONFIRMED" ? b.meetingUrl : null,
    expiresAt: b.expiresAt?.toISOString() ?? null,
    cancelReason: b.status === "CANCELLED" ? b.cancelReason : null,
    rescheduledToId: b.rescheduledTo?.id ?? null,
  };
}
export type PublicBooking = Awaited<ReturnType<typeof getBookingForParticipant>>;
