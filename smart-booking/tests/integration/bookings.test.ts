import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DomainError } from "@/server/errors";
import {
  cancelBooking,
  createBooking,
  expireStaleHolds,
  getBookingForParticipant,
  rescheduleBooking,
} from "@/server/bookings/service";
import { getAvailableSlots } from "@/server/availability/service";
import { __setCalendarOverrides } from "@/server/calendars/registry";
import { enforceRateLimit } from "@/server/security/rate-limit";
import { answersFor, iso, nextMondayAt, prisma, resetDb, seedBase } from "../helpers/db";
import { installCalendars, installStripe, resetOverrides, FakeBusy } from "../helpers/fakes";

let cal: ReturnType<typeof installCalendars>;

beforeEach(async () => {
  await resetDb();
  await seedBase();
  cal = installCalendars();
  installStripe();
});
afterEach(() => resetOverrides());

async function errorOf(p: Promise<unknown>): Promise<DomainError> {
  try {
    await p;
  } catch (e) {
    if (e instanceof DomainError) return e;
    throw e;
  }
  throw new Error("se esperaba un error");
}

const book = (slug: "cafecito-virtual" | "vocare-iuris" | "asesoria", start: string, name?: string) =>
  createBooking({ meetingType: slug, start, timezone: "America/Lima", answers: answersFor[slug](name) });

async function slotsOn(slug: string, day = nextMondayAt(0)) {
  const mt = await prisma.meetingType.findUniqueOrThrow({ where: { slug } });
  const slots = await getAvailableSlots(mt, day.toMillis(), day.plus({ days: 1 }).toMillis());
  return slots.map((s) => new Date(s.start).toISOString());
}

describe("reserva gratuita (camino feliz)", () => {
  it("cafecito → CONFIRMED con evento correcto en Google", async () => {
    const start = nextMondayAt(10);
    const r = await book("cafecito-virtual", iso(start), "Ana Torres");
    expect(r.status).toBe("CONFIRMED");
    expect(r.reference).toMatch(/^SB-/);
    expect(r.checkoutUrl).toBeUndefined();

    expect(cal.destination.created).toHaveLength(1);
    const ev = cal.destination.created[0]!;
    expect(ev.summary).toBe("Cafecito virtual | Ana Torres");
    expect(ev.end.getTime() - ev.start.getTime()).toBe(30 * 60_000);
    expect(ev.start.toISOString()).toBe(iso(start));
    for (const s of ["Ana Torres", "ana@example.com", "+51 987 654 321", "Cafecito virtual | Reunión de sinergias", "alianza", r.bookingId, r.reference]) {
      expect(ev.description).toContain(s);
    }
    expect(ev.attendee.email).toBe("ana@example.com");

    const b = await prisma.booking.findUniqueOrThrow({ where: { id: r.bookingId }, include: { answers: true } });
    expect(b.status).toBe("CONFIRMED");
    expect(b.calendarSyncState).toBe("SYNCED");
    expect(b.googleEventId).toBe(ev.eventId);
    expect(b.expiresAt).toBeNull();
    expect(b.answers.map((a) => a.fieldKey)).toEqual(["topic"]);
  });

  it("vocare-iuris → título y ramas del Derecho en la descripción", async () => {
    const r = await book("vocare-iuris", iso(nextMondayAt(11)), "Luis Pérez");
    expect(r.status).toBe("CONFIRMED");
    const ev = cal.destination.created[0]!;
    expect(ev.summary).toBe("Entrevista Vocare Iuris | Luis Pérez");
    expect(ev.description).toContain("Derecho corporativo, Compliance, Otra rama (especifica): Derecho ambiental");
    const ans = await prisma.formResponse.findFirstOrThrow({ where: { bookingId: r.bookingId } });
    expect(ans.value).toEqual({ selected: ["derecho-corporativo", "compliance"], custom: "Derecho ambiental" });
  });

  it("el horario reservado desaparece de los tres tipos", async () => {
    await book("cafecito-virtual", iso(nextMondayAt(10)));
    const t = iso(nextMondayAt(10));
    expect(await slotsOn("cafecito-virtual")).not.toContain(t);
    expect(await slotsOn("vocare-iuris")).not.toContain(t);
    const asesoria = await slotsOn("asesoria");
    expect(asesoria).not.toContain(iso(nextMondayAt(9, 30))); // 9:30–10:15 se solapa
    expect(asesoria).not.toContain(t);
  });

  it("horario no ofrecible (desalineado / fuera de horario / pasado) → SLOT_UNAVAILABLE", async () => {
    expect((await errorOf(book("cafecito-virtual", iso(nextMondayAt(10, 10))))).code).toBe("SLOT_UNAVAILABLE");
    expect((await errorOf(book("cafecito-virtual", iso(nextMondayAt(22))))).code).toBe("SLOT_UNAVAILABLE");
    expect((await errorOf(book("cafecito-virtual", new Date(Date.now() - 3_600_000).toISOString()))).code).toBe("SLOT_UNAVAILABLE");
  });

  it("datos inválidos → ZodError (422)", async () => {
    await expect(
      createBooking({ meetingType: "cafecito-virtual", start: iso(nextMondayAt(10)), timezone: "America/Lima", answers: { fullName: "A" } }),
    ).rejects.toThrow();
    await expect(
      createBooking({ meetingType: "cafecito-virtual", start: iso(nextMondayAt(10)), timezone: "Nope/Zone", answers: answersFor["cafecito-virtual"]() }),
    ).rejects.toThrow();
    expect(await prisma.booking.count()).toBe(0);
  });

  it("tipo inactivo → MEETING_TYPE_INACTIVE", async () => {
    await prisma.meetingType.update({ where: { slug: "cafecito-virtual" }, data: { isActive: false } });
    expect((await errorOf(book("cafecito-virtual", iso(nextMondayAt(10))))).code).toBe("MEETING_TYPE_INACTIVE");
  });
});

