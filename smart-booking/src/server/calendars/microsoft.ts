import "server-only";
import { DateTime } from "luxon";
import { prisma } from "../db";
import type { Interval } from "../availability/engine";
import { apiFetch, readJson } from "./http";
import { forceRefresh, getAccessToken } from "./tokens";
import { CalendarApiError, type BusySource } from "./types";

const GRAPH = "https://graph.microsoft.com/v1.0";
/** Estados de Outlook que bloquean disponibilidad. `free` y `workingElsewhere` no bloquean. */
export const BLOCKING_SHOW_AS = new Set(["busy", "oof", "tentative"]);
const MAX_PAGES = 20;

interface GraphEvent {
  showAs?: string;
  isCancelled?: boolean;
  isAllDay?: boolean;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}

async function call(url: string): Promise<Response> {
  const headers = { Prefer: 'outlook.timezone="UTC"' };
  let token = await getAccessToken("MICROSOFT");
  let res = await apiFetch("MICROSOFT", url, { headers, accessToken: token });
  if (res.status === 401) {
    token = await forceRefresh("MICROSOFT");
    res = await apiFetch("MICROSOFT", url, { headers, accessToken: token });
  }
  return res;
}

/**
 * Convierte un evento de Graph a intervalo UTC.
 * - Con `Prefer: outlook.timezone="UTC"` las fechas llegan sin offset y en UTC.
 * - Eventos de día completo: se interpretan como días completos en la zona del horario de la titular.
 */
export function graphEventToInterval(ev: GraphEvent, scheduleTimezone: string): Interval | null {
  if (ev.isCancelled) return null;
  if (!BLOCKING_SHOW_AS.has((ev.showAs ?? "busy").toLowerCase())) return null;
  if (ev.isAllDay) {
    const s = DateTime.fromISO(ev.start.dateTime.slice(0, 10), { zone: scheduleTimezone }).startOf("day");
    const e = DateTime.fromISO(ev.end.dateTime.slice(0, 10), { zone: scheduleTimezone }).startOf("day");
    return { start: s.toMillis(), end: Math.max(e.toMillis(), s.plus({ days: 1 }).toMillis()) };
  }
  const zone = ev.start.timeZone && ev.start.timeZone !== "UTC" ? ev.start.timeZone : "UTC";
  const s = DateTime.fromISO(ev.start.dateTime, { zone });
  const e = DateTime.fromISO(ev.end.dateTime, { zone: ev.end.timeZone && ev.end.timeZone !== "UTC" ? ev.end.timeZone : "UTC" });
  // Fallar cerrado: una fecha que no sabemos interpretar nunca se considera "libre".
  if (!s.isValid || !e.isValid) throw new CalendarApiError("MICROSOFT", 502, "Formato de fecha de Microsoft Graph no reconocido");
  return { start: s.toMillis(), end: e.toMillis() };
}

export const microsoftBusySource: BusySource = {
  provider: "MICROSOFT",
  async getBusy(range: Interval): Promise<Interval[]> {
    const [integ, settings] = await Promise.all([
      prisma.calendarIntegration.findUnique({ where: { provider: "MICROSOFT" } }),
      prisma.appSettings.findUnique({ where: { id: 1 } }),
    ]);
    const zone = settings?.timezone ?? "America/Lima";
    const calendars = integ?.busyCalendarIds?.length ? integ.busyCalendarIds : [null];
    const out: Interval[] = [];
    for (const calId of calendars) {
      const base = calId ? `${GRAPH}/me/calendars/${encodeURIComponent(calId)}/calendarView` : `${GRAPH}/me/calendarView`;
      const params = new URLSearchParams({
        startDateTime: new Date(range.start).toISOString(),
        endDateTime: new Date(range.end).toISOString(),
        $select: "showAs,isCancelled,isAllDay,start,end",
        $top: "250",
      });
      let url: string | null = `${base}?${params.toString()}`;
      let pages = 0;
      while (url && pages < MAX_PAGES) {
        const res = await call(url);
        const json: { value?: GraphEvent[]; "@odata.nextLink"?: string } = await readJson(
          "MICROSOFT",
          res,
          "calendarView",
        );
        for (const ev of json.value ?? []) {
          const iv = graphEventToInterval(ev, zone);
          if (iv) out.push(iv);
        }
        url = json["@odata.nextLink"] ?? null;
        pages++;
      }
    }
    return out;
  },
};

export async function listMicrosoftCalendars(): Promise<{ id: string; summary: string; primary: boolean }[]> {
  const res = await call(`${GRAPH}/me/calendars?$select=id,name,isDefaultCalendar&$top=100`);
  const json = await readJson<{ value?: { id: string; name: string; isDefaultCalendar?: boolean }[] }>(
    "MICROSOFT",
    res,
    "calendars.list",
  );
  return (json.value ?? []).map((c) => ({ id: c.id, summary: c.name, primary: Boolean(c.isDefaultCalendar) }));
}
