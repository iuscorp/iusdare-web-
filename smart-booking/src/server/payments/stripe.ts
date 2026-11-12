import "server-only";
import Stripe from "stripe";
import { env, stripeConfigured } from "../env";
import { DomainError } from "../errors";

let client: Stripe | null = null;
let override: StripeLike | null = null;

/** Subconjunto de Stripe usado por la app (permite simularlo en tests). */
export interface StripeLike {
  checkout: {
    sessions: {
      create(params: Stripe.Checkout.SessionCreateParams, opts?: Stripe.RequestOptions): Promise<Pick<Stripe.Checkout.Session, "id" | "url">>;
      expire(id: string): Promise<unknown>;
    };
  };
  refunds: { create(params: Stripe.RefundCreateParams, opts?: Stripe.RequestOptions): Promise<Pick<Stripe.Refund, "id" | "status">> };
  webhooks: { constructEvent(payload: string | Buffer, header: string, secret: string): Stripe.Event };
}

export function __setStripeOverride(s: StripeLike | null) {
  override = s;
}

export function getStripe(): StripeLike {
  if (override) return override;
  if (!stripeConfigured()) {
    throw new DomainError("PAYMENT_NOT_CONFIGURED", "Los pagos aún no están configurados.", 503);
  }
  if (!client) {
    client = new Stripe(env().STRIPE_SECRET_KEY!, {
      maxNetworkRetries: 2,
      timeout: 15_000,
      appInfo: { name: "smart-booking", version: "1.0.0" },
    });
  }
  return client;
}

export function paymentsAvailable(): boolean {
  return Boolean(override) || stripeConfigured();
}

/** Monedas sin decimales en Stripe (la cantidad ya está en unidad mínima). */
const ZERO_DECIMAL = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"]);
export function isZeroDecimal(currency: string) {
  return ZERO_DECIMAL.has(currency.toLowerCase());
}
