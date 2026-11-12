import "server-only";
import { env } from "../env";
import { DomainError } from "../errors";
import { hmac } from "./crypto";

/** IP del cliente (primer valor de X-Forwarded-For si hay proxy de confianza). */
export function clientIp(req: Request): string {
  if (env().TRUST_PROXY) {
    const fwd = req.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0]!.trim();
    const real = req.headers.get("x-real-ip");
    if (real) return real.trim();
  }
  return "unknown";
}

/** Identificador anónimo y estable para rate limit / auditoría (no se guarda la IP en claro). */
export function clientFingerprint(req: Request): string {
  return hmac(`ip:${clientIp(req)}`).slice(0, 32);
}

/** Protección CSRF para route handlers que mutan estado con cookies de sesión. */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const expected = new URL(env().APP_URL).origin;
  const host = req.headers.get("host");
  if (!origin) throw new DomainError("FORBIDDEN", "Origen no permitido", 403);
  const o = new URL(origin);
  if (o.origin !== expected && o.host !== host) throw new DomainError("FORBIDDEN", "Origen no permitido", 403);
}
