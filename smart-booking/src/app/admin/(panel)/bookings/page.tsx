import type { Metadata } from "next";
import Link from "next/link";
import type { BookingStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { listBookings } from "@/server/admin/queries";
import { scheduleTimezone } from "@/server/admin/settings";
import { BOOKING_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/status";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { PageHeader } from "@/components/admin/PageHeader";
import { BookingStatusBadge } from "@/components/admin/BookingStatusBadge";
import { fmtDateTime, fmtTime } from "@/components/admin/format";

export const metadata: Metadata = { title: "Reservas" };

const STATUSES = Object.keys(BOOKING_STATUS_LABEL) as BookingStatus[];
type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function BookingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const type = one(sp.type) || undefined;
  const statusRaw = one(sp.status);
  const status = statusRaw && (STATUSES as string[]).includes(statusRaw) ? (statusRaw as BookingStatus) : "ALL";
  const scopeRaw = one(sp.scope);
  const scope = scopeRaw === "past" || scopeRaw === "all" ? scopeRaw : "upcoming";
  const q = (one(sp.q) ?? "").trim().slice(0, 100) || undefined;
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const [types, tz, result] = await Promise.all([
    prisma.meetingType.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
    scheduleTimezone(),
    listBookings({ type, status, scope, q, page }),
  ]);

  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (status !== "ALL") params.set("status", status);
    params.set("scope", scope);
    if (q) params.set("q", q);
    params.set("page", String(p));
    return `?${params}`;
  };

  return (
    <>
      <PageHeader title="Reservas" description={`${result.total} resultado(s). Horarios en ${tz}.`} />
      <form method="get" className="mb-4 grid grid-cols-1 gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.5fr_auto]">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Modalidad</span>
          <Select name="type" defaultValue={type ?? ""}>
            <option value="">Todas</option>
            {types.map((t) => (
              <option key={t.slug} value={t.slug}>{t.name}</option>
            ))}
          </Select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Estado</span>
          <Select name="status" defaultValue={status}>
            <option value="ALL">Todos</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{BOOKING_STATUS_LABEL[s]}</option>
            ))}
          </Select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Periodo</span>
          <Select name="scope" defaultValue={scope}>
            <option value="upcoming">Próximas</option>
            <option value="past">Historial (pasadas)</option>
            <option value="all">Todas</option>
          </Select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Buscar</span>
          <Input name="q" defaultValue={q ?? ""} placeholder="Nombre, correo o referencia" />
        </label>
        <div className="flex items-end">
          <button type="submit" className="h-11 w-full rounded-lg bg-navy-deep px-5 text-sm font-semibold text-white hover:bg-navy">
            Filtrar
          </button>
        </div>
      </form>

      <Card className="overflow-hidden">
        {result.items.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-navy-deep/60">No hay reservas con estos filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-navy-50 text-xs uppercase tracking-wide text-navy-deep/70">
                <tr>
                  <th className="px-4 py-3 font-semibold">Fecha y hora</th>
                  <th className="px-4 py-3 font-semibold">Participante</th>
                  <th className="px-4 py-3 font-semibold">Modalidad</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Pago</th>
                  <th className="px-4 py-3 font-semibold">Ref.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.items.map((b) => {
                  const pay = b.payments[0];
                  return (
                    <tr key={b.id} className="hover:bg-navy-50/60">
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link href={`/admin/bookings/${b.id}`} className="font-medium text-navy hover:underline">
                          {fmtDateTime(b.startAt, tz, "ccc d LLL yyyy")}
                        </Link>
                        <span className="block text-xs text-navy-deep/60">
                          {fmtTime(b.startAt, tz)} – {fmtTime(b.endAt, tz)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-medium">{b.participant.fullName}</span>
                        <span className="block text-xs text-navy-deep/60">{b.participant.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: b.meetingType.accentColor }} aria-hidden="true" />
                          {b.meetingType.name}
                        </span>
                      </td>
                      <td className="px-4 py-3"><BookingStatusBadge status={b.status} /></td>
                      <td className="px-4 py-3 text-xs">{pay ? PAYMENT_STATUS_LABEL[pay.status] : "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{b.reference}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {result.pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Paginación">
          {result.page > 1 ? <Link className="font-medium text-navy hover:underline" href={qs(result.page - 1)}>← Anterior</Link> : <span />}
          <span className="text-navy-deep/60">Página {result.page} de {result.pages}</span>
          {result.page < result.pages ? <Link className="font-medium text-navy hover:underline" href={qs(result.page + 1)}>Siguiente →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
