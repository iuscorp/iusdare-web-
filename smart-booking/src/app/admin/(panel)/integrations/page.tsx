import type { Metadata } from "next";
import { getIntegrationsOverview } from "@/server/admin/queries";
import { scheduleTimezone } from "@/server/admin/settings";
import { env, googleConfigured, microsoftConfigured, stripeConfigured, fakeCalendarsEnabled } from "@/server/env";
import { listGoogleCalendars } from "@/server/calendars/google";
import { listMicrosoftCalendars } from "@/server/calendars/microsoft";
import { Alert, Badge, Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/admin/PageHeader";
import { IntegrationStatusBadge } from "@/components/admin/IntegrationStatusBadge";
import { CalendarSelection } from "@/components/admin/CalendarSelection";
import { CopyButton } from "@/components/admin/CopyButton";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { fmtDateTime, fmtRelative } from "@/components/admin/format";
import { disconnectIntegrationAction } from "../actions";

export const metadata: Metadata = { title: "Integraciones" };

type Cal = { id: string; summary: string; primary: boolean };

async function safeList(fn: () => Promise<Cal[]>): Promise<Cal[] | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const sp = await searchParams;
  const [overview, tz] = await Promise.all([getIntegrationsOverview(), scheduleTimezone()]);
  const fake = fakeCalendarsEnabled();
  const [googleCals, msCals] = await Promise.all([
    !fake && overview.google.status === "CONNECTED" ? safeList(listGoogleCalendars) : Promise.resolve(null),
    !fake && overview.microsoft.status === "CONNECTED" ? safeList(listMicrosoftCalendars) : Promise.resolve(null),
  ]);
  const base = env().APP_URL.replace(/\/$/, "");

  const providers = [
    {
      key: "google" as const,
      provider: "GOOGLE" as const,
      name: "Google Calendar",
      role: "Calendario principal · destino de todas las reservas y fuente de ocupados.",
      data: overview.google,
      configured: googleConfigured(),
      envHint: "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET",
      redirect: `${base}/api/oauth/google/callback`,
      calendars: googleCals,
    },
    {
      key: "microsoft" as const,
      provider: "MICROSOFT" as const,
      name: "Microsoft Calendar (Outlook)",
      role: "Solo lectura · sus eventos ocupados bloquean horarios. Nunca se crean eventos aquí.",
      data: overview.microsoft,
      configured: microsoftConfigured(),
      envHint: "MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET",
      redirect: `${base}/api/oauth/microsoft/callback`,
      calendars: msCals,
    },
  ];

  return (
    <>
      <PageHeader title="Integraciones" description="Conexiones OAuth con calendarios y estado de pagos." />
      {sp.connected && <Alert tone="success" className="mb-4">Cuenta de {sp.connected === "google" ? "Google" : "Microsoft"} conectada correctamente.</Alert>}
      {sp.error && <Alert tone="danger" className="mb-4" title="No se pudo conectar">{sp.error.slice(0, 300)}</Alert>}
      {fake && <Alert tone="info" className="mb-4">Modo desarrollo: se usan calendarios simulados; las conexiones reales se ignoran.</Alert>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {providers.map((p) => (
          <Card key={p.key} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{p.name}</h2>
                <p className="mt-0.5 text-sm text-navy-deep/60">{p.role}</p>
              </div>
              <IntegrationStatusBadge status={p.data.status} />
            </div>
            <dl className="mt-4 space-y-1.5 text-sm">
              <div className="flex gap-2"><dt className="text-navy-deep/60">Cuenta:</dt><dd className="font-medium">{p.data.accountEmail ?? "—"}</dd></div>
              <div className="flex gap-2"><dt className="text-navy-deep/60">Última sincronización:</dt><dd>{fmtRelative(p.data.lastSyncAt)}</dd></div>
              {p.data.connectedAt && <div className="flex gap-2"><dt className="text-navy-deep/60">Conectada:</dt><dd>{fmtDateTime(p.data.connectedAt, tz)}</dd></div>}
            </dl>
            {p.data.lastError && <Alert tone="danger" className="mt-3">{p.data.lastError}</Alert>}
            {!p.configured && (
              <Alert tone="warning" className="mt-3" title="Credenciales OAuth no configuradas">
                Define {p.envHint} y registra esta URI de redirección:
                <span className="mt-1 flex items-center gap-2"><code className="break-all text-xs">{p.redirect}</code><CopyButton value={p.redirect} /></span>
              </Alert>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {p.configured && (
                <a
                  href={`/api/oauth/${p.key}/start`}
                  className="inline-flex h-9 items-center rounded-lg bg-navy-deep px-3 text-sm font-semibold text-white hover:bg-navy"
                >
                  {p.data.status === "DISCONNECTED" ? "Conectar" : "Reconectar"}
                </a>
              )}
              {p.data.status !== "DISCONNECTED" && (
                <form action={disconnectIntegrationAction.bind(null, p.provider)}>
                  <SubmitButton variant="outline" size="sm" pendingText="Desconectando…">Desconectar</SubmitButton>
                </form>
              )}
            </div>
            {p.data.status === "CONNECTED" && !fake && (
              <div className="mt-5 border-t border-line pt-4">
                {p.calendars ? (
                  <CalendarSelection
                    provider={p.provider}
                    calendars={p.calendars}
                    selected={p.data.busyCalendarIds}
                    target={p.data.targetCalendarId}
                  />
                ) : (
                  <p className="text-sm text-navy-deep/60">No se pudo obtener la lista de calendarios en este momento.</p>
                )}
              </div>
            )}
          </Card>
        ))}

        <Card className="p-5 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Stripe</h2>
              <p className="mt-0.5 text-sm text-navy-deep/60">Cobro de asesorías mediante Stripe Checkout.</p>
            </div>
            {stripeConfigured() ? <Badge tone="success">Configurado</Badge> : <Badge tone="neutral">No configurado</Badge>}
          </div>
          <div className="mt-3 text-sm">
            <p className="text-navy-deep/70">URL del webhook (eventos: checkout.session.completed, checkout.session.expired, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, charge.refunded):</p>
            <p className="mt-1 flex flex-wrap items-center gap-2">
              <code className="break-all rounded bg-navy-50 px-2 py-1 text-xs">{base}/api/webhooks/stripe</code>
              <CopyButton value={`${base}/api/webhooks/stripe`} />
            </p>
            {!stripeConfigured() && <p className="mt-2 text-xs text-guinda">Faltan STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET en el servidor.</p>}
          </div>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <h2 className="border-b border-line px-5 py-4 text-lg font-semibold">Registro de sincronización reciente</h2>
        {overview.logs.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-navy-deep/60">Sin operaciones registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-navy-50 text-xs uppercase tracking-wide text-navy-deep/70">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Fecha</th>
                  <th className="px-4 py-2.5 font-semibold">Proveedor</th>
                  <th className="px-4 py-2.5 font-semibold">Operación</th>
                  <th className="px-4 py-2.5 font-semibold">Resultado</th>
                  <th className="px-4 py-2.5 font-semibold">Duración</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {overview.logs.map((l) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap px-4 py-2">{fmtDateTime(l.createdAt, tz, "dd/MM HH:mm:ss")}</td>
                    <td className="px-4 py-2">{l.provider}</td>
                    <td className="px-4 py-2 font-mono text-xs">{l.operation}</td>
                    <td className="px-4 py-2">
                      <Badge tone={l.status === "SUCCESS" ? "success" : "danger"}>{l.status === "SUCCESS" ? "OK" : "Error"}</Badge>
                      {l.message && <span className="ml-2 text-xs text-guinda">{l.message}</span>}
                    </td>
                    <td className="px-4 py-2 text-xs">{l.durationMs != null ? `${l.durationMs} ms` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
