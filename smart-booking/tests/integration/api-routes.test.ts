import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as webhookPOST } from "@/app/api/webhooks/stripe/route";
import { POST as bookingsPOST } from "@/app/api/bookings/route";
import { GET as availabilityGET } from "@/app/api/availability/route";
import { GET as bookingGET } from "@/app/api/bookings/[id]/route";
import { GET as cronGET } from "@/app/api/cron/maintenance/route";
import { resetEnvCache } from "@/server/env";
import { answersFor, iso, nextMondayAt, prisma, resetDb, seedBase } from "../helpers/db";
import { checkoutEvent, installCalendars, installStripe, realStripe, resetOverrides } from "../helpers/fakes";

const BASE = "http://localhost:3000";
let ipCounter = 0;
const ip = () => `10.0.0.${++ipCounter}`;

beforeEach(async () => {
  await resetDb();
  await seedBase();
  installCalendars();
  installStripe();
});
afterEach(() => resetOverrides());

function jsonReq(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`${BASE}${path}`, {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": ip(), ...headers },
  });
}

describe("POST /api/bookings", () => {
  it("201 con reserva confirmada; sin PII en la respuesta", async () => {
    const res = await bookingsPOST(
      jsonReq("/api/bookings", {
        meetingType: "cafecito-virtual",
        start: iso(nextMondayAt(10)),
        timezone: "America/Lima",
        answers: answersFor["cafecito-virtual"](),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("CONFIRMED");
    expect(JSON.stringify(body)).not.toContain("ana@example.com");

    const status = await bookingGET(
      new NextRequest(`${BASE}/api/bookings/${body.bookingId}?token=${body.accessToken}`, { headers: { "x-forwarded-for": ip() } }),
      { params: Promise.resolve({ id: body.bookingId }) },
    );
    expect(status.status).toBe(200);
    expect((await status.json()).reference).toBe(body.reference);
  });

  it("422 con detalles de validación, 415 sin JSON, 400 JSON roto, 409 horario ocupado", async () => {
    const bad = await bookingsPOST(jsonReq("/api/bookings", { meetingType: "cafecito-virtual", start: "mañana", timezone: "America/Lima", answers: {} }));
    expect(bad.status).toBe(422);
    expect((await bad.json()).error.code).toBe("VALIDATION_ERROR");

    const noJson = await bookingsPOST(jsonReq("/api/bookings", "x", { "content-type": "text/plain" }));
    expect(noJson.status).toBe(415);
    expect((await bookingsPOST(jsonReq("/api/bookings", "{oops"))).status).toBe(400);

    const ok = { meetingType: "cafecito-virtual", start: iso(nextMondayAt(11)), timezone: "America/Lima", answers: answersFor["cafecito-virtual"]() };
    expect((await bookingsPOST(jsonReq("/api/bookings", ok))).status).toBe(201);
    const dup = await bookingsPOST(jsonReq("/api/bookings", ok));
    expect(dup.status).toBe(409);
    expect((await dup.json()).error.code).toBe("SLOT_UNAVAILABLE");
  });

  it("rate limit: 429 tras 10 intentos desde la misma IP", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) statuses.push((await bookingsPOST(jsonReq("/api/bookings", "{", { "x-forwarded-for": "1.2.3.4" }))).status);
    expect(statuses.slice(0, 10).every((s) => s === 400)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it("token de estado incorrecto → 404", async () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    const res = await bookingGET(new NextRequest(`${BASE}/api/bookings/${id}?token=${"a".repeat(30)}`), { params: Promise.resolve({ id }) });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/availability", () => {
  const url = (q: Record<string, string>) => new NextRequest(`${BASE}/api/availability?${new URLSearchParams(q)}`, { headers: { "x-forwarded-for": ip() } });
  it("devuelve slots sin caché", async () => {
    const res = await availabilityGET(url({ meetingType: "asesoria", from: iso(nextMondayAt(0)), to: iso(nextMondayAt(0).plus({ days: 1 })) }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body.durationMinutes).toBe(45);
    expect(body.slots[0].start).toBe(iso(nextMondayAt(9)));
  });
  it("rango > 45 días o tipo inexistente → error", async () => {
    expect((await availabilityGET(url({ meetingType: "asesoria", from: iso(nextMondayAt(0)), to: iso(nextMondayAt(0).plus({ days: 60 })) }))).status).toBe(422);
    expect((await availabilityGET(url({ meetingType: "nope", from: iso(nextMondayAt(0)), to: iso(nextMondayAt(1)) }))).status).toBe(404);
    expect((await availabilityGET(url({ meetingType: "../etc", from: "x", to: "y" }))).status).toBe(422);
  });
});

describe("POST /api/webhooks/stripe", () => {
  it("rechaza firma inválida (400) y procesa firma válida sobre el raw body", async () => {
    const created = await bookingsPOST(
      jsonReq("/api/bookings", { meetingType: "asesoria", start: iso(nextMondayAt(10)), timezone: "America/Lima", answers: answersFor.asesoria() }),
    );
    const { bookingId } = await created.json();
    const pay = await prisma.payment.findFirstOrThrow({ where: { bookingId } });
    const payload = JSON.stringify(checkoutEvent("checkout.session.completed", { id: pay.stripeCheckoutSessionId!, bookingId, amount: pay.amount }));

    const forged = await webhookPOST(new NextRequest(`${BASE}/api/webhooks/stripe`, { method: "POST", body: payload, headers: { "stripe-signature": "t=1,v1=bad" } }));
    expect(forged.status).toBe(400);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } })).status).toBe("PAYMENT_PENDING");

    const sig = realStripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! });
    const ok = await webhookPOST(new NextRequest(`${BASE}/api/webhooks/stripe`, { method: "POST", body: payload, headers: { "stripe-signature": sig } }));
    expect(ok.status).toBe(200);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } })).status).toBe("CONFIRMED");
  });
});

describe("cron de mantenimiento", () => {
  it("401 sin secreto; 200 con Bearer CRON_SECRET", async () => {
    process.env.CRON_SECRET = "cron-secret-for-tests-123";
    resetEnvCache();
    expect((await cronGET(new NextRequest(`${BASE}/api/cron/maintenance`))).status).toBe(401);
    expect((await cronGET(new NextRequest(`${BASE}/api/cron/maintenance`, { headers: { authorization: "Bearer wrong-secret-xxxxx" } }))).status).toBe(401);
    const res = await cronGET(new NextRequest(`${BASE}/api/cron/maintenance`, { headers: { authorization: "Bearer cron-secret-for-tests-123" } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, expired: 0, retried: 0 });
  });
});
