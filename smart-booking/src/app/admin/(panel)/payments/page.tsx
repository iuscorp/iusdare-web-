import type { Metadata } from "next";
import Link from "next/link";
import { listPayments } from "@/server/admin/queries";
import { scheduleTimezone } from "@/server/admin/settings";
import { stripeConfigured } from "@/server/env";
import { formatMoney } from "@/lib/format";
import { PAYMENT_STATUS_LABEL } from "@/lib/status";
import { Alert, Badge, Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/admin/PageHeader";
import { BookingStatusBadge } from "@/components/admin/BookingStatusBadge";
import { fmtDateTime } from "@/components/admin/format";

export const metadata: Metadata = { title: "Pagos" };

const TONE = { PAID: "success", PENDING: "gold", REFUNDED: "info", FAILED: "danger", EXPIRED: "neutral" } as const;

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [result, tz] = await Promise.all([listPayments(page), scheduleTimezone()]);

  return (
    <>
      <PageHeader title="Pagos" description="Pagos de asesorías procesados con Stripe Checkout." />
      {!stripeConfigured() && (
        <Alert tone="warning" className="mb-4" title="Stripe no está configurado">
          Define STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET en el servidor. Ver Integraciones.
        </Alert>
      )}
      <Card className="overflow-hidden">
        {result.items.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-navy-deep/60">Aún no hay pagos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-navy-50 text-xs uppercase tracking-wide text-navy-deep/70">
                <tr>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Participante</th>
                  <th className="px-4 py-3 font-semibold">Monto</th>
                  <th className="px-4 py-3 font-semibold">Pago</th>
                  <th className="px-4 py-3 font-semibold">Reserva</th>
                  <th className="px-4 py-3 font-semibold">Sesión de Stripe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.items.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap px-4 py-3">
                      {fmtDateTime(p.createdAt, tz, "dd/MM/yyyy HH:mm")}
                      {p.paidAt && <span className="block text-xs text-navy-deep/60">Pagado {fmtDateTime(p.paidAt, tz, "dd/MM HH:mm")}</span>}
                    </td>
                    <td className="px-4 py-3">{p.booking.participant.fullName}</td>
                    <td className="px-4 py-3 font-medium">{formatMoney(p.amount, p.currency)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={TONE[p.status]}>{PAYMENT_STATUS_LABEL[p.status]}</Badge>
                      {p.failureReason && <span className="block text-xs text-guinda">{p.failureReason}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/bookings/${p.bookingId}`} className="font-mono text-xs text-navy hover:underline">
                        {p.booking.reference}
                      </Link>
                      <span className="mt-1 block"><BookingStatusBadge status={p.booking.status} /></span>
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3 font-mono text-xs text-navy-deep/60" title={p.stripeCheckoutSessionId ?? ""}>
                      {p.stripeCheckoutSessionId ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {result.pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Paginación">
          {result.page > 1 ? <Link className="font-medium text-navy hover:underline" href={`?page=${result.page - 1}`}>← Anterior</Link> : <span />}
          <span className="text-navy-deep/60">Página {result.page} de {result.pages}</span>
          {result.page < result.pages ? <Link className="font-medium text-navy hover:underline" href={`?page=${result.page + 1}`}>Siguiente →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
