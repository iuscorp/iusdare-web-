import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DomainError } from "@/server/errors";
import { createBooking, expireStaleHolds, retryPendingCalendarSync } from "@/server/bookings/service";
import { processStripeEvent, verifyStripeEvent } from "@/server/payments/webhook";
import { answersFor, iso, nextMondayAt, prisma, resetDb, seedBase } from "../helpers/db";
import { checkoutEvent, installCalendars, installStripe, realStripe, resetOverrides } from "../helpers/fakes";

let cal: ReturnType<typeof installCalendars>;
let stripe: ReturnType<typeof installStripe>;
const WHSEC = "whsec_test_secret_for_signature_checks";

beforeEach(async () => {
  await resetDb();
  await seedBase();
  cal = installCalendars();
  stripe = installStripe();
});
afterEach(() => resetOverrides());

async function errorOf(p: Promise<unknown>): Promise<DomainError> {
  try {
    await p;
  } catch (e) {
    if (e instanceof DomainError) return e;
    throw e;
  }
  throw new Error("se esperaba un error");
}

const bookAsesoria = (start = iso(nextMondayAt(10))) =>
  createBooking({ meetingType: "asesoria", start, timezone: "America/Bogota", answers: answersFor.asesoria() });

async function sessionOf(bookingId: string) {
  return prisma.payment.findFirstOrThrow({ where: { bookingId } });
}

async function pay(bookingId: string, extra: Partial<Parameters<typeof checkoutEvent>[1]> = {}, eventId?: string) {
  const p = await sessionOf(bookingId);
  return processStripeEvent(
    checkoutEvent("checkout.session.completed", { id: p.stripeCheckoutSessionId!, bookingId, amount: p.amount, ...extra }, eventId),
  );
}

describe("asesoría: inicio de pago", () => {
  it("crea reserva temporal PAYMENT_PENDING + sesión de Stripe Checkout", async () => {
    const r = await bookAsesoria();
    expect(r.status).toBe("PAYMENT_PENDING");
    expect(r.checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.test/);
    expect(cal.destination.created).toHaveLength(0); // sin evento hasta el pago

    const b = await prisma.booking.findUniqueOrThrow({ where: { id: r.bookingId } });
    expect(b.endAt.getTime() - b.startAt.getTime()).toBe(45 * 60_000);
    expect(b.expiresAt!.getTime()).toBeGreaterThan(Date.now() + 29 * 60_000);

    const params = stripe.sessions[0]!;
    expect(params.mode).toBe("payment");
    expect(params.line_items![0]!.price_data!.unit_amount).toBe(15000);
    expect(params.line_items![0]!.price_data!.currency).toBe("pen");
    expect(params.metadata!.bookingId).toBe(r.bookingId);
    expect(params.expires_at).toBe(Math.floor(b.expiresAt!.getTime() / 1000));
    expect(params.success_url).toContain(`/booking/status/${r.bookingId}?token=`);

    const p = await sessionOf(r.bookingId);
    expect(p).toMatchObject({ status: "PENDING", amount: 15000, currency: "pen" });
  });

  it("precio no configurado → PAYMENT_NOT_CONFIGURED", async () => {
    await prisma.meetingType.update({ where: { slug: "asesoria" }, data: { priceAmount: null, currency: null } });
    expect((await errorOf(bookAsesoria())).code).toBe("PAYMENT_NOT_CONFIGURED");
    expect(await prisma.booking.count()).toBe(0);
  });

  it("si Stripe falla al crear la sesión, la reserva temporal se libera", async () => {
    stripe.sessions.push = () => {
      throw new Error("stripe down");
    };
    const err = await errorOf(bookAsesoria());
    expect(err.code).toBe("PAYMENT_ERROR");
    expect((await prisma.booking.findFirstOrThrow()).status).toBe("FAILED");
  });
});

