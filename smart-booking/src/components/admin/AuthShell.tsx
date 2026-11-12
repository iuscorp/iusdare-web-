import type { ReactNode } from "react";
import { BrandMark } from "@/components/booking/PublicShell";

/** Contenedor de las pantallas de acceso (login / onboarding). */
export function AuthShell({ title, subtitle, children, wide }: { title: string; subtitle?: string; children: ReactNode; wide?: boolean }) {
  return (
    <main className="flex min-h-dvh items-start justify-center bg-ink px-4 py-10 sm:items-center">
      <div className={wide ? "w-full max-w-2xl" : "w-full max-w-md"}>
        <div className="mb-6 text-center">
          <div className="inline-flex"><BrandMark inverted /></div>
          <p className="eyebrow mt-3 text-white/45">Agenda · Panel privado</p>
        </div>
        <div className="animate-sheet-in rounded-[28px] bg-white p-6 shadow-lift sm:p-8">
          <h1 className="text-[28px] leading-tight text-navy-deep">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-navy-deep/70">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
