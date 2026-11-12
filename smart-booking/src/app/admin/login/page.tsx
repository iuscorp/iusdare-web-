import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminExists, getCurrentAdmin } from "@/server/auth/session";
import { AuthShell } from "@/components/admin/AuthShell";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Acceso al panel", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (!(await adminExists())) redirect("/admin/setup");
  if (await getCurrentAdmin()) redirect("/admin");
  return (
    <AuthShell title="Acceso al panel" subtitle="Administra tus reservas, disponibilidad e integraciones.">
      <LoginForm />
    </AuthShell>
  );
}