describe("webhook de Stripe", () => {
  it("firma inválida o ausente → rechazada; firma válida → evento", () => {
    const payload = JSON.stringify(checkoutEvent("checkout.session.completed", { id: "cs_1", bookingId: "b", amount: 1 }));
    expect(() => verifyStripeEvent(payload, null)).toThrow(DomainError);
    expect(() => verifyStripeEvent(payload, "t=1,v1=deadbeef")).toThrow(DomainError);
    const badSecret = realStripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_other" });
    expect(() => verifyStripeEvent(payload, badSecret)).toThrow(DomainError);
    const good = realStripe.webhooks.generateTestHeaderString({ payload, secret: WHSEC });
    expect(verifyStripeEvent(payload, good).type).toBe("checkout.session.completed");
    expect(() => verifyStripeEvent(payload.replace('"b"', '"x"'), good)).toThrow(DomainError);
  });

  it("checkout.session.completed (pagado) → evento en Google + CONFIRMED + pago PAID", async () => {
    const r = await bookAsesoria();
    const res = await pay(r.bookingId);
    expect(res.duplicate).toBe(false);
    const b = await prisma.booking.findUniqueOrThrow({ where: { id: r.bookingId } });
    expect(b.status).toBe("CONFIRMED");
    expect(b.expiresAt).toBeNull();
    expect(cal.destination.created).toHaveLength(1);
    expect(cal.destination.created[0]!.summary).toBe("Asesoría profesional | María Quispe");
    expect(cal.destination.created[0]!.end.getTime() - cal.destination.created[0]!.start.getTime()).toBe(45 * 60_000);
    const p = await sessionOf(r.bookingId);
    expect(p.status).toBe("PAID");
    expect(p.stripePaymentIntentId).toBe("pi_test_123");
    expect(p.paidAt).not.toBeNull();
  });

  it("el mismo evento entregado dos veces se procesa una sola vez", async () => {
    const r = await bookAsesoria();
    expect((await pay(r.bookingId, {}, "evt_dup")).duplicate).toBe(false);
    expect((await pay(r.bookingId, {}, "evt_dup")).duplicate).toBe(true);
    // un evento distinto para la misma sesión tampoco duplica el evento de calendario
    await pay(r.bookingId, {}, "evt_other");
    expect(cal.destination.created).toHaveLength(1);
  });

  it("checkout completado sin pagar (asíncrono) → sigue PAYMENT_PENDING", async () => {
    const r = await bookAsesoria();
    await pay(r.bookingId, { paid: false });
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: r.bookingId } })).status).toBe("PAYMENT_PENDING");
  });

  it("monto que no coincide → rechazado, no confirmado y reintentable", async () => {
    const r = await bookAsesoria();
    await expect(pay(r.bookingId, { amount: 100 }, "evt_bad")).rejects.toBeInstanceOf(DomainError);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: r.bookingId } })).status).toBe("PAYMENT_PENDING");
    expect(await prisma.stripeEvent.count({ where: { id: "evt_bad" } })).toBe(0);
  });

  it("checkout.session.expired → EXPIRED y horario libre", async () => {
    const r = await bookAsesoria();
    const p = await sessionOf(r.bookingId);
    await processStripeEvent(checkoutEvent("checkout.session.expired", { id: p.stripeCheckoutSessionId!, bookingId: r.bookingId, amount: p.amount }));
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: r.bookingId } })).status).toBe("EXPIRED");
    expect((await sessionOf(r.bookingId)).status).toBe("EXPIRED");
    const again = await createBooking({
      meetingType: "cafecito-virtual",
      start: iso(nextMondayAt(10)),
      timezone: "America/Lima",
      answers: answersFor["cafecito-virtual"](),
    });
    expect(again.status).toBe("CONFIRMED");
  });

  it("pago tras expirar la reserva y con el horario tomado → reembolso automático + CANCELLED", async () => {
    const r = await bookAsesoria();
    await prisma.booking.update({ where: { id: r.bookingId }, data: { expiresAt: new Date(Date.now() - 10 * 60_000) } });
    await expireStaleHolds();
    const other = await createBooking({
      meetingType: "cafecito-virtual",
      start: iso(nextMondayAt(10)),
      timezone: "America/Lima",
      answers: answersFor["cafecito-virtual"](),
    });
    expect(other.status).toBe("CONFIRMED");

    await pay(r.bookingId);
    const b = await prisma.booking.findUniqueOrThrow({ where: { id: r.bookingId } });
    expect(b.status).toBe("CANCELLED");
    expect(stripe.refunds).toHaveLength(1);
    expect(stripe.refunds[0]!.payment_intent).toBe("pi_test_123");
    expect((await sessionOf(r.bookingId)).status).toBe("REFUNDED");
    expect(cal.destination.created).toHaveLength(1); // solo el cafecito
  });

  it("pago tras expirar pero con el horario aún libre → se recupera y confirma", async () => {
    const r = await bookAsesoria();
    await prisma.booking.update({ where: { id: r.bookingId }, data: { expiresAt: new Date(Date.now() - 10 * 60_000) } });
    await expireStaleHolds();
    await pay(r.bookingId);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: r.bookingId } })).status).toBe("CONFIRMED");
  });

  it("conflicto externo aparecido durante el pago → reembolso + CANCELLED", async () => {
    const r = await bookAsesoria();
    cal.microsoft.busy = [{ start: nextMondayAt(10).toMillis(), end: nextMondayAt(11).toMillis() }];
    await pay(r.bookingId);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: r.bookingId } })).status).toBe("CANCELLED");
    expect(stripe.refunds).toHaveLength(1);
  });

  it("Google falla tras el pago → PENDING (no confirmado), horario retenido; el cron reintenta y confirma", async () => {
    const r = await bookAsesoria();
    cal.destination.failCreate = true;
    await pay(r.bookingId);
    let b = await prisma.booking.findUniqueOrThrow({ where: { id: r.bookingId } });
    expect(b.status).toBe("PENDING");
    expect(b.expiresAt).toBeNull();
    expect(b.calendarSyncState).toBe("FAILED");
    // el horario sigue bloqueado y no expira
    expect(await expireStaleHolds(Date.now() + 86_400_000)).toBe(0);
    await expect(
      createBooking({ meetingType: "cafecito-virtual", start: iso(nextMondayAt(10)), timezone: "America/Lima", answers: answersFor["cafecito-virtual"]() }),
    ).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });

    cal.destination.failCreate = false;
    expect(await retryPendingCalendarSync()).toBe(1);
    b = await prisma.booking.findUniqueOrThrow({ where: { id: r.bookingId } });
    expect(b.status).toBe("CONFIRMED");
    expect(b.calendarSyncState).toBe("SYNCED");
  });

  it("async_payment_failed → FAILED", async () => {
    const r = await bookAsesoria();
    const p = await sessionOf(r.bookingId);
    await processStripeEvent(
      checkoutEvent("checkout.session.async_payment_failed", { id: p.stripeCheckoutSessionId!, bookingId: r.bookingId, amount: p.amount }),
    );
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: r.bookingId } })).status).toBe("FAILED");
    expect((await sessionOf(r.bookingId)).status).toBe("FAILED");
  });
});

