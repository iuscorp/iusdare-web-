import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/server/db";
import { env } from "@/server/env";
import { formatMoney } from "@/lib/format";
import { Badge, Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/admin/PageHeader";
import { CopyButton } from "@/components/admin/CopyButton";
import { AppSettingsForm, MeetingTypeForm, PriceForm } from "@/components/admin/SettingsForms";

export const metadata: Metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const [types, settings] = await Promise.all([
    prisma.meetingType.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.appSettings.findUnique({ where: { id: 1 } }),
  ]);
  const base = env().APP_URL.replace(/\/$/, "");

  return (
    <>
      <PageHeader title="Configuración" description="Precios, tipos de reunión y parámetros generales." />

      <Card className="mb-6 p-5">
        <h2 className="mb-3 text-lg font-semibold">Enlaces públicos</h2>
        <ul className="divide-y divide-line">
          {types.map((t) => {
            const url = `${base}/booking/${t.slug}`;
            return (
              <li key={t.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.accentColor }} aria-hidden="true" />
                <span className="min-w-[200px] font-medium">{t.name}</span>
                {!t.isActive && <Badge tone="neutral">Inactiva</Badge>}
                <Link href={`/booking/${t.slug}`} target="_blank" className="flex-1 break-all font-mono text-xs text-navy hover:underline">
                  {url}
                </Link>
                <CopyButton value={url} />
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="space-y-6">
        {types.map((t) => (
          <Card key={t.id} className="p-5">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold">{t.name}</h2>
              {t.requiresPayment && (
                <Badge tone={t.priceAmount != null ? "gold" : "danger"}>
                  {t.priceAmount != null && t.currency ? formatMoney(t.priceAmount, t.currency) : "Precio sin configurar"}
                </Badge>
              )}
            </div>
            {t.requiresPayment && (
              <div className="mb-5 rounded-xl border border-gold/30 bg-gold-50/50 p-4">
                <h3 className="mb-2 text-sm font-semibold">Precio de la sesión</h3>
                <PriceForm
                  slug={t.slug}
                  amount={t.priceAmount != null ? (t.priceAmount / 100).toFixed(2) : ""}
                  currency={t.currency?.toUpperCase() ?? ""}
                />
              </div>
            )}
            <MeetingTypeForm
              mt={{
                slug: t.slug,
                name: t.name,
                isActive: t.isActive,
                durationMinutes: t.durationMinutes,
                slotIntervalMinutes: t.slotIntervalMinutes,
                minNoticeMinutes: t.minNoticeMinutes,
                maxDaysAhead: t.maxDaysAhead,
                bufferBeforeMinutes: t.bufferBeforeMinutes,
                bufferAfterMinutes: t.bufferAfterMinutes,
                addVideoConference: t.addVideoConference,
              }}
            />
          </Card>
        ))}

        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold">General</h2>
          <AppSettingsForm
            timezone={settings?.timezone ?? "America/Lima"}
            holdMinutes={settings?.holdMinutes ?? 10}
            paymentHoldMinutes={settings?.paymentHoldMinutes ?? 30}
            ownerName={settings?.ownerName ?? ""}
          />
        </Card>
      </div>
    </>
  );
}