describe("ocupados externos (Google + Microsoft)", () => {
  it("evento en Google 10–11 y en Outlook 14–15 elimina esos horarios en las tres modalidades", async () => {
    cal.google.busy = [{ start: nextMondayAt(10).toMillis(), end: nextMondayAt(11).toMillis() }];
    cal.microsoft.busy = [{ start: nextMondayAt(14).toMillis(), end: nextMondayAt(15).toMillis() }];
    for (const slug of ["vocare-iuris", "cafecito-virtual", "asesoria"]) {
      const s = await slotsOn(slug);
      for (const h of [[10, 0], [10, 30], [14, 0], [14, 30]] as const) expect(s).not.toContain(iso(nextMondayAt(h[0], h[1])));
      expect(s).toContain(iso(nextMondayAt(11)));
    }
    expect((await errorOf(book("cafecito-virtual", iso(nextMondayAt(14))))).code).toBe("SLOT_UNAVAILABLE");
  });

  it("evento externo creado entre la reserva temporal y la creación del evento → FAILED y horario liberado", async () => {
    const start = nextMondayAt(16);
    // 1ª consulta (verificación previa) libre; desde la 2ª (antes de crear el evento) ocupado
    cal.microsoft.lateBusy = [{ fromCall: 2, interval: { start: start.toMillis(), end: start.plus({ hours: 1 }).toMillis() } }];
    const err = await errorOf(book("cafecito-virtual", iso(start)));
    expect(err.code).toBe("SLOT_UNAVAILABLE");
    expect(cal.destination.created).toHaveLength(0);
    const b = await prisma.booking.findFirstOrThrow();
    expect(b.status).toBe("FAILED");
  });

  it("falla de Google al crear el evento → FAILED, CALENDAR_WRITE_FAILED y el horario vuelve a estar disponible", async () => {
    cal.destination.failCreate = true;
    const start = iso(nextMondayAt(12));
    const err = await errorOf(book("cafecito-virtual", start));
    expect(err.code).toBe("CALENDAR_WRITE_FAILED");
    const b = await prisma.booking.findFirstOrThrow();
    expect(b.status).toBe("FAILED");
    expect(b.calendarSyncState).toBe("FAILED");
    expect(await slotsOn("cafecito-virtual")).toContain(start);
    cal.destination.failCreate = false;
    expect((await book("cafecito-virtual", start)).status).toBe("CONFIRMED");
  });

  it("fuente caída → CALENDAR_UNAVAILABLE (falla cerrado), sin reserva creada", async () => {
    cal.microsoft.fail = true;
    expect((await errorOf(slotsOn("cafecito-virtual"))).code).toBe("CALENDAR_UNAVAILABLE");
    expect((await errorOf(book("cafecito-virtual", iso(nextMondayAt(10))))).code).toBe("CALENDAR_UNAVAILABLE");
    expect(await prisma.booking.count()).toBe(0);
  });

  it("Google no conectado → sin disponibilidad", async () => {
    __setCalendarOverrides({ busySources: [new FakeBusy("MICROSOFT")], destination: null });
    expect((await errorOf(slotsOn("cafecito-virtual"))).code).toBe("CALENDAR_UNAVAILABLE");
  });

  it("sin overrides y sin integraciones en BD → CALENDAR_UNAVAILABLE", async () => {
    __setCalendarOverrides(null);
    expect((await errorOf(slotsOn("cafecito-virtual"))).code).toBe("CALENDAR_UNAVAILABLE");
  });
});

