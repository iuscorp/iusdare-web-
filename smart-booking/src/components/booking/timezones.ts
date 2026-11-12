/** Zonas horarias comunes ofrecidas en el selector (se añade siempre la detectada). */
export const COMMON_TIMEZONES = [
  "America/Lima",
  "America/Bogota",
  "America/Guayaquil",
  "America/Mexico_City",
  "America/Panama",
  "America/Caracas",
  "America/La_Paz",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "America/Montevideo",
  "America/Asuncion",
  "America/Sao_Paulo",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Europe/Madrid",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];

export function detectTimezone(fallback: string): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback;
  } catch {
    return fallback;
  }
}

export function tzLabel(tz: string): string {
  const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
  try {
    const parts = new Intl.DateTimeFormat("es", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(new Date());
    const off = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    return `${city} (${off})`;
  } catch {
    return city;
  }
}
