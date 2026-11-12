import "server-only";
import { prisma } from "../db";
import { parseFormFields, type FormField } from "@/lib/forms/schema";
import { formatMoney } from "@/lib/format";
import { paymentsAvailable } from "../payments/stripe";

/** DTO seguro para el cliente (sin datos internos). */
export interface PublicMeetingType {
  slug: string;
  name: string;
  description: string;
  durationMinutes: number;
  requiresPayment: boolean;
  priceLabel: string | null;
  /** false si es de pago y aún no tiene precio / Stripe configurado */
  bookable: boolean;
  accentColor: string;
  videoConference: boolean;
  formFields: FormField[];
  scheduleTimezone: string;
}

export async function getPublicMeetingType(slug: string): Promise<PublicMeetingType | null> {
  const [mt, settings] = await Promise.all([
    prisma.meetingType.findUnique({ where: { slug } }),
    prisma.appSettings.findUnique({ where: { id: 1 } }),
  ]);
  if (!mt || !mt.isActive) return null;
  return toDto(mt, settings?.timezone ?? "America/Lima");
}

export async function listPublicMeetingTypes(): Promise<PublicMeetingType[]> {
  const [types, settings] = await Promise.all([
    prisma.meetingType.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.appSettings.findUnique({ where: { id: 1 } }),
  ]);
  return types.map((t) => toDto(t, settings?.timezone ?? "America/Lima"));
}

function toDto(
  mt: Awaited<ReturnType<typeof prisma.meetingType.findUnique>> & object,
  tz: string,
): PublicMeetingType {
  const hasPrice = mt.priceAmount != null && mt.priceAmount > 0 && Boolean(mt.currency);
  return {
    slug: mt.slug,
    name: mt.name,
    description: mt.description,
    durationMinutes: mt.durationMinutes,
    requiresPayment: mt.requiresPayment,
    priceLabel: mt.requiresPayment && hasPrice ? formatMoney(mt.priceAmount!, mt.currency!) : null,
    bookable: !mt.requiresPayment || (hasPrice && paymentsAvailable()),
    accentColor: mt.accentColor,
    videoConference: mt.addVideoConference,
    formFields: parseFormFields(mt.formFields),
    scheduleTimezone: tz,
  };
}
