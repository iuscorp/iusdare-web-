import "server-only";
import { prisma } from "../db";
import { logger } from "../logger";
import { CalendarApiError } from "./types";

/** Ejecuta una operación externa registrando un SyncLog (sin datos personales). */
export async function withSyncLog<T>(
  provider: string,
  operation: string,
  fn: () => Promise<T>,
  bookingId?: string,
): Promise<T> {
  const started = Date.now();
  try {
    const result = await fn();
    await prisma.syncLog
      .create({ data: { provider, operation, status: "SUCCESS", bookingId, durationMs: Date.now() - started } })
      .catch(() => undefined);
    if (provider === "GOOGLE" || provider === "MICROSOFT") {
      await prisma.calendarIntegration
        .updateMany({ where: { provider }, data: { lastSyncAt: new Date() } })
        .catch(() => undefined);
    }
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 500) : "error";
    logger.warn("external_call_failed", { provider, operation, message });
    await prisma.syncLog
      .create({ data: { provider, operation, status: "FAILURE", message, bookingId, durationMs: Date.now() - started } })
      .catch(() => undefined);
    if (err instanceof CalendarApiError && (provider === "GOOGLE" || provider === "MICROSOFT")) {
      await prisma.calendarIntegration
        .updateMany({ where: { provider, status: { not: "DISCONNECTED" } }, data: { lastError: message } })
        .catch(() => undefined);
    }
    throw err;
  }
}
