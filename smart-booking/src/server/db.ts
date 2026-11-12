import "server-only";
import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

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
