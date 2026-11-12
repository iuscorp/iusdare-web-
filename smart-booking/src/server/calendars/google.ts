import "server-only";
import { prisma } from "../db";
import type { Interval } from "../availability/engine";
import { apiFetch, readJson } from "./http";
import { forceRefresh, getAccessToken } from "./tokens";
import {
  CalendarApiError,
  type BusySource,
  type CalendarEventInput,
  type CreatedEvent,
  type EventDestination,
} from "./types";

const API = "https://www.googleapis.com/calendar/v3";

/** Id de evento determinista (base32hex: [a-v0-9]) → reintentos idempotentes. */
export function googleEventIdFor(bookingId: string): string {
  return `sb${bookingId.replace(/-/g, "").toLowerCase()}`;
}

async function call(url: string, init: RequestInit = {}): Promise<Response> {
  let token = await getAccessToken("GOOGLE");
  let res = await apiFetch("GOOGLE", url, { ...init, accessToken: token });
  if (res.status === 401) {
    token = await forceRefresh("GOOGLE");
    res = await apiFetch("GOOGLE", url, { ...init, accessToken: token });
  }
  return res;
}

async function calendarsToQuery(): Promise<string[]> {
  const integ = await prisma.calendarIntegration.findUnique({ where: { provider: "GOOGLE" } });
  const ids = integ?.busyCalendarIds?.length ? integ.busyCalendarIds : ["primary"];
  const target = integ?.targetCalendarId ?? "primary";
  return Array.from(new Set([target, ...ids]));
}

export const googleBusySource: BusySource = {
  provider: "GOOGLE",
  async getBusy(range: Interval): Promise<Interval[]> {
    const items = (await calendarsToQuery()).map((id) => ({ id }));
    const res = await call(`${API}/freeBusy`, {
      method: "POST",
      body: JSON.stringify({
        timeMin: new Date(range.start).toISOString(),
        timeMax: new Date(range.end).toISOString(),
        items,
      }),
    });
    const json = await readJson<{
      calendars: Record<string, { busy?: { start: string; end: string }[]; errors?: { reason: string }[] }>;
    }>("GOOGLE", res, "freeBusy");
    const out: Interval[] = [];
    for (const [id, cal] of Object.entries(json.calendars ?? {})) {
      if (cal.errors?.length) {
        // Fallar cerrado: si un calendario no se pudo leer, no asumimos que está libre.
        throw new CalendarApiError("GOOGLE", 502, `freeBusy: calendario ${id === "primary" ? "principal" : "secundario"} con error (${cal.errors[0]?.reason})`);
      }
      for (const b of cal.busy ?? []) out.push({ start: Date.parse(b.start), end: Date.parse(b.end) });
    }
    return out;
  },
};

interface GoogleEvent {
  id: string;
  htmlLink?: string;
  hangoutLink?: string;
  status?: string;
  conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] };
}

function meetingUrlOf(ev: GoogleEvent): string | null {
  return ev.hangoutLink ?? ev.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ?? null;
}

async function targetCalendar(): Promise<string> {
  const integ = await prisma.calendarIntegration.findUnique({ where: { provider: "GOOGLE" } });
  return integ?.targetCalendarId ?? "primary";
}

export const googleDestination: EventDestination = {
  async createEvent(input: CalendarEventInput): Promise<CreatedEvent> {
    const calendarId = await targetCalendar();
    const body = {
      id: input.eventId,
      summary: input.summary,
      description: input.description,
      start: { dateTime: input.start.toISOString(), timeZone: input.timezone },
      end: { dateTime: input.end.toISOString(), timeZone: input.timezone },
      attendees: [{ email: input.attendee.email, displayName: input.attendee.name }],
      transparency: "opaque",
      guestsCanInviteOthers: false,
      guestsCanSeeOtherGuests: false,
      reminders: { useDefault: true },
      extendedProperties: {
        private: { smartBookingId: input.bookingId, meetingType: input.meetingTypeSlug },
      },
      ...(input.addVideoConference
        ? { conferenceData: { createRequest: { requestId: input.bookingId, conferenceSolutionKey: { type: "hangoutsMeet" } } } }
        : {}),
    };
    const url = `${API}/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`;
    const res = await call(url, { method: "POST", body: JSON.stringify(body) });
    if (res.status === 409) {
      // Ya existe (reintento): recuperamos el evento existente.
      const existing = await call(`${API}/calendars/${encodeURIComponent(calendarId)}/events/${input.eventId}`);
      const ev = await readJson<GoogleEvent>("GOOGLE", existing, "events.get");
      if (ev.status === "cancelled") {
        // Evento previamente borrado: lo reactivamos con los nuevos datos.
        const upd = await call(
          `${API}/calendars/${encodeURIComponent(calendarId)}/events/${input.eventId}?conferenceDataVersion=1&sendUpdates=all`,
          { method: "PUT", body: JSON.stringify({ ...body, status: "confirmed" }) },
        );
        const ev2 = await readJson<GoogleEvent>("GOOGLE", upd, "events.update");
        return { eventId: ev2.id, calendarId, meetingUrl: meetingUrlOf(ev2), htmlLink: ev2.htmlLink ?? null };
      }
      return { eventId: ev.id, calendarId, meetingUrl: meetingUrlOf(ev), htmlLink: ev.htmlLink ?? null };
    }
    const ev = await readJson<GoogleEvent>("GOOGLE", res, "events.insert");
    return { eventId: ev.id, calendarId, meetingUrl: meetingUrlOf(ev), htmlLink: ev.htmlLink ?? null };
  },

  async updateEventTime(calendarId, eventId, start, end, timezone) {
    const res = await call(
      `${API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
      {
        method: "PATCH",
        body: JSON.stringify({
          start: { dateTime: start.toISOString(), timeZone: timezone },
          end: { dateTime: end.toISOString(), timeZone: timezone },
        }),
      },
    );
    await readJson("GOOGLE", res, "events.patch");
  },

  async deleteEvent(calendarId, eventId) {
    const res = await call(
      `${API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
      { method: "DELETE" },
    );
    if (res.status === 404 || res.status === 410 || res.status === 204) return;
    await readJson("GOOGLE", res, "events.delete");
  },
};

/** Lista calendarios de la cuenta (para elegir cuáles consultar en el panel). */
export async function listGoogleCalendars(): Promise<{ id: string; summary: string; primary: boolean }[]> {
  const res = await call(`${API}/users/me/calendarList?minAccessRole=freeBusyReader&maxResults=250`);
  const json = await readJson<{ items?: { id: string; summary: string; primary?: boolean }[] }>(
    "GOOGLE",
    res,
    "calendarList.list",
  );
  return (json.items ?? []).map((c) => ({ id: c.id, summary: c.summary, primary: Boolean(c.primary) }));
}
