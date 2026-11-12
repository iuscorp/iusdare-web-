import "server-only";
import { z } from "zod";
import { prisma } from "../db";
import { DomainError } from "../errors";
import { isValidTimezone } from "@/lib/format";
import { GOOGLE_REVOKE_URL } from "../calendars/oauth-config";
import { decrypt } from "../security/crypto";
import { logger } from "../logger";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const weeklyRulesSchema = z
  .array(
    z
      .object({
        weekday: z.number().int().min(1).max(7),
        startMinute: z.number().int().min(0).max(1439),
        endMinute: z.number().int().min(1).max(1440),
      })
      .refine((r) => r.endMinute > r.startMinute, "La hora de fin debe ser posterior a la de inicio"),
  )
  .max(70)
  .superRefine((rules, ctx) => {
    for (let d = 1; d <= 7; d++) {
      const day = rules.filter((r) => r.weekday === d).sort((a, b) => a.startMinute - b.startMinute);
      for (let i = 1; i < day.length; i++) {
        if (day[i]!.startMinute < day[i - 1]!.endMinute) {
          ctx.addIssue({ code: "custom", message: "Hay rangos solapados en un mismo día" });
          return;
        }
      }
    }
  });

export async function replaceWeeklyRules(rules: z.infer<typeof weeklyRulesSchema>) {
  const parsed = weeklyRulesSchema.parse(rules);
  await prisma.$transaction([prisma.availabilityRule.deleteMany(), prisma.availabilityRule.createMany({ data: parsed })]);
}

export const exceptionSchema = z
  .object({
    kind: z.enum(["BLOCKED", "CUSTOM_HOURS"]),
    startDate: z.string().regex(DATE),
    endDate: z.string().regex(DATE),
    startMinute: z.number().int().min(0).max(1439).nullable(),
    endMinute: z.number().int().min(1).max(1440).nullable(),
    reason: z.string().trim().max(200).nullable().optional(),
  })
  .superRefine((e, ctx) => {
    if (e.endDate < e.startDate) ctx.addIssue({ code: "custom", message: "La fecha final debe ser igual o posterior a la inicial" });
    const hasTimes = e.startMinute != null && e.endMinute != null;
    if ((e.startMinute == null) !== (e.endMinute == null)) ctx.addIssue({ code: "custom", message: "Indica inicio y fin" });
    if (hasTimes && e.endMinute! <= e.startMinute!) ctx.addIssue({ code: "custom", message: "Rango horario inválido" });
    if (e.kind === "CUSTOM_HOURS" && !hasTimes) ctx.addIssue({ code: "custom", message: "El horario personalizado requiere horas" });
  });

export async function addException(input: z.infer<typeof exceptionSchema>) {
  const e = exceptionSchema.parse(input);
  return prisma.availabilityException.create({ data: { ...e, reason: e.reason ?? null } });
}

export async function deleteException(id: string) {
  await prisma.availabilityException.delete({ where: { id: z.string().uuid().parse(id) } });
}

export const priceSchema = z.object({
  slug: z.string().min(1),
  /** Monto en unidades mayores (ej. 150.00) */
  amount: z.coerce.number().positive().max(100000),
  currency: z.string().regex(/^[A-Za-z]{3}$/).transform((c) => c.toLowerCase()),
});

export async function setMeetingTypePrice(input: z.input<typeof priceSchema>) {
  const p = priceSchema.parse(input);
  const mt = await prisma.meetingType.findUnique({ where: { slug: p.slug } });
  if (!mt) throw new DomainError("NOT_FOUND", "Tipo de reunión no encontrado", 404);
  if (!mt.requiresPayment) throw new DomainError("VALIDATION_ERROR", "Este tipo de reunión es gratuito", 422);
  const minor = Math.round(p.amount * 100);
  return prisma.meetingType.update({ where: { id: mt.id }, data: { priceAmount: minor, currency: p.currency } });
}

export const meetingTypeSettingsSchema = z.object({
  slug: z.string().min(1),
  isActive: z.boolean(),
  durationMinutes: z.number().int().min(5).max(480),
  slotIntervalMinutes: z.number().int().min(5).max(240),
  minNoticeMinutes: z.number().int().min(0).max(60 * 24 * 30),
  maxDaysAhead: z.number().int().min(1).max(365),
  bufferBeforeMinutes: z.number().int().min(0).max(240),
  bufferAfterMinutes: z.number().int().min(0).max(240),
  addVideoConference: z.boolean(),
});

export async function updateMeetingTypeSettings(input: z.infer<typeof meetingTypeSettingsSchema>) {
  const { slug, ...data } = meetingTypeSettingsSchema.parse(input);
  return prisma.meetingType.update({ where: { slug }, data });
}

export const appSettingsSchema = z.object({
  timezone: z.string().refine(isValidTimezone, "Zona horaria inválida"),
  holdMinutes: z.number().int().min(2).max(60),
  paymentHoldMinutes: z.number().int().min(30).max(24 * 60),
  ownerName: z.string().trim().max(120).nullable().optional(),
});

export async function updateAppSettings(input: z.infer<typeof appSettingsSchema>) {
  const s = appSettingsSchema.parse(input);
  return prisma.appSettings.upsert({ where: { id: 1 }, create: { id: 1, ...s }, update: s });
}

export async function disconnectIntegration(provider: "GOOGLE" | "MICROSOFT") {
  const integ = await prisma.calendarIntegration.findUnique({ where: { provider } });
  if (!integ) return;
  if (provider === "GOOGLE" && integ.refreshTokenEnc) {
    // Revocación best-effort en Google
    try {
      await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(decrypt(integ.refreshTokenEnc))}`, {
        method: "POST",
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      logger.warn("google_revoke_failed", { err });
    }
  }
  await prisma.calendarIntegration.update({
    where: { provider },
    data: {
      status: "DISCONNECTED",
      accessTokenEnc: null,
      refreshTokenEnc: null,
      tokenExpiresAt: null,
      lastError: null,
    },
  });
}

export async function setBusyCalendars(provider: "GOOGLE" | "MICROSOFT", ids: string[], targetCalendarId?: string) {
  const parsed = z.array(z.string().min(1).max(300)).max(20).parse(ids);
  await prisma.calendarIntegration.update({
    where: { provider },
    data: { busyCalendarIds: parsed, ...(provider === "GOOGLE" && targetCalendarId ? { targetCalendarId } : {}) },
  });
}

export async function completeOnboarding() {
  await prisma.appSettings.upsert({ where: { id: 1 }, create: { id: 1, onboardingCompleted: true }, update: { onboardingCompleted: true } });
}
