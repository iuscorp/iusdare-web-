import "server-only";
import { headers } from "next/headers";
import { env } from "../env";
import { hmac } from "../security/crypto";

/** Huella anónima del cliente para Server Actions (no se guarda la IP en claro). */
export async function actionFingerprint(): Promise<{ fingerprint: string; userAgent: string | undefined }> {
  const h = await headers();
  let ip = "unknown";
  if (env().TRUST_PROXY) {
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "unknown";
  }
  return { fingerprint: hmac(`ip:${ip}`).slice(0, 32), userAgent: h.get("user-agent") ?? undefined };
}
