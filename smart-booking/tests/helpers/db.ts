import { DateTime } from "luxon";
import { prisma } from "@/server/db";
import { DEFAULT_MEETING_TYPES, DEFAULT_WEEKLY_RULES } from "@/lib/meeting-type-defaults";

export { prisma };

export async function resetDb() {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE
    "form_responses", "payments", "bookings", "participants", "meeting_types",
    "availability_rules", "availability_exceptions", "app_settings", "calendar_integrations",
    "sync_logs", "stripe_events", "audit_logs", "rate_limit_buckets", "admin_sessions", "admin_users"
    RESTART IDENTITY CASCADE`);
}

export async function seedBase(opts: { asesoriaPrice?: number | null } = {}) {
  await prisma.appSettings.create({ data: { id: 1, timezone: "America/Lima" } });
  await prisma.availabilityRule.createMany({ data: DEFAULT_WEEKLY_RULES });
  for (const mt of DEFAULT_MEETING_TYPES) {
    const { formFields, ...rest } = mt;
    await prisma.meetingType.create({ data: { ...rest, formFields: formFields as object[] } });
  }
  const price = opts.asesoriaPrice === undefined ? 15000 : opts.asesoriaPrice;
  if (price != null) {
    await prisma.meetingType.update({ where: { slug: "asesoria" }, data: { priceAmount: price, currency: "pen" } });
  }
}

/** Lunes de la semana siguiente (Lima) a la hora local indicada, como ISO UTC. */
export function nextMondayAt(hour: number, minute = 0, weeksAhead = 1): DateTime {
  return DateTime.now()
    .setZone("America/Lima")
    .startOf("week")
    .plus({ weeks: weeksAhead })
    .set({ hour, minute, second: 0, millisecond: 0 });
}

export function iso(dt: DateTime) {
  return dt.toUTC().toISO()!;
}

export const answersFor = {
  "cafecito-virtual": (name = "Ana Torres") => ({
    fullName: name,
    phone: "+51 987 654 321",
    email: "ana@example.com",
    topic: "Quiero conversar sobre una alianza entre nuestras organizaciones.",
  }),
  "vocare-iuris": (name = "Luis Pérez") => ({
    fullName: name,
    phone: "+51 912 345 678",
    email: "luis@example.com",
    lawBranches: { selected: ["derecho-corporativo", "compliance"], custom: "Derecho ambiental" },
  }),
  asesoria: (name = "María Quispe") => ({
    fullName: name,
    phone: "+51 955 111 222",
    email: "maria@example.com",
    topic: "Necesito orientación sobre la constitución de mi empresa.",
  }),
};
