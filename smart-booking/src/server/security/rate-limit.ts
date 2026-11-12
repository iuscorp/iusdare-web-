import "server-only";
import { prisma } from "../db";
import { DomainError } from "../errors";
import { logger } from "../logger";

export interface RateLimitRule {
  /** Identificador del bucket, ej. "booking:create" */
  name: string;
  limit: number;
  windowSeconds: number;
}

export const RATE_LIMITS = {
  availability: { name: "availability", limit: 90, windowSeconds: 60 },
  bookingCreate: { name: "booking:create", limit: 10, windowSeconds: 600 },
  bookingStatus: { name: "booking:status", limit: 60, windowSeconds: 60 },
  login: { name: "admin:login", limit: 5, windowSeconds: 900 },
  oauth: { name: "oauth", limit: 20, windowSeconds: 600 },
  setup: { name: "admin:setup", limit: 5, windowSeconds: 3600 },
} satisfies Record<string, RateLimitRule>;

/**
 * Rate limit de ventana fija respaldado en PostgreSQL (un único UPSERT atómico),
 * por lo que funciona con múltiples instancias sin Redis.
 * Devuelve los segundos a esperar si se excede; lanza DomainError RATE_LIMITED.
 */
export async function enforceRateLimit(rule: RateLimitRule, subject: string): Promise<void> {
  const key = `${rule.name}:${subject}`;
  try {
    const rows = await prisma.$queryRaw<{ count: number; windowStart: Date }[]>`
      INSERT INTO "rate_limit_buckets" ("key", "count", "windowStart")
      VALUES (${key}, 1, now())
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "rate_limit_buckets"."windowStart" < now() - make_interval(secs => ${rule.windowSeconds})
                       THEN 1 ELSE "rate_limit_buckets"."count" + 1 END,
        "windowStart" = CASE WHEN "rate_limit_buckets"."windowStart" < now() - make_interval(secs => ${rule.windowSeconds})
                       THEN now() ELSE "rate_limit_buckets"."windowStart" END
      RETURNING "count", "windowStart"`;
    const row = rows[0];
    if (row && row.count > rule.limit) {
      const retryAfter = Math.max(1, Math.ceil(rule.windowSeconds - (Date.now() - row.windowStart.getTime()) / 1000));
      throw new DomainError("RATE_LIMITED", "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.", 429, {
        retryAfter,
      });
    }
  } catch (err) {
    if (err instanceof DomainError) throw err;
    // Si la BD falla aquí, la petición fallará igualmente después; no bloqueamos por el limitador.
    logger.warn("rate_limit_unavailable", { err });
  }
}

/** Limpieza periódica (cron). */
export async function purgeRateLimitBuckets(olderThanSeconds = 86400) {
  await prisma.$executeRaw`DELETE FROM "rate_limit_buckets" WHERE "windowStart" < now() - make_interval(secs => ${olderThanSeconds})`;
}
