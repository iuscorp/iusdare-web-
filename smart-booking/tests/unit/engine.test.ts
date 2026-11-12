import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import {
  computeSlots,
  isSlotAvailable,
  mergeIntervals,
  type ComputeSlotsInput,
  type MeetingConstraints,
} from "@/server/availability/engine";
import { DEFAULT_MEETING_TYPES, DEFAULT_WEEKLY_RULES } from "@/lib/meeting-type-defaults";

const Z = "America/Lima";
const lima = (d: string, h: number, m = 0) => DateTime.fromISO(d, { zone: Z }).set({ hour: h, minute: m }).toMillis();
const fmt = (ms: number) => DateTime.fromMillis(ms, { zone: Z }).toFormat("HH:mm");
const NOW = DateTime.fromISO("2026-11-01T00:00", { zone: Z }).toMillis();
const MON = "2026-11-16"; // lunes
const SAT = "2026-11-21";
const SUN = "2026-11-22";

function meeting(duration: number, extra: Partial<MeetingConstraints> = {}): MeetingConstraints {
  return {
    durationMinutes: duration,
    slotIntervalMinutes: 30,
    minNoticeMinutes: 0,
    maxDaysAhead: 365,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    ...extra,
  };
}

function input(day: string, m: MeetingConstraints, extra: Partial<ComputeSlotsInput> = {}): ComputeSlotsInput {
  return {
    scheduleTimezone: Z,
    rules: DEFAULT_WEEKLY_RULES,
    exceptions: [],
    busy: [],
    meeting: m,
    rangeStart: lima(day, 0),
    rangeEnd: lima(day, 0) + 86_400_000,
    now: NOW,
    ...extra,
  };
}

const times = (i: ComputeSlotsInput) => computeSlots(i).map((s) => fmt(s.start));

describe("computeSlots — horario semanal", () => {
  it("lunes 9:00–21:00 con reuniones de 30 min", () => {
    const t = times(input(MON, meeting(30)));
    expect(t[0]).toBe("09:00");
    expect(t.at(-1)).toBe("20:30");
    expect(t).toHaveLength(24);
  });

  it("lunes con reuniones de 45 min: último inicio 20:00 (termina 20:45)", () => {
    const t = times(input(MON, meeting(45)));
    expect(t[0]).toBe("09:00");
    expect(t.at(-1)).toBe("20:00");
    expect(t).not.toContain("20:30");
  });

  it("sábado y domingo 11:00–19:00", () => {
    for (const d of [SAT, SUN]) {
      const t30 = times(input(d, meeting(30)));
      expect(t30[0]).toBe("11:00");
      expect(t30.at(-1)).toBe("18:30");
      const t45 = times(input(d, meeting(45)));
      expect(t45.at(-1)).toBe("18:00");
    }
  });

  it("los slots devueltos tienen la duración exacta", () => {
    for (const s of computeSlots(input(MON, meeting(45)))) expect(s.end - s.start).toBe(45 * 60_000);
  });
});

describe("ACEPTACIÓN: ocupados de Google + Outlook afectan a los tres tipos", () => {
  const googleBusy = { start: lima(MON, 10), end: lima(MON, 11) };
  const outlookBusy = { start: lima(MON, 14), end: lima(MON, 15) };

  for (const mt of DEFAULT_MEETING_TYPES) {
    it(`${mt.slug} (${mt.durationMinutes} min) excluye 10–11 y 14–15`, () => {
      const m = meeting(mt.durationMinutes, { slotIntervalMinutes: mt.slotIntervalMinutes });
      const slots = computeSlots(input(MON, m, { busy: [googleBusy, outlookBusy] }));
      for (const s of slots) {
        const overlapsGoogle = s.start < googleBusy.end && s.end > googleBusy.start;
        const overlapsOutlook = s.start < outlookBusy.end && s.end > outlookBusy.start;
        expect(overlapsGoogle || overlapsOutlook).toBe(false);
      }
      const t = slots.map((s) => fmt(s.start));
      expect(t).not.toContain("10:00");
      expect(t).not.toContain("10:30");
      expect(t).not.toContain("14:00");
      expect(t).not.toContain("14:30");
      expect(t).toContain("11:00");
      expect(t).toContain("15:00");
      if (mt.durationMinutes === 45) {
        expect(t).not.toContain("09:30"); // 9:30–10:15 se solapa con 10:00
        expect(t).not.toContain("13:30"); // 13:30–14:15
        expect(t).toContain("09:00");
      } else {
        expect(t).toContain("09:30");
        expect(t).toContain("13:30");
      }
    });
  }
});

describe("restricciones", () => {
  it("aviso mínimo", () => {
    const now = lima(MON, 12, 10);
    const t = times(input(MON, meeting(30, { minNoticeMinutes: 120 }), { now }));
    expect(t[0]).toBe("14:30");
  });

  it("horizonte máximo (maxDaysAhead)", () => {
    const now = lima(MON, 0);
    const slots = computeSlots({
      ...input(MON, meeting(30, { maxDaysAhead: 2 }), { now }),
      rangeEnd: lima(MON, 0) + 10 * 86_400_000,
    });
    const days = new Set(slots.map((s) => DateTime.fromMillis(s.start, { zone: Z }).toISODate()));
    expect([...days]).toEqual(["2026-11-16", "2026-11-17"]);
  });

  it("buffers antes/después alrededor de un evento ocupado", () => {
    const busy = [{ start: lima(MON, 12), end: lima(MON, 13) }];
    const t = times(input(MON, meeting(30, { bufferBeforeMinutes: 15, bufferAfterMinutes: 15 }), { busy }));
    expect(t).not.toContain("11:30"); // termina 12:00 + 15 buffer después
    expect(t).not.toContain("13:00"); // 15 buffer antes cae en 12:45
    expect(t).toContain("11:00");
    expect(t).toContain("13:30");
  });

  it("intervalo de slots de 15 min", () => {
    const t = times(input(MON, meeting(45, { slotIntervalMinutes: 15 })));
    expect(t.slice(0, 3)).toEqual(["09:00", "09:15", "09:30"]);
    expect(t.at(-1)).toBe("20:15");
  });
});

