import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { adminExists, requireAdmin } from "@/server/auth/session";
import { googleConfigured, microsoftConfigured, stripeConfigured } from "@/server/env";
import { getIntegrationsOverview } from "@/server/admin/queries";
import { AuthShell } from "@/components/admin/AuthShell";
import { IntegrationStatusBadge } from "@/components/admin/IntegrationStatusBadge";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Alert } from "@/components/ui/Card";
import { FirstAdminForm, OnboardingForm } from "./SetupForms";
import { finishOnboardingAction } from "./actions";

export const metadata: Metadata = { title: "Configuración inicial", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (!(await adminExists())) {
    return (
      <AuthShell title="Configuración inicial" subtitle="Paso 1 de 2 · Crea la cuenta de administración del panel.">
        <FirstAdminForm />
      </AuthShell>
    );
  }
  await requireAdmin();
  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
  if (settings?.onboardingCompleted) redirect("/admin");

  const [asesoria, integrations] = await Promise.all([
    prisma.meetingType.findUnique({ where: { slug: "asesoria" } }),
    getIntegrationsOverview(),
  ]);
  const price =
    asesoria?.priceAmount != null && asesoria.currency
      ? { amount: (asesoria.priceAmount / 100).toFixed(2), currency: asesoria.currency.toUpperCase() }
      : null;
  const env = { google: googleConfigured(), microsoft: microsoftConfigured(), stripe: stripeConfigured() };

  return (
    <AuthShell wide title="Configuración inicial" subtitle="Paso 2 de 2 · Ajusta tu agenda y conecta tus calendarios.">
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Datos generales y precio</h2>
          <OnboardingForm ownerName={settings?.ownerName ?? ""} timezone={settings?.timezone ?? "America/Lima"} price={price} />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Calendarios</h2>
          <ul className="space-y-3">
            {[
              { key: "google", label: "Google Calendar", hint: "Calendario principal: aquí se crean todas las reservas.", data: integrations.google, ok: env.google },
              { key: "microsoft", label: "Microsoft Calendar", hint: "Solo lectura: sus eventos ocupados bloquean horarios.", data: integrations.microsoft, ok: env.microsoft },
            ].map((p) => (
              <li key={p.key} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4">
                <div>
                  <p className="flex items-center gap-2 font-medium">
                    {p.label} <IntegrationStatusBadge status={p.data.status} />
                  </p>
                  <p className="text-xs text-navy-deep/60">{p.data.accountEmail ?? p.hint}</p>
                  {!p.ok && (
                    <p className="mt-1 text-xs font-medium text-guinda">
                      Faltan credenciales OAuth en el servidor ({p.key === "google" ? "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET" : "MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET"}).
                    </p>
                  )}
                </div>
                {p.ok && (
                  <a
                    href={`/api/oauth/${p.key}/start`}
                    className="inline-flex h-9 items-center rounded-lg border border-navy-deep/25 px-3 text-sm font-semibold hover:bg-navy-50"
                  >
                    {p.data.status === "DISCONNECTED" ? "Conectar" : "Reconectar"}
                  </a>
                )}
              </li>
            ))}
          </ul>
          {!env.stripe && (
            <Alert tone="warning" className="mt-3">
              Stripe no está configurado (STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET). Las asesorías no podrán cobrarse hasta configurarlo.
            </Alert>
          )}
        </section>

        <form action={finishOnboardingAction} className="flex flex-col items-start gap-2 border-t border-line pt-6">
          {!price && <p className="text-xs text-navy-deep/60">Aún no configuraste el precio de la asesoría; podrás hacerlo después.</p>}
          <SubmitButton variant="gold" pendingText="Finalizando…">
            Finalizar e ir al panel
          </SubmitButton>
        </form>
      </div>
    </AuthShell>
  );
}
