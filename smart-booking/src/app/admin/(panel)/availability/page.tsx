import type { Metadata } from "next";
import { DateTime } from "luxon";
import { prisma } from "@/server/db";
import { scheduleTimezone } from "@/server/admin/settings";
import { Badge, Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/admin/PageHeader";
import { WeeklyRulesEditor } from "@/components/admin/WeeklyRulesEditor";
import { ExceptionForm } from "@/components/admin/ExceptionForm";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { minutesToHHmm } from "@/components/admin/time";
import { deleteExceptionAction } from "../actions";

export const metadata: Metadata = { title: "Disponibilidad" };

function fmtDate(d: string, tz: string) {
  return DateTime.fromISO(d, { zone: tz }).setLocale("es").toFormat("ccc d LLL yyyy");
}

export default async function AvailabilityPage() {
  const tz = await scheduleTimezone();
  const today = DateTime.now().setZone(tz).toISODate()!;
  const [rules, exceptions] = await Promise.all([
    prisma.availabilityRule.findMany({ orderBy: [{ weekday: "asc" }, { startMinute: "asc" }] }),
    prisma.availabilityException.findMany({ where: { endDate: { gte: today } }, orderBy: { startDate: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Disponibilidad"
        description={
          <>
            Horario compartido por las tres modalidades, en <strong>{tz}</strong>. Los eventos ocupados de Google y Microsoft se excluyen automáticamente.
          </>
        }
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-5">
          <h2 className="mb-1 text-lg font-semibold">Disponibilidad semanal</h2>
          <p className="mb-3 text-sm text-navy-deep/60">Marca los días disponibles y sus rangos horarios.</p>
          <WeeklyRulesEditor initial={rules.map((r) => ({ weekday: r.weekday, startMinute: r.startMinute, endMinute: r.endMinute }))} />
        </Card>
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-1 text-lg font-semibold">Bloquear fechas / excepciones</h2>
            <p className="mb-4 text-sm text-navy-deep/60">Días no disponibles, bloqueos parciales u horarios especiales.</p>
            <ExceptionForm today={today} />
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold">Excepciones vigentes</h2>
            {exceptions.length === 0 ? (
              <p className="text-sm text-navy-deep/60">No hay excepciones programadas.</p>
            ) : (
              <ul className="divide-y divide-line">
                {exceptions.map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="text-sm">
                      <p className="font-medium">
                        {fmtDate(e.startDate, tz)}
                        {e.endDate !== e.startDate && ` → ${fmtDate(e.endDate, tz)}`}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-navy-deep/70">
                        <Badge tone={e.kind === "BLOCKED" ? "danger" : "info"}>{e.kind === "BLOCKED" ? "Bloqueo" : "Horario especial"}</Badge>
                        {e.startMinute != null && e.endMinute != null
                          ? `${minutesToHHmm(e.startMinute)} – ${minutesToHHmm(e.endMinute)}`
                          : "Todo el día"}
                        {e.reason && <span>· {e.reason}</span>}
                      </p>
                    </div>
                    <form action={deleteExceptionAction.bind(null, e.id)}>
                      <SubmitButton variant="ghost" size="sm" aria-label="Eliminar excepción">Eliminar</SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
