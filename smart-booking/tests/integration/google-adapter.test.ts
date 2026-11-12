import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encrypt, decrypt } from "@/server/security/crypto";
import { googleBusySource, googleDestination, googleEventIdFor } from "@/server/calendars/google";
import { CalendarApiError } from "@/server/calendars/types";
import { prisma, resetDb } from "../helpers/db";

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let calls: { url: string; method: string; auth: string | null; body?: string }[] = [];
function mockFetch(handler: Handler) {
  calls = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    const h = new Headers(init.headers);
    calls.push({ url: String(url), method: init.method ?? "GET", auth: h.get("Authorization"), body: init.body as string });
    return handler(String(url), init);
  });
}

async function seedIntegration(expired = false) {
  await prisma.calendarIntegration.create({
    data: {
      provider: "GOOGLE",
      status: "CONNECTED",
      accessTokenEnc: encrypt("old-access"),
      refreshTokenEnc: encrypt("refresh-1"),
      tokenExpiresAt: new Date(Date.now() + (expired ? -1000 : 3_600_000)),
      targetCalendarId: "primary",
    },
  });
}

const range = { start: Date.parse("2026-11-16T05:00:00Z"), end: Date.parse("2026-11-17T05:00:00Z") };

beforeEach(async () => {
  await resetDb();
});
afterEach(() => vi.unstubAllGlobals());

describe("Google Calendar adapter", () => {
  it("freeBusy: parsea bloques ocupados con el token descifrado", async () => {
    await seedIntegration();
    mockFetch(() =>
      json(200, {
        calendars: { primary: { busy: [{ start: "2026-11-16T15:00:00Z", end: "2026-11-16T16:00:00Z" }] } },
      }),
    );
    const busy = await googleBusySource.getBusy(range);
    expect(busy).toEqual([{ start: Date.parse("2026-11-16T15:00:00Z"), end: Date.parse("2026-11-16T16:00:00Z") }]);
    expect(calls[0]!.url).toContain("/freeBusy");
    expect(calls[0]!.auth).toBe("Bearer old-access");
  });

  it("freeBusy con error de calendario → lanza (falla cerrado)", async () => {
    await seedIntegration();
    mockFetch(() => json(200, { calendars: { primary: { errors: [{ reason: "notFound" }] } } }));
    await expect(googleBusySource.getBusy(range)).rejects.toBeInstanceOf(CalendarApiError);
  });

  it("HTTP 500 → lanza", async () => {
    await seedIntegration();
    mockFetch(() => json(500, { error: { status: "INTERNAL" } }));
    await expect(googleBusySource.getBusy(range)).rejects.toBeInstanceOf(CalendarApiError);
  });

  it("401 → renueva el token y reintenta; el nuevo token se guarda cifrado", async () => {
    await seedIntegration();
    let first = true;
    mockFetch((url) => {
      if (url.includes("oauth2.googleapis.com/token")) return json(200, { access_token: "new-access", expires_in: 3600 });
      if (first) {
        first = false;
        return json(401, { error: { status: "UNAUTHENTICATED" } });
      }
      return json(200, { calendars: { primary: { busy: [] } } });
    });
    await googleBusySource.getBusy(range);
    expect(calls.map((c) => c.auth ?? "token-endpoint")).toEqual(["Bearer old-access", "token-endpoint", "Bearer new-access"]);
    const row = await prisma.calendarIntegration.findUniqueOrThrow({ where: { provider: "GOOGLE" } });
    expect(row.accessTokenEnc).not.toContain("new-access");
    expect(decrypt(row.accessTokenEnc!)).toBe("new-access");
    expect(decrypt(row.refreshTokenEnc!)).toBe("refresh-1"); // Google no rota el refresh token
  });

  it("token expirado → renovación proactiva; invalid_grant → integración en ERROR", async () => {
    await seedIntegration(true);
    mockFetch((url) =>
      url.includes("/token") ? json(400, { error: "invalid_grant" }) : json(200, { calendars: {} }),
    );
    await expect(googleBusySource.getBusy(range)).rejects.toMatchObject({ reauthRequired: true });
    const row = await prisma.calendarIntegration.findUniqueOrThrow({ where: { provider: "GOOGLE" } });
    expect(row.status).toBe("ERROR");
  });

  const eventInput = {
    eventId: googleEventIdFor("123e4567-e89b-12d3-a456-426614174000"),
    bookingId: "123e4567-e89b-12d3-a456-426614174000",
    summary: "Cafecito virtual | Ana",
    description: "desc",
    start: new Date("2026-11-16T15:00:00Z"),
    end: new Date("2026-11-16T15:30:00Z"),
    timezone: "America/Lima",
    attendee: { email: "ana@example.com", name: "Ana" },
    addVideoConference: true,
    meetingTypeSlug: "cafecito-virtual",
  };

  it("id de evento determinista válido para Google (base32hex)", () => {
    expect(eventInput.eventId).toMatch(/^[a-v0-9]{5,1024}$/);
  });

  it("createEvent: envía id determinista, Meet y asistente", async () => {
    await seedIntegration();
    mockFetch(() => json(200, { id: eventInput.eventId, hangoutLink: "https://meet.google.com/x", htmlLink: "h" }));
    const r = await googleDestination.createEvent(eventInput);
    expect(r).toMatchObject({ eventId: eventInput.eventId, calendarId: "primary", meetingUrl: "https://meet.google.com/x" });
    const body = JSON.parse(calls[0]!.body!);
    expect(body.id).toBe(eventInput.eventId);
    expect(body.attendees[0].email).toBe("ana@example.com");
    expect(body.conferenceData.createRequest.conferenceSolutionKey.type).toBe("hangoutsMeet");
    expect(calls[0]!.url).toContain("conferenceDataVersion=1");
  });

  it("createEvent 409 (reintento) → recupera el evento existente (idempotente)", async () => {
    await seedIntegration();
    mockFetch((_url, init) =>
      init.method === "POST" ? json(409, { error: { status: "ALREADY_EXISTS" } }) : json(200, { id: eventInput.eventId, status: "confirmed" }),
    );
    const r = await googleDestination.createEvent(eventInput);
    expect(r.eventId).toBe(eventInput.eventId);
    expect(calls.map((c) => c.method)).toEqual(["POST", "GET"]);
  });

  it("deleteEvent tolera 404/410", async () => {
    await seedIntegration();
    mockFetch(() => new Response(null, { status: 410 }));
    await expect(googleDestination.deleteEvent("primary", "abc")).resolves.toBeUndefined();
  });
});
