import "server-only";
import { prisma } from "../db";

export async function scheduleTimezone(): Promise<string> {
  const s = await prisma.appSettings.findUnique({ where: { id: 1 }, select: { timezone: true } });
  return s?.timezone ?? "America/Lima";
}