describe("CONCURRENCIA: prevención de dobles reservas", () => {
  it("10 solicitudes simultáneas para el mismo horario → exactamente 1 éxito", async () => {
    const start = iso(nextMondayAt(15));
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) => book("cafecito-virtual", start, `Persona ${i}`)),
    );
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(9);
    for (const f of failed) expect((f.reason as DomainError).code).toBe("SLOT_UNAVAILABLE");
    expect(cal.destination.created).toHaveLength(1);
    expect(await prisma.booking.count({ where: { status: "CONFIRMED" } })).toBe(1);
  });

  it("tipos distintos con horarios solapados (asesoría 10:00–10:45 vs cafecito 10:30) → solo uno", async () => {
    const results = await Promise.allSettled([
      book("asesoria", iso(nextMondayAt(10))),
      book("cafecito-virtual", iso(nextMondayAt(10, 30))),
      book("vocare-iuris", iso(nextMondayAt(10, 30))),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const active = await prisma.booking.findMany({ where: { status: { in: ["PENDING", "PAYMENT_PENDING", "CONFIRMED"] } } });
    expect(active).toHaveLength(1);
  });

  it("la BD rechaza solapamientos aunque se salte la capa de servicio (constraint EXCLUDE)", async () => {
    const r = await book("cafecito-virtual", iso(nextMondayAt(17)));
    const b = await prisma.booking.findUniqueOrThrow({ where: { id: r.bookingId } });
    await expect(
      prisma.booking.create({
        data: {
          reference: "SB-MANUAL01",
          meetingTypeId: b.meetingTypeId,
          participantId: b.participantId,
          startAt: new Date(b.startAt.getTime() + 10 * 60_000),
          endAt: new Date(b.endAt.getTime() + 10 * 60_000),
          blockedStartAt: new Date(b.startAt.getTime() + 10 * 60_000),
          blockedEndAt: new Date(b.endAt.getTime() + 10 * 60_000),
          participantTimezone: "America/Lima",
          status: "CONFIRMED",
        },
      }),
    ).rejects.toThrow();
  });
});

describe("reservas temporales", () => {
  it("una reserva temporal vigente bloquea; una vencida no, y expireStaleHolds la libera", async () => {
    const r = await book("asesoria", iso(nextMondayAt(18)));
    expect(r.status).toBe("PAYMENT_PENDING");
    expect(await slotsOn("cafecito-virtual")).not.toContain(iso(nextMondayAt(18)));

    await prisma.booking.update({ where: { id: r.bookingId }, data: { expiresAt: new Date(Date.now() - 10 * 60_000) } });
    expect(await slotsOn("cafecito-virtual")).toContain(iso(nextMondayAt(18)));
    expect(await expireStaleHolds()).toBe(1);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: r.bookingId } })).status).toBe("EXPIRED");
    expect((await prisma.payment.findFirstOrThrow({ where: { bookingId: r.bookingId } })).status).toBe("EXPIRED");
    expect((await book("cafecito-virtual", iso(nextMondayAt(18)))).status).toBe("CONFIRMED");
  });

  it("reservas vencidas dentro del margen de gracia no se liberan", async () => {
    const r = await book("asesoria", iso(nextMondayAt(19)));
    await prisma.booking.update({ where: { id: r.bookingId }, data: { expiresAt: new Date(Date.now() - 30_000) } });
    expect(await expireStaleHolds()).toBe(0);
  });
});

