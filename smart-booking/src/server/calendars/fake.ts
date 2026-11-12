import "server-only";
import { DateTime } from "luxon";
import type { Interval } from "../availability/engine";
import type { BusySource, CalendarEventInput, CreatedEvent, EventDestination } from "./types";

/**
 * Calendarios SIMULADOS para desarrollo local sin credenciales (DEV_FAKE_CALENDARS=true).
 * Nunca se usan en producción (ver env.ts).
 *  - "Google": ocupado L–V 13:00–14:00 (almuerzo) + eventos creados por la app.
 *  - "Microsoft": ocupado martes y jueves 15:00–16:30.
 */
const ZONE = "America/Lima";
const createdEvents = new Map<string, { start: number; end: number; calendarId: string }>();

function recurring(range: Interval, weekdays: number[], startMin: number, endMin: number): Interval[] {
  const out: Interval[] = [];
  let d = DateTime.fromMillis(range.start, { zone: ZONE }).startOf("day");
  const last = DateTime.fromMillis(range.end, { zone: ZONE });
  while (d <= last) {
    if (weekdays.includes(d.weekday)) {
      out.push({
        start: d.plus({ minutes: startMin }).toMillis(),
        end: d.plus({ minutes: endMin }).toMillis(),
      });
    }
    d = d.plus({ days: 1 });
  }
  return out;
}

export const fakeGoogleBusy: BusySource = {
  provider: "GOOGLE",
  async getBusy(range) {
    const created = [...createdEvents.values()].map((e) => ({ start: e.start, end: e.end }));
    return [...recurring(range, [1, 2, 3, 4, 5], 13 * 60, 14 * 60), ...created];
  },
};

export const fakeMicrosoftBusy: BusySource = {
  provider: "MICROSOFT",
  async getBusy(range) {
    return recurring(range, [2, 4], 15 * 60, 16 * 60 + 30);
  },
};

export const fakeDestination: EventDestination = {
  async createEvent(input: CalendarEventInput): Promise<CreatedEvent> {
    createdEvents.set(input.eventId, { start: input.start.getTime(), end: input.end.getTime(), calendarId: "fake" });
    return {
      eventId: input.eventId,
      calendarId: "fake",
      meetingUrl: input.addVideoConference ? `https://meet.google.com/fake-${input.eventId.slice(2, 12)}` : null,
      htmlLink: null,
    };
  },
  async updateEventTime(_c, eventId, start, end) {
    const ev = createdEvents.get(eventId);
    if (ev) createdEvents.set(eventId, { ...ev, start: start.getTime(), end: end.getTime() });
  },
  async deleteEvent(_c, eventId) {
    createdEvents.delete(eventId);
  },
};
