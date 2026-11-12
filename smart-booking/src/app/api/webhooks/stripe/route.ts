import { NextResponse, type NextRequest } from "next/server";
import { DomainError } from "@/server/errors";
import { logger } from "@/server/logger";
import { processStripeEvent, verifyStripeEvent } from "@/server/payments/webhook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST /api/webhooks/stripe — firma verificada sobre el raw body; idempotente por event.id. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  let event;
  try {
    event = verifyStripeEvent(raw, req.headers.get("stripe-signature"));
  } catch (err) {
    const status = err instanceof DomainError ? err.status : 400;
    logger.warn("stripe_webhook_rejected", { reason: (err as Error).message });
    return NextResponse.json({ error: "invalid" }, { status });
  }
  try {
    const r = await processStripeEvent(event);
    return NextResponse.json({ received: true, duplicate: r.duplicate });
  } catch (err) {
    logger.error("stripe_webhook_failed", { eventId: event.id, type: event.type, err });
    // 500 → Stripe reintentará automáticamente
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
