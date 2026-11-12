import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/server/errors";
import { getBookingForParticipant } from "@/server/bookings/service";
import { enforceRateLimit, RATE_LIMITS } from "@/server/security/rate-limit";
import { clientFingerprint } from "@/server/security/request";

export const dynamic = "force-dynamic";

/** GET /api/bookings/:id?token=… — estado de la reserva para el participante (polling tras el pago). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await enforceRateLimit(RATE_LIMITS.bookingStatus, clientFingerprint(req));
    const { id } = await ctx.params;
    const parsedId = z.string().uuid().parse(id);
    const token = z.string().min(10).max(100).parse(req.nextUrl.searchParams.get("token"));
    const booking = await getBookingForParticipant(parsedId, token);
    return NextResponse.json(booking, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toErrorResponse(err);
  }
}
