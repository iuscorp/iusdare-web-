import Link from "next/link";
import { PublicShell } from "@/components/booking/PublicShell";
import { listPublicMeetingTypes } from "@/server/public/meeting-types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const types = await listPublicMeetingTypes();
  return (
    <PublicShell>
      <section className="mx-auto max-w-3xl text-center">
        <p className="eyebrow text-gold-dark">Agenda en línea</p>
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-navy-deep sm:text-4xl">
          ¿Qué tipo de reunión deseas agendar?
        </h1>
        <p className="mt-3 text-[15px] text-navy-deep/70">
          Elige una modalidad, selecciona un horario disponible y recibe la invitación en tu correo.
        </p>
      </section>

      <ul className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-3">
        {types.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/booking/${t.slug}`}
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
            >
              <span className="absolute inset-x-0 top-0 h-1" style={{ background: t.accentColor }} aria-hidden="true" />
              <div className="flex items-center gap-2">
                <span className="eyebrow text-[10px] text-navy-deep/55">{t.durationMinutes} min</span>
                {t.requiresPayment && (
                  <span className="rounded-full bg-gold-50 px-2 py-0.5 text-[11px] font-medium text-gold-dark ring-1 ring-inset ring-gold/30">
                    {t.priceLabel ? `Pago · ${t.priceLabel}` : "Pago"}
                  </span>
                )}
              </div>
              <h2 className="mt-3 font-display text-lg font-semibold leading-snug text-navy-deep">{t.name}</h2>
              <p className="mt-2 line-clamp-4 flex-1 text-sm leading-relaxed text-navy-deep/70">{t.description}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 font-display text-sm font-semibold text-navy">
                Ver horarios
                <span className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                  →
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {types.length === 0 && (
        <p className="mt-10 text-center text-sm text-navy-deep/60">No hay tipos de reunión disponibles por el momento.</p>
      )}
    </PublicShell>
  );
}
