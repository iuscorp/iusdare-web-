/** Utilidades de formato isomórficas (cliente y servidor). */
import { DateTime } from "luxon";

export function formatMoney(amountMinor: number, currency: string, locale = "es-PE") {
  const zero = ["CLP", "JPY", "KRW", "PYG", "VND"].includes(currency.toUpperCase());
  return new Intl.NumberFormat(locale, { style: "currency", currency: currency.toUpperCase() }).format(
    zero ? amountMinor : amountMinor / 100,
  );
}

export function formatDateTimeRange(startIso: string, endIso: string, zone: string, locale = "es") {
  const s = DateTime.fromISO(startIso, { zone }).setLocale(locale);
  const e = DateTime.fromISO(endIso, { zone }).setLocale(locale);
  return {
    date: s.toFormat("cccc d 'de' LLLL 'de' yyyy"),
    time: `${s.toFormat("HH:mm")} – ${e.toFormat("HH:mm")}`,
    zone,
  };
}

export function isValidTimezone(tz: string): boolean {
  return DateTime.local().setZone(tz).isValid;
}
