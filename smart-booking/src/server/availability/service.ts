import "server-only";
import type { MeetingType } from "@prisma/client";
import { prisma } from "../db";
import { DomainError } from "../errors";
import { logger } from "../logger";
import { getActiveBusySources } from "../calendars/registry";
import { withSyncLog } from "../calendars/sync-log";
import {
  computeSlots,
  isSlotAvailable,
  type DateException,
  type Interval,
  type MeetingConstraints,
  type Slot,
  type WeeklyRule,
} from "./engine";

/** Margen tras la expiración de una reserva temporal antes de liberarla (webhooks tardíos). */
export const HOLD_GRACE_MS = 2 * 60_000;
export const ACTIVE_STATUSES = ["PENDING", "PAYMENT_PENDING", "CONFIRMED"] as const;

export interface Schedule {
  timezone: string;
  rules: WeeklyRule[];
  exceptions: DateException[];
}

export async function loadSchedule(): Promise<Schedule> {
  const [settings, rules, exceptions] = await Promise.all([
    prisma.appSettings.findUnique({ where: { id: 1 } }),
    prisma.availabilityRule.findMany(),
    prisma.availabilityException.findMany(),
  ]);
  return {
    timezone: settings?.timezone ?? "America/Lima",
    rules: rules.map((r) => ({ weekday: r.weekday, startMinute: r.startMinute, endMinute: r.endMinute })),
    exceptions: exceptions.map((e) => ({
      kind: e.kind,
      startDate: e.startDate,
      endDate: e.endDate,
      startMinute: e.startMinute,
      endMinute: e.endMinute,
    })),
  };
}

export function constraintsOf(mt: MeetingType): MeetingConstraints {
  return {
    durationMinutes: mt.durationMinutes,
    slotIntervalMinutes: mt.slotIntervalMinutes,
    minNoticeMinutes: mt.minNoticeMinutes,
    maxDaysAhead: mt.maxDaysAhead,
    bufferBeforeMinutes: mt.bufferBeforeMinutes,
    bufferAfterMinutes: mt.bufferAfterMinutes,
  };
}

/** Reservas propias activas (incluye reservas temporales vigentes). */
async function internalBusy(range: Interval, excludeBookingId?: string): Promise<Interval[]> {
  const now = Date.now();
  const rows = await prisma.booking.findMany({
    where: {
      status: { in: [...ACTIVE_STATUSES] },
      blockedStartAt: { lt: new Date(range.end) },
      blockedEndAt: { gt: new Date(range.start) },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date(now - HOLD_GRACE_MS) } }],
    },
    select: { blockedStartAt: true, blockedEndAt: true },
  });
  return rows.map((r) => ({ start: r.blockedStartAt.getTime(), end: r.blockedEndAt.getTime() }));
}

function subtract(intervals: Interval[], cut: Interval): Interval[] {
  const out: Interval[] = [];
  for (const i of intervals) {
    if (cut.end <= i.start || cut.start >= i.end) out.push(i);
    else {
      if (cut.start > i.start) out.push({ start: i.start, end: cut.start });
      if (cut.end < i.end) out.push({ start: cut.end, end: i.end });
    }
  }
  return out;
}

export interface CollectBusyOptions {
  /** No contar esta reserva propia como ocupada (re-verificación de su propio hold) */
  excludeBookingId?: string;
  /** Reprogramación: ignorar el intervalo del evento actual en los calendarios externos */
  ignoreExternalInterval?: Interval;
}

/**
 * Consulta EN VIVO todos los calendarios conectados (en paralelo) + reservas propias.
 * Falla cerrado: si cualquier fuente conectada falla, lanza CALENDAR_UNAVAILABLE.
 */
export async function collectBusy(range: Interval, opts: CollectBusyOptions = {}): Promise<Interval[]> {
  const { sources, broken, googleReady } = await getActiveBusySources();
  if (!googleReady) {
    throw new DomainError(
      "CALENDAR_UNAVAILABLE",
      "La agenda no está disponible en este momento. Inténtalo más tarde.",
      503,
      { reason: "google_not_connected" },
    );
  }
  if (broken.length) {
    throw new DomainError("CALENDAR_UNAVAILABLE", "No pudimos verificar la disponibilidad. Inténtalo más tarde.", 503, {
      reason: "integration_error",
    });
  }
  let external: Interval[][];
  try {
    external = await Promise.all(
      sources.map((s) => withSyncLog(s.provider, "busy.query", () => s.getBusy(range))),
    );
  } catch (err) {
    logger.warn("busy_query_failed", { err });
    throw new DomainError("CALENDAR_UNAVAILABLE", "No pudimos verificar la disponibilidad. Inténtalo más tarde.", 503, {
      reason: "provider_error",
    });
  }
  let busy = external.flat();
  if (opts.ignoreExternalInterval) busy = subtract(busy, opts.ignoreExternalInterval);
  const internal = await internalBusy(range, opts.excludeBookingId);
  return [...busy, ...internal];
}

/** Ventana de consulta ampliada con los buffers del tipo de reunión. */
function paddedRange(mt: MeetingType, start: number, end: number): Interval {
  const pad = (mt.bufferBeforeMinutes + mt.bufferAfterMinutes + mt.durationMinutes) * 60_000;
  return { start: start - pad, end: end + pad };
}

export async function getAvailableSlots(
  mt: MeetingType,
  rangeStart: number,
  rangeEnd: number,
  now = Date.now(),
  opts: CollectBusyOptions = {},
): Promise<Slot[]> {
  const schedule = await loadSchedule();
  const busy = await collectBusy(paddedRange(mt, rangeStart, rangeEnd), opts);
  return computeSlots({
    scheduleTimezone: schedule.timezone,
    rules: schedule.rules,
    exceptions: schedule.exceptions,
    busy,
    meeting: constraintsOf(mt),
    rangeStart,
    rangeEnd,
    now,
  });
}

/** Re-verificación en vivo de un horario concreto. */
export async function verifySlot(
  mt: MeetingType,
  start: number,
  opts: CollectBusyOptions & { now?: number; ignoreNotice?: boolean } = {},
): Promise<boolean> {
  const schedule = await loadSchedule();
  const end = start + mt.durationMinutes * 60_000;
  const busy = await collectBusy(paddedRange(mt, start, end), opts);
  const meeting = constraintsOf(mt);
  if (opts.ignoreNotice) meeting.minNoticeMinutes = 0;
  return isSlotAvailable(
    {
      scheduleTimezone: schedule.timezone,
      rules: schedule.rules,
      exceptions: schedule.exceptions,
      busy,
      meeting,
      now: opts.now ?? Date.now(),
    },
    start,
  );
}
