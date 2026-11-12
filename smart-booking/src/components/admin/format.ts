import { DateTime } from "luxon";

export function fmtDateTime(d: Date | null | undefined, zone: string, pattern = "ccc d LLL yyyy · HH:mm") {
  if (!d) return "—";
  return DateTime.fromJSDate(d, { zone }).setLocale("es").toFormat(pattern);
}

export function fmtTime(d: Date, zone: string) {
  return DateTime.fromJSDate(d, { zone }).toFormat("HH:mm");
}

export function fmtRelative(d: Date | null | undefined) {
  if (!d) return "nunca";
  return DateTime.fromJSDate(d).setLocale("es").toRelative() ?? "—";
}
