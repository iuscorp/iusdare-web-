import type { Metadata } from "next";
import Link from "next/link";
import { getDashboardStats } from "@/server/admin/queries";
import { scheduleTimezone } from "@/server/admin/settings";
import { formatMoney } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/admin/PageHeader";
import { fmtDateTime } from "@/components/admin/format";

export const metadata: Metadata = { title: "Resumen" };

function Kpi({ label, value, accent, hint }: { label: string; value: React.ReactNode; accent?: string; hint?: string }) {
  return (
    <Card className="relative overflow-hidden p-5">
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent ?? "#C08128" }} aria-hidden="true" />
      <p className="eyebrow text-navy-deep/60">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-navy-deep">{value}</p>
      {hint && <p className="mt-1 text-xs text-navy-deep/60">{hint}</p>}
    </Card>
  );
}

export default async function DashboardPage() {
  const [stats, tz] = await Promise.all([getDashboardStats(), scheduleTimezone()]);
  const count = (slug: string) => stats.perType.find((t) => t.slug === slug);
  const v = count("vocare-iuris");
  const c = count("cafecito-virtual");
  const a = count("asesoria");

  return (
    <>
      <PageHeader title="Resumen" description={`Reuniones confirmadas y actividad. Horarios en ${tz}.`} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi label="Total de reuniones agendadas" value={stats.totalConfirmed} accent="#102438" hint="Reservas confirmadas" />
        <Kpi label="Entrevistas Vocare Iuris" value={v?.count ?? 0} accent={v?.accentColor} />
        <Kpi label="Cafecitos virtuales" value={c?.count ?? 0} accent={c?.accentColor} />
        <Kpi label="Asesorías" value={a?.count ?? 0} accent={a?.accentColor} />
        <Kpi
          label="Ingresos por asesorías"
          value={
            stats.revenue.length ? (
              <span className="flex flex-col text-2xl">
                {stats.revenue.map((r) => (
                  <span key={r.currency}>{formatMoney(r.amount, r.currency)}</span>
                ))}
              </span>
            ) : (
              formatMoney(0, "PEN")
            )
          }
          accent="#C08128"
          hint="Pagos confirmados por Stripe"
        />
        <Kpi label="Próximas reuniones" value={stats.upcomingCount} accent="#78A8BF" />
      </div>

      <Card className="mt-8">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold">Próximas reuniones</h2>
          <Link href="/admin/bookings?scope=upcoming" className="text-sm font-medium text-navy hover:underline">
            Ver todas
          </Link>
        </div>
        {stats.upcoming.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-navy-deep/60">No hay reuniones próximas.</p>
        ) : (
          <ul className="divide-y divide-line">
            {stats.upcoming.map((b) => (
              <li key={b.id}>
                <Link href={`/admin/bookings/${b.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-navy-50">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.meetingType.accentColor }} aria-hidden="true" />
                  <span className="min-w-[200px] font-medium">{fmtDateTime(b.startAt, tz)}</span>
                  <span className="flex-1 truncate">{b.participant.fullName}</span>
                  <span className="text-sm text-navy-deep/60">{b.meetingType.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