describe("webhook: casos de borde de estado", () => {
  it("pago recibido para una reserva ya cancelada → reembolso, sigue CANCELLED", async () => {
    const r = await bookAsesoria();
    const { cancelBooking } = await import("@/server/bookings/service");
    await cancelBooking(r.bookingId, { reason: "Cancelada" });
    expect(stripe.expired).toHaveLength(1); // checkout abierto invalidado
    await pay(r.bookingId);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: r.bookingId } })).status).toBe("CANCELLED");
    expect(stripe.refunds).toHaveLength(1);
    expect(cal.destination.created).toHaveLength(0);
  });

  it("evento tardío para una reserva reprogramada no la resucita", async () => {
    const r = await bookAsesoria();
    await pay(r.bookingId, {}, "evt_first");
    const { rescheduleBooking } = await import("@/server/bookings/service");
    const newId = await rescheduleBooking(r.bookingId, iso(nextMondayAt(15)));
    const p = await prisma.payment.findFirstOrThrow({ where: { bookingId: newId } });
    await processStripeEvent(
      checkoutEvent("checkout.session.completed", { id: p.stripeCheckoutSessionId!, bookingId: r.bookingId, amount: p.amount }, "evt_late"),
    );
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: r.bookingId } })).status).toBe("RESCHEDULED");
    expect(await prisma.booking.count({ where: { status: "CONFIRMED" } })).toBe(1);
    expect(cal.destination.created).toHaveLength(1);
  });

  it("charge.refunded marca el pago como REFUNDED", async () => {
    const r = await bookAsesoria();
    await pay(r.bookingId);
    await processStripeEvent({
      id: "evt_refund",
      object: "event",
      type: "charge.refunded",
      data: { object: { object: "charge", refunded: true, payment_intent: "pi_test_123" } },
    } as never);
    expect((await sessionOf(r.bookingId)).status).toBe("REFUNDED");
  });
});