describe("administración", () => {
  it("cancelar elimina el evento de Google y marca CANCELLED", async () => {
    const r = await book("cafecito-virtual", iso(nextMondayAt(10)));
    await cancelBooking(r.bookingId, { reason: "Imprevisto" });
    const b = await prisma.booking.findUniqueOrThrow({ where: { id: r.bookingId } });
    expect(b.status).toBe("CANCELLED");
    expect(b.cancelReason).toBe("Imprevisto");
    expect(b.calendarSyncState).toBe("DELETED");
    expect(cal.destination.deleted).toEqual([b.googleEventId]);
    expect(await slotsOn("cafecito-virtual")).toContain(iso(nextMondayAt(10)));
    expect((await errorOf(cancelBooking(r.bookingId, {}))).code).toBe("CONFLICT");
  });

  it("reprogramar mueve el evento y crea una reserva vinculada", async () => {
    const r = await book("cafecito-virtual", iso(nextMondayAt(10)));
    // Google reporta el propio evento como ocupado; moverlo 30 min no debe chocar consigo mismo
    cal.google.busy = [{ start: nextMondayAt(10).toMillis(), end: nextMondayAt(10, 30).toMillis() }];
    const newId = await rescheduleBooking(r.bookingId, iso(nextMondayAt(10, 30)));
    const old = await prisma.booking.findUniqueOrThrow({ where: { id: r.bookingId } });
    const nb = await prisma.booking.findUniqueOrThrow({ where: { id: newId }, include: { answers: true } });
    expect(old.status).toBe("RESCHEDULED");
    expect(nb.status).toBe("CONFIRMED");
    expect(nb.rescheduledFromId).toBe(old.id);
    expect(nb.googleEventId).toBe(old.googleEventId);
    expect(nb.answers).toHaveLength(1);
    expect(cal.destination.updated[0]).toMatchObject({ eventId: old.googleEventId });
    expect(cal.destination.updated[0]!.start.toISOString()).toBe(iso(nextMondayAt(10, 30)));
    // el participante puede ver la nueva reserva con su mismo token
    const pub = await getBookingForParticipant(old.id, r.accessToken);
    expect(pub.rescheduledToId).toBe(newId);
    await expect(getBookingForParticipant(newId, r.accessToken)).resolves.toMatchObject({ status: "CONFIRMED" });
  });

  it("reprogramar a un horario ocupado → SLOT_UNAVAILABLE", async () => {
    const r = await book("cafecito-virtual", iso(nextMondayAt(10)));
    cal.microsoft.busy = [{ start: nextMondayAt(12).toMillis(), end: nextMondayAt(13).toMillis() }];
    expect((await errorOf(rescheduleBooking(r.bookingId, iso(nextMondayAt(12)))))).toMatchObject({ code: "SLOT_UNAVAILABLE" });
  });

  it("si Google falla al reprogramar se revierte todo", async () => {
    const r = await book("cafecito-virtual", iso(nextMondayAt(10)));
    cal.destination.failUpdate = true;
    expect((await errorOf(rescheduleBooking(r.bookingId, iso(nextMondayAt(11))))).code).toBe("CALENDAR_WRITE_FAILED");
    const all = await prisma.booking.findMany();
    expect(all).toHaveLength(1);
    expect(all[0]!.status).toBe("CONFIRMED");
    expect(await prisma.formResponse.count()).toBe(1);
  });
});

describe("acceso del participante y rate limit", () => {
  it("token incorrecto → NOT_FOUND; correcto → datos sin PII", async () => {
    const r = await book("cafecito-virtual", iso(nextMondayAt(10)));
    expect((await errorOf(getBookingForParticipant(r.bookingId, "x".repeat(32)))).code).toBe("NOT_FOUND");
    const pub = await getBookingForParticipant(r.bookingId, r.accessToken);
    expect(pub.status).toBe("CONFIRMED");
    expect(JSON.stringify(pub)).not.toContain("ana@example.com");
  });

  it("enforceRateLimit lanza RATE_LIMITED al superar el límite", async () => {
    const rule = { name: "test", limit: 3, windowSeconds: 60 };
    for (let i = 0; i < 3; i++) await enforceRateLimit(rule, "ip-1");
    const err = await errorOf(enforceRateLimit(rule, "ip-1"));
    expect(err.code).toBe("RATE_LIMITED");
    expect(err.status).toBe(429);
    await expect(enforceRateLimit(rule, "ip-2")).resolves.toBeUndefined();
  });
});
