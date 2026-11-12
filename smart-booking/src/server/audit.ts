import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { logger } from "./logger";

export async function audit(
  adminId: string | null,
  action: string,
  entity?: string,
  entityId?: string,
  metadata?: Prisma.InputJsonValue,
) {
  logger.info("audit", { action, entity, entityId });
  await prisma.auditLog
    .create({ data: { adminId, action, entity, entityId, metadata } })
    .catch((err) => logger.warn("audit_write_failed", { err }));
}
