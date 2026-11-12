"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { actionError, type ActionState } from "@/server/admin/action-result";
import { cancelBooking, rescheduleBooking } from "@/server/bookings/service";
import {
  addException,
  appSettingsSchema,
  deleteException,
  disconnectIntegration,
  exceptionSchema,
  meetingTypeSettingsSchema,
  replaceWeeklyRules,
  setBusyCalendars,
  setMeetingTypePrice,
  updateAppSettings,
  updateMeetingTypeSettings,
  weeklyRulesSchema,
} from "@/server/admin/mutations";

const uuid = z.string().uuid();

function hhmm(v: FormDataEntryValue | null): number | null {
  if (typeof v !== "string" || !v) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(v);
  if (!m) return null;
  const total = Number(m[1]) * 60 + Number(m[2]);
  return Number(m[2]) > 59 || total > 1440 ? null : total;
}

// ───────────── Reservas ─────────────

export async function cancelBookingAction(bookingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const id = uuid.parse(bookingId);
    const reason = z.string().trim().max(500).optional().parse(formData.get("reason") ?? undefined) || undefined;
    const refund = formData.get("refund") === "on";
    await cancelBooking(id, { reason, refund });
    await audit(admin.id, "booking.cancelled", "Booking", id, { refund });
    revalidatePath("/admin", "layout");
    return { ok: true, message: refund ? "Reserva cancelada y reembolso solicitado." : "Reserva cancelada." };
  } catch (err) {
    return actionError(err);
  }
}

export async function rescheduleBookingAction(bookingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  let newId: string;
  try {
    const admin = await requireAdmin();
    const id = uuid.parse(bookingId);
    const start = z.string().datetime({ offset: true, message: "Selecciona un horario" }).parse(formData.get("start"));
    newId = await rescheduleBooking(id, start);
    await audit(admin.id, "booking.rescheduled", "Booking", id, { newBookingId: newId, start });
    revalidatePath("/admin", "layout");
  } catch (err) {
    return actionError(err);
  }
  redirect(`/admin/bookings/${newId}?rescheduled=1`);
}

// ───────────── Disponibilidad ─────────────

export async function saveWeeklyRulesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    let raw: unknown;
    try {
      raw = JSON.parse(String(formData.get("rules") ?? "[]"));
    } catch {
      return { ok: false, error: "Datos inválidos" };
    }
    const rules = weeklyRulesSchema.parse(raw);
    await replaceWeeklyRules(rules);
    await audit(admin.id, "availability.rules_updated", "AvailabilityRule", undefined, { count: rules.length });
    revalidatePath("/admin/availability");
    return { ok: true, message: "Disponibilidad semanal guardada." };
  } catch (err) {
    return actionError(err);
  }
}

export async function addExceptionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const kind = formData.get("kind") === "CUSTOM_HOURS" ? "CUSTOM_HOURS" : "BLOCKED";
    const allDay = kind === "BLOCKED" && formData.get("allDay") === "on";
    const startDate = String(formData.get("startDate") ?? "");
    const endDate = String(formData.get("endDate") || startDate);
    const input = exceptionSchema.parse({
      kind,
      startDate,
      endDate,
      startMinute: allDay ? null : hhmm(formData.get("startTime")),
      endMinute: allDay ? null : hhmm(formData.get("endTime")),
      reason: String(formData.get("reason") ?? "") || null,
    });
    if (kind === "BLOCKED" && !allDay && (input.startMinute == null || input.endMinute == null)) {
      return { ok: false, error: "Indica el rango horario o marca «Todo el día»." };
    }
    const created = await addException(input);
    await audit(admin.id, "availability.exception_added", "AvailabilityException", created.id, { kind });
    revalidatePath("/admin/availability");
    return { ok: true, message: "Excepción agregada." };
  } catch (err) {
    return actionError(err);
  }
}

export async function deleteExceptionAction(id: string): Promise<void> {
  const admin = await requireAdmin();
  await deleteException(id);
  await audit(admin.id, "availability.exception_deleted", "AvailabilityException", id);
  revalidatePath("/admin/availability");
}

// ───────────── Configuración ─────────────

export async function savePriceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const amount = Number(String(formData.get("amount") ?? "").replace(",", "."));
    const currency = String(formData.get("currency") ?? "");
    const slug = String(formData.get("slug") ?? "asesoria");
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Ingresa un monto válido." };
    await setMeetingTypePrice({ slug, amount, currency });
    await audit(admin.id, "pricing.updated", "MeetingType", slug, { amount, currency });
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Precio actualizado." };
  } catch (err) {
    return actionError(err);
  }
}

export async function saveMeetingTypeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const n = (k: string) => Number(formData.get(k));
    const input = meetingTypeSettingsSchema.parse({
      slug: String(formData.get("slug") ?? ""),
      isActive: formData.get("isActive") === "on",
      durationMinutes: n("durationMinutes"),
      slotIntervalMinutes: n("slotIntervalMinutes"),
      minNoticeMinutes: n("minNoticeMinutes"),
      maxDaysAhead: n("maxDaysAhead"),
      bufferBeforeMinutes: n("bufferBeforeMinutes"),
      bufferAfterMinutes: n("bufferAfterMinutes"),
      addVideoConference: formData.get("addVideoConference") === "on",
    });
    await updateMeetingTypeSettings(input);
    await audit(admin.id, "meeting_type.updated", "MeetingType", input.slug, { ...input });
    revalidatePath("/admin/settings");
    return { ok: true, message: "Tipo de reunión actualizado." };
  } catch (err) {
    return actionError(err);
  }
}

export async function saveAppSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const input = appSettingsSchema.parse({
      timezone: String(formData.get("timezone") ?? ""),
      holdMinutes: Number(formData.get("holdMinutes")),
      paymentHoldMinutes: Number(formData.get("paymentHoldMinutes")),
      ownerName: String(formData.get("ownerName") ?? "") || null,
    });
    await updateAppSettings(input);
    await audit(admin.id, "settings.updated", "AppSettings", "1");
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Configuración guardada." };
  } catch (err) {
    return actionError(err);
  }
}

// ───────────── Integraciones ─────────────

const providerSchema = z.enum(["GOOGLE", "MICROSOFT"]);

export async function disconnectIntegrationAction(provider: string): Promise<void> {
  const admin = await requireAdmin();
  const p = providerSchema.parse(provider);
  await disconnectIntegration(p);
  await audit(admin.id, "integration.disconnected", "CalendarIntegration", p);
  revalidatePath("/admin", "layout");
}

export async function saveCalendarsAction(provider: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const p = providerSchema.parse(provider);
    const ids = formData.getAll("calendarIds").map(String);
    const target = p === "GOOGLE" ? String(formData.get("targetCalendarId") ?? "") || undefined : undefined;
    await setBusyCalendars(p, ids, target);
    await audit(admin.id, "integration.calendars_updated", "CalendarIntegration", p, { count: ids.length });
    revalidatePath("/admin/integrations");
    return { ok: true, message: "Calendarios actualizados." };
  } catch (err) {
    return actionError(err);
  }
}
