import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { z } from "zod";
import { getBookingDetail } from "@/server/admin/queries";
import { scheduleTimezone } from "@/server/admin/settings";
import { getAvailableSlots } from "@/server/availability/service";
import { DomainError } from "@/server/errors";
import { formatMoney } from "@/lib/format";
import { PAYMENT_STATUS_LABEL } from "@/lib/status";
import { Alert, Badge, Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/admin/PageHeader";
import { BookingStatusBadge } from "@/components/admin/BookingStatusBadge";
import { CancelBookingForm, RescheduleDatePicker, RescheduleSlotsForm } from "@/components/admin/BookingActions";
import { fmtDateTime, fmtTime } from "@/components/admin/format";

export const metadata: Metadata = { title: "Detalle de reserva" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-[180px_1fr]">
      <dt className="text-sm text-navy-deep/60">{label}</dt>
      <dd className="break-words text-sm font-medium">{children}</dd>
    </div>
  );
}

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [b, tz] = await Promise.all([getBookingDetail(id), scheduleTimezone()]);
  if (!b) notFound();

  const active = ["CONFIRMED", "PENDING", "PAYMENT_PENDING"].includes(b.status);
  const paid = b.payments.some((p) => p.status === "PAID");

  // Reprogramación: horarios del día elegido (zona del horario), calculados en vivo.
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : undefined;
  let slots: { start: string; label: string }[] = [];
  let slotsError: string | null = null;
  if (b.status === "CONFIRMED" && date) {
    const day = DateTime.fromISO(date, { zone: tz });
    if (day.isValid) {
      try {
        const found = await getAvailableSlots(b.meetingType, day.startOf("day").toMillis(), day.endOf("day").toMillis(), Date.now(), {
          excludeBookingId: b.id,
          ignoreExternalInterval: { start: b.startAt.getTime(), end: b.endAt.getTime() },
        });
        slots = found.map((s) => ({
          start: new Date(s.start).toISOString(),
          label: DateTime.fromMillis(s.start, { zone: tz }).toFormat("HH:mm"),
        }));
      } catch (err) {
        slotsError = err instanceof DomainError ? err.message : "No se pudo calcular la disponibilidad.";
      }
    }
  }

  return (
    <>
      <Link href="/admin/bookings" className="text-sm font-medium text-navy hover:underline">← Volver a reservas</Link>
      <PageHeader
        title={`${b.meetingType.eventTitle} | ${b.participant.fullName}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <BookingStatusBadge status={b.status} />
            <span className="font-mono text-xs">{b.reference}</span>
          </span>
        }
      />
      {sp.rescheduled && <Alert tone="success" className="mb-4">Reserva reprogramada. El participante recibió la actualización del evento.</Alert>}
      {b.calendarSyncState === "FAILED" && (
        <Alert tone="danger" className="mb-4" title="Error de sincronización con Google Calendar">{b.calendarSyncError}</Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-2 text-lg font-semibold">Reunión</h2>
            <dl className="divide-y divide-line">
              <Row label="Modalidad">{b.meetingType.name}</Row>
              <Row label="Fecha">{fmtDateTime(b.startAt, tz, "cccc d 'de' LLLL 'de' yyyy")}</Row>
              <Row label={`Horario (${tz})`}>{fmtTime(b.startAt, tz)} – {fmtTime(b.endAt, tz)} · {b.meetingType.durationMinutes} min</Row>
              <Row label="Zona del participante">
                {b.participantTimezone} ({fmtTime(b.startAt, b.participantTimezone)})
              </Row>
              <Row label="Evento de Google">
                {b.googleEventId ? <span className="font-mono text-xs">{b.googleEventId}</span> : "—"}
              </Row>
              <Row label="Videollamada">
                {b.meetingUrl ? <a href={b.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-navy underline">{b.meetingUrl}</a> : "—"}
              </Row>
              <Row label="Creada">{fmtDateTime(b.createdAt, tz)}</Row>
              {b.confirmedAt && <Row label="Confirmada">{fmtDateTime(b.confirmedAt, tz)}</Row>}
              {b.cancelledAt && <Row label="Cancelada">{fmtDateTime(b.cancelledAt, tz)}{b.cancelReason ? ` · ${b.cancelReason}` : ""}</Row>}
              {b.rescheduledFrom && (
                <Row label="Reprogramada desde">
                  <Link className="text-navy underline" href={`/admin/bookings/${b.rescheduledFrom.id}`}>
                    {b.rescheduledFrom.reference} · {fmtDateTime(b.rescheduledFrom.startAt, tz)}
                  </Link>
                </Row>
              )}
              {b.rescheduledTo && (
                <Row label="Reprogramada a">
                  <Link className="text-navy underline" href={`/admin/bookings/${b.rescheduledTo.id}`}>
                    {b.rescheduledTo.reference} · {fmtDateTime(b.rescheduledTo.startAt, tz)}
                  </Link>
                </Row>
              )}
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="mb-2 text-lg font-semibold">Participante</h2>
            <dl className="divide-y divide-line">
              <Row label="Nombre completo">{b.participant.fullName}</Row>
              <Row label="Correo"><a className="text-navy underline" href={`mailto:${b.participant.email}`}>{b.participant.email}</a></Row>
              <Row label="Teléfono"><a className="text-navy underline" href={`tel:${b.participant.phone.replace(/[^\d+]/g, "")}`}>{b.participant.phone}</a></Row>
              {b.formattedAnswers.map((a) => (
                <Row key={a.key} label={a.label}><span className="whitespace-pre-wrap font-normal">{a.value}</span></Row>
              ))}
            </dl>
          </Card>

          {b.payments.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 text-lg font-semibold">Pagos</h2>
              <ul className="divide-y divide-line text-sm">
                {b.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span className="font-medium">{formatMoney(p.amount, p.currency)}</span>
                    <Badge tone={p.status === "PAID" ? "success" : p.status === "REFUNDED" ? "info" : p.status === "PENDING" ? "gold" : "neutral"}>
                      {PAYMENT_STATUS_LABEL[p.status]}
                    </Badge>
                    <span className="font-mono text-xs text-navy-deep/60">{p.stripeCheckoutSessionId ?? "—"}</span>
                    {p.failureReason && <span className="w-full text-xs text-guinda">{p.failureReason}</span>}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold">Registro de sincronización</h2>
            {b.syncLogs.length === 0 ? (
              <p className="text-sm text-navy-deep/60">Sin operaciones registradas.</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {b.syncLogs.map((l) => (
                  <li key={l.id} className="flex flex-wrap gap-2">
                    <span className="text-navy-deep/60">{fmtDateTime(l.createdAt, tz, "dd/MM HH:mm:ss")}</span>
                    <span className="font-mono">{l.provider} · {l.operation}</span>
                    <Badge tone={l.status === "SUCCESS" ? "success" : "danger"}>{l.status === "SUCCESS" ? "OK" : "Error"}</Badge>
                    {l.message && <span className="text-guinda">{l.message}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="space-y-4">
          {active ? (
            <>
              {b.status === "CONFIRMED" && (
                <Card id="reprogramar" className="space-y-4 p-5">
                  <h2 className="text-lg font-semibold">Reprogramar</h2>
                  <RescheduleDatePicker defaultDate={date} minDate={DateTime.now().setZone(tz).toISODate()!} />
                  {slotsError && <Alert tone="danger">{slotsError}</Alert>}
                  {date && !slotsError && <RescheduleSlotsForm bookingId={b.id} slots={slots} />}
                </Card>
              )}
              <Card className="p-5">
                <h2 className="mb-3 text-lg font-semibold">Cancelar</h2>
                <CancelBookingForm bookingId={b.id} canRefund={paid} />
              </Card>
            </>
          ) : (
            <Card className="p-5 text-sm text-navy-deep/70">Esta reserva no está activa; no admite acciones.</Card>
          )}
        </aside>
      </div>
    </>
  );
}
