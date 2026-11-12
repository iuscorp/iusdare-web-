"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/db";
import { DomainError } from "@/server/errors";
import {
  adminExists,
  checkSetupToken,
  createSession,
  hashPassword,
  passwordSchema,
  requireAdmin,
} from "@/server/auth/session";
import { enforceRateLimit, RATE_LIMITS } from "@/server/security/rate-limit";
import { actionFingerprint } from "@/server/admin/request";
import { actionError, type ActionState } from "@/server/admin/action-result";
import { appSettingsSchema, completeOnboarding, setMeetingTypePrice, updateAppSettings } from "@/server/admin/mutations";
import { audit } from "@/server/audit";

const firstAdminSchema = z
  .object({
    token: z.string().min(1, "Ingresa el token de configuración").max(200),
    name: z.string().trim().min(2, "Ingresa tu nombre").max(120),
    email: z.string().trim().toLowerCase().email("Correo inválido").max(254),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Las contraseñas no coinciden", path: ["confirm"] });

export async function createFirstAdminAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { fingerprint, userAgent } = await actionFingerprint();
    await enforceRateLimit(RATE_LIMITS.setup, fingerprint);
    if (await adminExists()) return { ok: false, error: "El panel ya fue configurado. Inicia sesión." };
    const data = firstAdminSchema.parse(Object.fromEntries(formData));
    if (!checkSetupToken(data.token)) {
      await audit(null, "admin.setup_invalid_token");
      return { ok: false, error: "Token de configuración inválido (variable SETUP_TOKEN)." };
    }
    const passwordHash = await hashPassword(data.password);
    const admin = await prisma.$transaction(async (tx) => {
      // Re-verificación dentro de la transacción: solo puede existir un primer administrador.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(4242001)`;
      if ((await tx.adminUser.count()) > 0) throw new DomainError("CONFLICT", "El panel ya fue configurado.", 409);
      return tx.adminUser.create({ data: { email: data.email, name: data.name, passwordHash } });
    });
    await prisma.appSettings.upsert({ where: { id: 1 }, create: { id: 1, ownerName: data.name }, update: {} });
    await createSession(admin.id, { ipHash: fingerprint, userAgent });
    await audit(admin.id, "admin.created", "AdminUser", admin.id);
  } catch (err) {
    return actionError(err);
  }
  redirect("/admin/setup");
}

const onboardingSchema = z.object({
  ownerName: z.string().trim().max(120).optional(),
  timezone: z.string().min(1),
  amount: z.string().trim().optional(),
  currency: z.enum(["PEN", "USD"]).optional(),
});

export async function saveOnboardingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const data = onboardingSchema.parse(Object.fromEntries(formData));
    const current = await prisma.appSettings.findUnique({ where: { id: 1 } });
    await updateAppSettings(
      appSettingsSchema.parse({
        timezone: data.timezone,
        holdMinutes: current?.holdMinutes ?? 10,
        paymentHoldMinutes: current?.paymentHoldMinutes ?? 30,
        ownerName: data.ownerName || null,
      }),
    );
    if (data.amount) {
      if (!data.currency) return { ok: false, error: "Selecciona la moneda del precio." };
      await setMeetingTypePrice({ slug: "asesoria", amount: Number(data.amount.replace(",", ".")), currency: data.currency });
      await audit(admin.id, "pricing.updated", "MeetingType", "asesoria", { amount: data.amount, currency: data.currency });
    }
    await audit(admin.id, "settings.onboarding_saved");
    revalidatePath("/admin/setup");
    return { ok: true, message: "Configuración guardada." };
  } catch (err) {
    return actionError(err);
  }
}

export async function finishOnboardingAction(): Promise<void> {
  const admin = await requireAdmin();
  await completeOnboarding();
  await audit(admin.id, "settings.onboarding_completed");
  revalidatePath("/admin", "layout");
  redirect("/admin");
}
