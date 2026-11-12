import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { graphEventToInterval } from "@/server/calendars/microsoft";

const ev = (over: Record<string, unknown> = {}) => ({
  showAs: "busy",
  isCancelled: false,
  isAllDay: false,
  start: { dateTime: "2026-11-16T19:00:00.0000000", timeZone: "UTC" },
  end: { dateTime: "2026-11-16T20:00:00.0000000", timeZone: "UTC" },
  ...over,
});

describe("Microsoft Graph → intervalos ocupados", () => {
  it("busy en UTC → 14:00–15:00 Lima", () => {
    const iv = graphEventToInterval(ev(), "America/Lima")!;
    expect(DateTime.fromMillis(iv.start, { zone: "America/Lima" }).toFormat("HH:mm")).toBe("14:00");
    expect(iv.end - iv.start).toBe(3_600_000);
  });
  it.each(["busy", "oof", "tentative", "Busy"])("%s bloquea", (showAs) => {
    expect(graphEventToInterval(ev({ showAs }), "America/Lima")).not.toBeNull();
  });
  it.each(["free", "workingElsewhere"])("%s no bloquea", (showAs) => {
    expect(graphEventToInterval(ev({ showAs }), "America/Lima")).toBeNull();
  });
  it("cancelado no bloquea", () => {
    expect(graphEventToInterval(ev({ isCancelled: true }), "America/Lima")).toBeNull();
  });
  it("día completo se interpreta en la zona de la titular", () => {
    const iv = graphEventToInterval(
      ev({
        isAllDay: true,
        start: { dateTime: "2026-11-16T00:00:00.0000000", timeZone: "UTC" },
        end: { dateTime: "2026-11-17T00:00:00.0000000", timeZone: "UTC" },
      }),
      "America/Lima",
    )!;
    expect(iv.start).toBe(DateTime.fromISO("2026-11-16T00:00", { zone: "America/Lima" }).toMillis());
    expect(iv.end).toBe(DateTime.fromISO("2026-11-17T00:00", { zone: "America/Lima" }).toMillis());
  });
  it("zona no reconocida → falla cerrado (lanza)", () => {
    expect(() =>
      graphEventToInterval(ev({ start: { dateTime: "2026-11-16T10:00:00", timeZone: "Pacific Standard Time" } }), "America/Lima"),
    ).toThrow();
  });
});
