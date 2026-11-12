import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { destroySession, requireAdmin } from "@/server/auth/session";
import { fakeCalendarsEnabled } from "@/server/env";
import { audit } from "@/server/audit";
import { Sidebar } from "@/components/admin/Sidebar";
import { Alert } from "@/components/ui/Card";

export const metadata: Metadata = { title: { default: "Panel", template: "%s · Panel" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

async function logout() {
  "use server";
  const admin = await requireAdmin();
  await audit(admin.id, "admin.logout", "AdminUser", admin.id);
  await destroySession();
  redirect("/admin/login");
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [settings, integrations, pendingAlerts] = await Promise.all([
    prisma.appSettings.findUnique({ where: { id: 1 } }),
    prisma.calendarIntegration.findMany({ select: { provider: true, status: true } }),
    prisma.booking.count({ where: { status: "PENDING", expiresAt: null } }),
  ]);
  const fake = fakeCalendarsEnabled();
  const google = integrations.find((i) => i.provider === "GOOGLE");
  const errored = integrations.filter((i) => i.status === "ERROR");

  return (
    <div className="min-h-dvh bg-paper">
      <Sidebar adminName={admin.name} logout={logout} />
      <div className="lg:pl-64">
        <div className="mx-auto max-w-6xl space-y-3 px-4 pt-6 sm:px-6 lg:px-8">
          {fake && (
            <Alert tone="info" title="Modo desarrollo">
              Calendarios simulados activos (DEV_FAKE_CALENDARS). Ningún evento real se crea.
            </Alert>
          )}
          {!settings?.onboardingCompleted && (
            <Alert tone="warning" title="Configuración inicial incompleta">
              <Link href="/admin/setup" className="font-semibold underline">Completa el onboarding</Link> para dejar listas tus páginas de reserva.
            </Alert>
          )}
          {!fake && google?.status !== "CONNECTED" && google?.status !== "ERROR" && (
            <Alert tone="danger" title="Google Calendar no está conectado">
              Mientras no esté conectado no se mostrarán horarios ni se podrán confirmar reservas.{" "}
              <Link href="/admin/integrations" className="font-semibold underline">Conectar ahora</Link>
            </Alert>
          )}
          {errored.length > 0 && (
            <Alert tone="danger" title="Una integración requiere atención">
              {errored.map((e) => (e.provider === "GOOGLE" ? "Google Calendar" : "Microsoft Calendar")).join(" y ")} presenta errores.{" "}
              <Link href="/admin/integrations" className="font-semibold underline">Revisar</Link>
            </Alert>
          )}
          {pendingAlerts > 0 && (
            <Alert tone="warning" title="Reservas pagadas pendientes de registro en Google Calendar">
              {pendingAlerts} reserva(s) con pago recibido aún no se registraron en el calendario; se reintenta automáticamente.{" "}
              <Link href="/admin/bookings?status=PENDING" className="font-semibold underline">Ver reservas</Link>
            </Alert>
          )}
        </div>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
