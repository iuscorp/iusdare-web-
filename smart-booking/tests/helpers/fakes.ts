import Stripe from "stripe";
import type { Interval } from "@/server/availability/engine";
import type { BusySource, CalendarEventInput, EventDestination } from "@/server/calendars/types";
import { __setCalendarOverrides } from "@/server/calendars/registry";
import { __setStripeOverride, type StripeLike } from "@/server/payments/stripe";

export class FakeBusy implements BusySource {
  busy: Interval[] = [];
  calls = 0;
  fail = false;
  /** Ocupados que aparecen a partir de la llamada N (simula eventos creados en paralelo) */
  lateBusy: { fromCall: number; interval: Interval }[] = [];
  constructor(public provider: "GOOGLE" | "MICROSOFT") {}
  async getBusy(): Promise<Interval[]> {
    this.calls++;
    if (this.fail) throw new Error("provider down");
    return [...this.busy, ...this.lateBusy.filter((l) => this.calls >= l.fromCall).map((l) => l.interval)];
  }
}

export class FakeDestination implements EventDestination {
  events = new Map<string, CalendarEventInput & { calendarId: string }>();
  created: CalendarEventInput[] = [];
  deleted: string[] = [];
  updated: { eventId: string; start: Date; end: Date }[] = [];
  failCreate = false;
  failUpdate = false;
  async createEvent(input: CalendarEventInput) {
    if (this.failCreate) throw new Error("google 500");
    this.created.push(input);
    this.events.set(input.eventId, { ...input, calendarId: "primary" });
    return { eventId: input.eventId, calendarId: "primary", meetingUrl: "https://meet.google.com/abc", htmlLink: null };
  }
  async updateEventTime(_c: string, eventId: string, start: Date, end: Date) {
    if (this.failUpdate) throw new Error("google 500");
    this.updated.push({ eventId, start, end });
  }
  async deleteEvent(_c: string, eventId: string) {
    this.deleted.push(eventId);
    this.events.delete(eventId);
  }
}

export function installCalendars() {
  const google = new FakeBusy("GOOGLE");
  const microsoft = new FakeBusy("MICROSOFT");
  const destination = new FakeDestination();
  __setCalendarOverrides({ busySources: [google, microsoft], destination });
  return { google, microsoft, destination };
}

export const realStripe = new Stripe("sk_test_x");

export function installStripe() {
  let n = 0;
  const calls = {
    sessions: [] as Stripe.Checkout.SessionCreateParams[],
    refunds: [] as Stripe.RefundCreateParams[],
    expired: [] as string[],
  };
  const fake: StripeLike = {
    checkout: {
      sessions: {
        async create(params) {
          calls.sessions.push(params);
          n++;
          return { id: `cs_test_${n}_${Date.now()}`, url: `https://checkout.stripe.test/s/${n}` };
        },
        async expire(id) {
          calls.expired.push(id);
          return {};
        },
      },
    },
    refunds: {
      async create(params) {
        calls.refunds.push(params);
        return { id: `re_${calls.refunds.length}`, status: "succeeded" };
      },
    },
    webhooks: realStripe.webhooks,
  };
  __setStripeOverride(fake);
  return calls;
}

export function resetOverrides() {
  __setCalendarOverrides(null);
  __setStripeOverride(null);
}

export function checkoutEvent(
  type: string,
  session: { id: string; bookingId: string; amount: number; currency?: string; paid?: boolean; pi?: string },
  eventId = `evt_${Math.random().toString(36).slice(2)}`,
): Stripe.Event {
  return {
    id: eventId,
    object: "event",
    type,
    data: {
      object: {
        id: session.id,
        object: "checkout.session",
        metadata: { bookingId: session.bookingId },
        client_reference_id: session.bookingId,
        payment_status: session.paid === false ? "unpaid" : "paid",
        amount_total: session.amount,
        currency: session.currency ?? "pen",
        payment_intent: session.pi ?? "pi_test_123",
      },
    },
  } as unknown as Stripe.Event;
}
