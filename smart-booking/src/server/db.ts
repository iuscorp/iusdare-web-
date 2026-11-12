import "server-only";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Cliente Prisma con driver adapter `pg` (sin motor nativo): el mismo código corre en Node.js
 * y en Cloudflare Workers (nodejs_compat).
 */
function createClient(connectionString: string | undefined) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    // En tests las violaciones de constraint son esperadas (concurrencia); no ensuciar la salida.
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : process.env.NODE_ENV === "test" ? [] : ["error"],
  });
}

const isWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

/**
 * En Cloudflare Workers una conexión no puede compartirse entre peticiones: se crea un cliente
 * por petición (Hyperdrive mantiene el pool real). En Node se usa un singleton.
 */
const perRequest = new WeakMap<object, PrismaClient>();
function currentClient(): PrismaClient {
  if (!isWorkers) {
    globalForPrisma.prisma ??= createClient(process.env.DATABASE_URL);
    return globalForPrisma.prisma;
  }
  const { env, ctx } = getCloudflareContext();
  let client = perRequest.get(ctx);
  if (!client) {
    const hyperdrive = (env as { HYPERDRIVE?: { connectionString: string } }).HYPERDRIVE;
    client = createClient(hyperdrive?.connectionString ?? process.env.DATABASE_URL);
    perRequest.set(ctx, client);
  }
  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = currentClient();
    const value = Reflect.get(client, prop, client) as unknown;
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(client) : value;
  },
});

/** SQLSTATE 23P01 — violación del constraint EXCLUDE (solapamiento de reservas) */
export function isOverlapViolation(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const meta = JSON.stringify(err.meta ?? {});
    return meta.includes("23P01") || meta.includes("bookings_no_overlap") || err.message.includes("bookings_no_overlap");
  }
  if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    return err.message.includes("23P01") || err.message.includes("bookings_no_overlap");
  }
  return err instanceof Error && (err.message.includes("23P01") || err.message.includes("bookings_no_overlap"));
}
