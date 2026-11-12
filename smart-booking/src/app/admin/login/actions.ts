"use server";
import { redirect } from "next/navigation";
import { credentialsSchema, createSession, verifyCredentials } from "@/server/auth/session";
import { enforceRateLimit, RATE_LIMITS } from "@/server/security/rate-limit";
import { actionFingerprint } from "@/server/admin/request";
import { actionError, type ActionState } from "@/server/admin/action-result";
import { audit } from "@/server/audit";

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { fingerprint, userAgent } = await actionFingerprint();
    await enforceRateLimit(RATE_LIMITS.login, fingerprint);
    const parsed = credentialsSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
    if (!parsed.success) return { ok: false, error: "Credenciales inválidas" };
    const admin = await verifyCredentials(parsed.data.email, parsed.data.password);
    if (!admin) {
      await audit(null, "admin.login_failed");
      return { ok: false, error: "Credenciales inválidas" };
    }
    await createSession(admin.id, { ipHash: fingerprint, userAgent });
    await audit(admin.id, "admin.login", "AdminUser", admin.id);
  } catch (err) {
    return actionError(err);
  }
  redirect("/admin");
}
