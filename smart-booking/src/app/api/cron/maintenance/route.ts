import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/server/env";
import { logger } from "@/server/logger";
import { safeEqual } from "@/server/security/crypto";
import { expireStaleHolds, retryPendingCalendarSync } from "@/server/bookings/service";
import { purgeRateLimitBuckets } from "@/server/security/rate-limit";
import { purgeExpiredSessions } from "@/server/auth/session";

export const dynamic = "force-dynamic";

/**
 * Tareas periódicas (cada 5 min recomendado): expira reservas temporales, reintenta
 * registros en Google de reservas pagadas y limpia datos efímeros.
 * Autenticación: `Authorization: Bearer <CRON_SECRET>`.
 */
async function handle(req: NextRequest) {
  const secret = env().CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const expired = await expireStaleHolds();
  const retried = await retryPendingCalendarSync();
  await purgeRateLimitBuckets();
  await purgeExpiredSessions();
  logger.info("cron_maintenance", { expired, retried });
  return NextResponse.json({ ok: true, expired, retried });
}

export const GET = handle;
export const POST = handle;
