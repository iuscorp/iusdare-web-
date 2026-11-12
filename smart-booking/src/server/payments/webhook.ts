import "server-only";
import type Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { env } from "../env";
import { DomainError } from "../errors";
import { logger } from "../logger";
import { handleCheckoutExpired, handlePaymentFailed, handlePaymentSucceeded } from "../bookings/service";
import { getStripe } from "./stripe";

/** Verifica la firma (raw body) y devuelve el evento. */
export function verifyStripeEvent(rawBody: string, signature: string | null): Stripe.Event {
  const secret = env().STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new DomainError("PAYMENT_NOT_CONFIGURED", "Webhook no configurado", 503);
  if (!signature) throw new DomainError("UNAUTHORIZED", "Firma ausente", 400);
  try {
    return getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    throw new DomainError("UNAUTHORIZED", "Firma inválida", 400);
  }
}

function bookingIdOf(session: Stripe.Checkout.Session): string | null {
  return session.metadata?.bookingId ?? session.client_reference_id ?? null;
}

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  if (!pi) return null;
  return typeof pi === "string" ? pi : pi.id;
}

/**
 * Procesa un evento de Stripe de forma idempotente:
 * - Se registra el `event.id` en `stripe_events`; si ya existía, se ignora.
 * - Si el procesamiento falla, se elimina el registro para que el reintento de Stripe vuelva a procesarlo.
 */
export async function processStripeEvent(event: Stripe.Event): Promise<{ duplicate: boolean }> {
  try {
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      logger.info("stripe_event_duplicate", { eventId: event.id });
      return { duplicate: true };
    }
    throw err;
  }

  try {
    await dispatch(event);
    return { duplicate: false };
  } catch (err) {
    await prisma.stripeEvent.delete({ where: { id: event.id } }).catch(() => undefined);
    throw err;
  }
}

async function dispatch(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = bookingIdOf(session);
      if (!bookingId) return;
      if (session.payment_status !== "paid") {
        logger.info("checkout_completed_unpaid", { bookingId, paymentStatus: session.payment_status });
        return; // pago asíncrono: esperamos async_payment_succeeded
      }
      const r = await handlePaymentSucceeded({
        bookingId,
        checkoutSessionId: session.id,
        paymentIntentId: paymentIntentId(session),
        amountTotal: session.amount_total,
        currency: session.currency,
      });
      logger.info("stripe_payment_processed", { bookingId, status: r.status, reason: r.reason });
      return;
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = bookingIdOf(session);
      if (bookingId) await handleCheckoutExpired(bookingId, session.id);
      return;
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = bookingIdOf(session);
      if (bookingId) await handlePaymentFailed(bookingId, session.id, "Pago asíncrono rechazado");
      return;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (pi && charge.refunded) {
        await prisma.payment.updateMany({
          where: { stripePaymentIntentId: pi, status: "PAID" },
          data: { status: "REFUNDED", refundedAt: new Date() },
        });
      }
      return;
    }
    default:
      logger.debug("stripe_event_ignored", { type: event.type });
  }
}
