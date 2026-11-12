import type { ReactNode } from "react";

/** Contenedor de las pantallas de acceso (login / onboarding). */
export function AuthShell({ title, subtitle, children, wide }: { title: string; subtitle?: string; children: ReactNode; wide?: boolean }) {
  return (
    <main className="flex min-h-dvh items-start justify-center bg-ink px-4 py-10 sm:items-center">
      <div className={wide ? "w-full max-w-2xl" : "w-full max-w-md"}>
        <div className="mb-6 text-center">
          <p className="font-display text-lg font-bold tracking-[0.16em] text-white">IUS DARE</p>
          <p className="eyebrow mt-1 text-gold-light">Smart Booking · Panel</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-lift sm:p-8">
          <h1 className="text-2xl font-semibold text-navy-deep">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-navy-deep/70">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
