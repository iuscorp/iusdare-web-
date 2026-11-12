import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { DomainError, toErrorResponse } from "@/server/errors";
import { getAvailableSlots } from "@/server/availability/service";
import { enforceRateLimit, RATE_LIMITS } from "@/server/security/rate-limit";
import { clientFingerprint } from "@/server/security/request";

export const dynamic = "force-dynamic";

const query = z.object({
  meetingType: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
});

const MAX_RANGE_MS = 45 * 24 * 60 * 60 * 1000;

/**
 * GET /api/availability?meetingType=asesoria&from=ISO&to=ISO
 * Calcula la disponibilidad EN VIVO (sin caché) en cada consulta.
 */
export async function GET(req: NextRequest) {
  try {
    await enforceRateLimit(RATE_LIMITS.availability, clientFingerprint(req));
    const q = query.parse(Object.fromEntries(req.nextUrl.searchParams));
    const from = Date.parse(q.from);
    const to = Date.parse(q.to);
    if (to <= from || to - from > MAX_RANGE_MS) {
      throw new DomainError("VALIDATION_ERROR", "Rango de fechas inválido (máx. 45 días).", 422);
    }
    const mt = await prisma.meetingType.findUnique({ where: { slug: q.meetingType } });
    if (!mt || !mt.isActive) throw new DomainError("NOT_FOUND", "Tipo de reunión no encontrado.", 404);

    const slots = await getAvailableSlots(mt, from, to);
    return NextResponse.json(
      {
        meetingType: mt.slug,
        durationMinutes: mt.durationMinutes,
        generatedAt: new Date().toISOString(),
        slots: slots.map((s) => ({ start: new Date(s.start).toISOString(), end: new Date(s.end).toISOString() })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return toErrorResponse(err, { "Cache-Control": "no-store" });
  }
}
