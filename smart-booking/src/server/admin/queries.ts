import "server-only";
import type { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { parseFormFields, formatAnswer } from "@/lib/forms/schema";

export async function getDashboardStats() {
  const now = new Date();
  const [byType, totalConfirmed, upcoming, revenue, types, alerts] = await Promise.all([
    prisma.booking.groupBy({ by: ["meetingTypeId"], where: { status: "CONFIRMED" }, _count: { _all: true } }),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.booking.findMany({
      where: { status: "CONFIRMED", startAt: { gte: now } },
      orderBy: { startAt: "asc" },
      take: 8,
      include: { meetingType: true, participant: true },
    }),
    prisma.payment.groupBy({ by: ["currency"], where: { status: "PAID" }, _sum: { amount: true } }),
    prisma.meetingType.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.booking.count({ where: { status: "PENDING", expiresAt: null } }),
  ]);
  const counts = Object.fromEntries(byType.map((r) => [r.meetingTypeId, r._count._all]));
  return {
    totalConfirmed,
    perType: types.map((t) => ({ slug: t.slug, name: t.name, accentColor: t.accentColor, count: counts[t.id] ?? 0 })),
    revenue: revenue.map((r) => ({ currency: r.currency, amount: r._sum.amount ?? 0 })),
    upcomingCount: await prisma.booking.count({ where: { status: "CONFIRMED", startAt: { gte: now } } }),
    upcoming,
    pendingCalendarAlerts: alerts,
  };
}

export interface BookingFilters {
  type?: string;
  status?: BookingStatus | "ALL";
  scope?: "upcoming" | "past" | "all";
  q?: string;
  page?: number;
}

export const PAGE_SIZE = 25;

export async function listBookings(f: BookingFilters) {
  const now = new Date();
  const where: Prisma.BookingWhereInput = {
    ...(f.type ? { meetingType: { slug: f.type } } : {}),
    ...(f.status && f.status !== "ALL" ? { status: f.status } : {}),
    ...(f.scope === "upcoming" ? { startAt: { gte: now } } : f.scope === "past" ? { startAt: { lt: now } } : {}),
    ...(f.q
      ? {
          OR: [
            { reference: { contains: f.q, mode: "insensitive" } },
            { participant: { fullName: { contains: f.q, mode: "insensitive" } } },
            { participant: { email: { contains: f.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const page = Math.max(1, f.page ?? 1);
  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { startAt: f.scope === "upcoming" ? "asc" : "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { meetingType: true, participant: true, payments: true },
    }),
    prisma.booking.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getBookingDetail(id: string) {
  const b = await prisma.booking.findUnique({
    where: { id },
    include: {
      meetingType: true,
      participant: true,
      answers: true,
      payments: { orderBy: { createdAt: "desc" } },
      rescheduledFrom: { select: { id: true, reference: true, startAt: true } },
      rescheduledTo: { select: { id: true, reference: true, startAt: true } },
    },
  });
  if (!b) return null;
  const fields = parseFormFields(b.meetingType.formFields);
  const answers = fields.map((f) => ({
    key: f.key,
    label: f.label,
    value: formatAnswer(f, b.answers.find((a) => a.fieldKey === f.key)?.value),
  }));
  const syncLogs = await prisma.syncLog.findMany({ where: { bookingId: id }, orderBy: { createdAt: "desc" }, take: 20 });
  return { ...b, formattedAnswers: answers, syncLogs };
}

export async function listPayments(page = 1) {
  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { booking: { include: { participant: true, meetingType: true } } },
    }),
    prisma.payment.count(),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getIntegrationsOverview() {
  const [integrations, logs] = await Promise.all([
    prisma.calendarIntegration.findMany(),
    prisma.syncLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const pick = (p: "GOOGLE" | "MICROSOFT") => {
    const i = integrations.find((x) => x.provider === p);
    return i
      ? {
          provider: p,
          status: i.status,
          accountEmail: i.accountEmail,
          lastSyncAt: i.lastSyncAt,
          lastError: i.lastError,
          connectedAt: i.connectedAt,
          targetCalendarId: i.targetCalendarId,
          busyCalendarIds: i.busyCalendarIds,
        }
      : { provider: p, status: "DISCONNECTED" as const, accountEmail: null, lastSyncAt: null, lastError: null, connectedAt: null, targetCalendarId: null, busyCalendarIds: [] as string[] };
  };
  return { google: pick("GOOGLE"), microsoft: pick("MICROSOFT"), logs };
}
