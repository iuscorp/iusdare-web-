import type { Interval } from "../availability/engine";

export type ProviderId = "GOOGLE" | "MICROSOFT";

/** Fuente de bloques ocupados (Google, Microsoft, …). */
export interface BusySource {
  provider: ProviderId;
  getBusy(range: Interval): Promise<Interval[]>;
}

export interface CalendarEventInput {
  /** id determinista (idempotencia) */
  eventId: string;
  bookingId: string;
  summary: string;
  description: string;
  start: Date;
  end: Date;
  timezone: string;
  attendee: { email: string; name: string };
  addVideoConference: boolean;
  meetingTypeSlug: string;
}

export interface CreatedEvent {
  eventId: string;
  calendarId: string;
  meetingUrl: string | null;
  htmlLink: string | null;
}

/** Destino de reservas (solo Google en esta versión). */
export interface EventDestination {
  createEvent(input: CalendarEventInput): Promise<CreatedEvent>;
  updateEventTime(calendarId: string, eventId: string, start: Date, end: Date, timezone: string): Promise<void>;
  deleteEvent(calendarId: string, eventId: string): Promise<void>;
}

export class CalendarApiError extends Error {
  constructor(
    public readonly provider: ProviderId,
    public readonly status: number,
    message: string,
    public readonly reauthRequired = false,
  ) {
    super(message);
    this.name = "CalendarApiError";
  }
}
