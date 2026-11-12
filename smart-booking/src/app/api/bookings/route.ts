import { NextResponse, type NextRequest } from "next/server";
import { DomainError, toErrorResponse } from "@/server/errors";
import { createBooking } from "@/server/bookings/service";
import { enforceRateLimit, RATE_LIMITS } from "@/server/security/rate-limit";
import { clientFingerprint } from "@/server/security/request";

export const dynamic = "force-dynamic";

/** POST /api/bookings — crea una reserva (gratuita) o inicia el pago (asesoría). */
export async function POST(req: NextRequest) {
  try {
    await enforceRateLimit(RATE_LIMITS.bookingCreate, clientFingerprint(req));
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new DomainError("VALIDATION_ERROR", "Content-Type inválido", 415);
    }
    const text = await req.text();
    if (text.length > 20_000) throw new DomainError("VALIDATION_ERROR", "Solicitud demasiado grande", 413);
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new DomainError("VALIDATION_ERROR", "JSON inválido", 400);
    }
    const result = await createBooking(body);
    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toErrorResponse(err);
  }
}