describe("excepciones", () => {
  it("BLOCKED día completo", () => {
    const t = times(input(MON, meeting(30), {
      exceptions: [{ kind: "BLOCKED", startDate: MON, endDate: MON, startMinute: null, endMinute: null }],
    }));
    expect(t).toEqual([]);
  });

  it("BLOCKED rango de varios días", () => {
    const ex = [{ kind: "BLOCKED" as const, startDate: "2026-11-15", endDate: "2026-11-17", startMinute: null, endMinute: null }];
    expect(times(input(MON, meeting(30), { exceptions: ex }))).toEqual([]);
    expect(times(input("2026-11-18", meeting(30), { exceptions: ex })).length).toBe(24);
  });

  it("BLOCKED parcial 12:00–15:00", () => {
    const t = times(input(MON, meeting(30), {
      exceptions: [{ kind: "BLOCKED", startDate: MON, endDate: MON, startMinute: 720, endMinute: 900 }],
    }));
    expect(t).toContain("11:30");
    expect(t).not.toContain("12:00");
    expect(t).not.toContain("14:30");
    expect(t).toContain("15:00");
  });

  it("CUSTOM_HOURS sustituye el horario del día (incluso un domingo)", () => {
    const t = times(input(SUN, meeting(30), {
      exceptions: [{ kind: "CUSTOM_HOURS", startDate: SUN, endDate: SUN, startMinute: 8 * 60, endMinute: 10 * 60 }],
    }));
    expect(t).toEqual(["08:00", "08:30", "09:00", "09:30"]);
  });

  it("endMinute 1440 (hasta medianoche)", () => {
    const t = times(input(MON, meeting(30), {
      rules: [{ weekday: 1, startMinute: 23 * 60, endMinute: 1440 }],
    }));
    expect(t).toEqual(["23:00", "23:30"]);
  });
});

describe("zonas horarias / DST de otros calendarios", () => {
  // Evento a las 11:00 en Nueva York; Lima no tiene DST.
  const nyBusy = (date: string) => {
    const s = DateTime.fromISO(`${date}T11:00`, { zone: "America/New_York" });
    return { start: s.toMillis(), end: s.plus({ hours: 1 }).toMillis() };
  };
  const cases: [string, string][] = [
    ["2026-03-06", "11:00"], // EST (UTC-5) = Lima
    ["2026-03-09", "10:00"], // EDT (UTC-4) → 10:00 Lima
    ["2026-10-30", "10:00"], // EDT
    ["2026-11-02", "11:00"], // EST tras fin de DST
  ];
  for (const [date, limaStart] of cases) {
    it(`${date}: 11:00 NY bloquea ${limaStart} en Lima`, () => {
      const now = DateTime.fromISO("2026-01-01", { zone: Z }).toMillis();
      const t = times(input(date, meeting(30), { busy: [nyBusy(date)], now }));
      expect(t).not.toContain(limaStart);
      const [h] = limaStart.split(":");
      expect(t).not.toContain(`${h}:30`);
      expect(t).toContain(limaStart === "10:00" ? "11:00" : "10:30");
    });
  }

  it("horario configurado en una zona con DST se convierte correctamente", () => {
    const now = DateTime.fromISO("2026-01-01", { zone: Z }).toMillis();
    const day = "2026-03-09";
    const slots = computeSlots({
      ...input(day, meeting(30), { now }),
      scheduleTimezone: "America/New_York",
      rangeStart: DateTime.fromISO(day, { zone: "America/New_York" }).toMillis(),
      rangeEnd: DateTime.fromISO(day, { zone: "America/New_York" }).plus({ days: 1 }).toMillis(),
    });
    expect(DateTime.fromMillis(slots[0]!.start, { zone: "utc" }).toFormat("HH:mm")).toBe("13:00");
  });
});

describe("utilidades", () => {
  it("mergeIntervals fusiona solapados y contiguos, descarta vacíos", () => {
    expect(
      mergeIntervals([
        { start: 5, end: 7 },
        { start: 1, end: 3 },
        { start: 3, end: 4 },
        { start: 6, end: 9 },
        { start: 10, end: 10 },
      ]),
    ).toEqual([
      { start: 1, end: 4 },
      { start: 5, end: 9 },
    ]);
  });

  it("isSlotAvailable: inicio alineado true, desalineado false, ocupado false", () => {
    const base = { ...input(MON, meeting(30)) };
    const { rangeStart: _a, rangeEnd: _b, ...rest } = base;
    expect(isSlotAvailable(rest, lima(MON, 10))).toBe(true);
    expect(isSlotAvailable(rest, lima(MON, 10, 10))).toBe(false);
    expect(isSlotAvailable(rest, lima(MON, 8, 30))).toBe(false);
    expect(isSlotAvailable({ ...rest, busy: [{ start: lima(MON, 10), end: lima(MON, 10, 5) }] }, lima(MON, 10))).toBe(false);
  });

  it("zona horaria inválida lanza error", () => {
    expect(() => computeSlots({ ...input(MON, meeting(30)), scheduleTimezone: "Mars/Olympus" })).toThrow();
  });
});
