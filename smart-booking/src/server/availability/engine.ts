/**
 * MOTOR DE DISPONIBILIDAD — función pura (sin I/O).
 *
 * Disponibilidad = (horario semanal habilitado ± excepciones) − (ocupados Google ∪ ocupados Microsoft ∪ reservas activas)
 * evaluada por tipo de reunión (duración, intervalo, buffers, aviso mínimo, horizonte).
 *
 * Todas las entradas/salidas de instantes son epoch-ms UTC. Las reglas semanales se interpretan en la
 * zona horaria del horario (America/Lima por defecto) usando Luxon, por lo que DST y offsets de
 * otros calendarios se resuelven correctamente al convertir todo a UTC.
 */
import { DateTime } from "luxon";

export interface Interval {
  start: number; // epoch ms (inclusive)
  end: number; // epoch ms (exclusive)
}

export interface WeeklyRule {
  weekday: number; // 1 = lunes … 7 = domingo (ISO)
  startMinute: number;
  endMinute: number; // ≤ 1440
}

export interface DateException {
  kind: "BLOCKED" | "CUSTOM_HOURS";
  startDate: string; // YYYY-MM-DD (zona del horario), inclusive
  endDate: string; // YYYY-MM-DD inclusive
  startMinute: number | null;
  endMinute: number | null;
}

export interface MeetingConstraints {
  durationMinutes: number;
  slotIntervalMinutes: number;
  minNoticeMinutes: number;
  maxDaysAhead: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
}

export interface ComputeSlotsInput {
  scheduleTimezone: string;
  rules: WeeklyRule[];
  exceptions: DateException[];
  busy: Interval[];
  meeting: MeetingConstraints;
  rangeStart: number;
  rangeEnd: number;
  now: number;
}

export interface Slot {
  start: number;
  end: number;
}

const MINUTE = 60_000;

/** Ordena y fusiona intervalos solapados o contiguos. */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = intervals.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const cur of sorted) {
    const last = out[out.length - 1];
    if (last && cur.start <= last.end) last.end = Math.max(last.end, cur.end);
    else out.push({ ...cur });
  }
  return out;
}

/** Resta `cuts` de `base` (ambos en minutos locales del día). */
function subtractMinuteRanges(base: [number, number][], cuts: [number, number][]): [number, number][] {
  let result = base;
  for (const [cs, ce] of cuts) {
    const next: [number, number][] = [];
    for (const [s, e] of result) {
      if (ce <= s || cs >= e) {
        next.push([s, e]);
        continue;
      }
      if (cs > s) next.push([s, cs]);
      if (ce < e) next.push([ce, e]);
    }
    result = next;
  }
  return result;
}

function dateInRange(date: string, ex: DateException) {
  return date >= ex.startDate && date <= ex.endDate;
}

/** Ventanas habilitadas (minutos locales) para una fecha local concreta. */
export function windowsForDate(date: DateTime, rules: WeeklyRule[], exceptions: DateException[]): [number, number][] {
  const iso = date.toISODate()!;
  const applicable = exceptions.filter((e) => dateInRange(iso, e));

  const custom = applicable.filter((e) => e.kind === "CUSTOM_HOURS" && e.startMinute != null && e.endMinute != null);
  let windows: [number, number][] =
    custom.length > 0
      ? custom.map((e) => [e.startMinute!, e.endMinute!] as [number, number])
      : rules.filter((r) => r.weekday === date.weekday).map((r) => [r.startMinute, r.endMinute] as [number, number]);

  for (const b of applicable.filter((e) => e.kind === "BLOCKED")) {
    if (b.startMinute == null || b.endMinute == null) return []; // día completo bloqueado
    windows = subtractMinuteRanges(windows, [[b.startMinute, b.endMinute]]);
  }
  return windows.filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0]);
}

/** Convierte "fecha local + minuto del día" a epoch ms UTC en la zona del horario. */
function localMinuteToUtc(date: DateTime, minute: number): number {
  const base = date.startOf("day");
  if (minute >= 1440) return base.plus({ days: 1 }).toMillis();
  return base.set({ hour: Math.floor(minute / 60), minute: minute % 60 }).toMillis();
}

function overlapsAny(sorted: Interval[], s: number, e: number): boolean {
  // búsqueda binaria del primer intervalo con end > s
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid]!.end <= s) lo = mid + 1;
    else hi = mid;
  }
  const cand = sorted[lo];
  return cand !== undefined && cand.start < e;
}

export function computeSlots(input: ComputeSlotsInput): Slot[] {
  const { scheduleTimezone: zone, meeting } = input;
  if (!DateTime.local().setZone(zone).isValid) throw new Error(`Zona horaria inválida: ${zone}`);
  if (meeting.durationMinutes <= 0 || meeting.slotIntervalMinutes <= 0) return [];

  const busy = mergeIntervals(input.busy);
  const earliest = Math.max(input.rangeStart, input.now + meeting.minNoticeMinutes * MINUTE);
  const latest = Math.min(input.rangeEnd, input.now + meeting.maxDaysAhead * 24 * 60 * MINUTE);
  if (latest <= earliest) return [];

  const dur = meeting.durationMinutes * MINUTE;
  const step = meeting.slotIntervalMinutes * MINUTE;
  const before = meeting.bufferBeforeMinutes * MINUTE;
  const after = meeting.bufferAfterMinutes * MINUTE;

  const slots: Slot[] = [];
  let day = DateTime.fromMillis(earliest, { zone }).startOf("day");
  const lastDay = DateTime.fromMillis(latest, { zone }).startOf("day");

  while (day <= lastDay) {
    for (const [ws, we] of windowsForDate(day, input.rules, input.exceptions)) {
      const winStart = localMinuteToUtc(day, ws);
      const winEnd = localMinuteToUtc(day, we);
      for (let s = winStart; s + dur <= winEnd; s += step) {
        if (s < earliest || s >= latest) continue;
        const e = s + dur;
        if (overlapsAny(busy, s - before, e + after)) continue;
        slots.push({ start: s, end: e });
      }
    }
    day = day.plus({ days: 1 });
  }
  return slots;
}

/** ¿El inicio exacto `start` es un horario ofrecible? (re-verificación antes de reservar) */
export function isSlotAvailable(input: Omit<ComputeSlotsInput, "rangeStart" | "rangeEnd">, start: number): boolean {
  const slots = computeSlots({ ...input, rangeStart: start, rangeEnd: start + 1 });
  return slots.some((s) => s.start === start);
}
