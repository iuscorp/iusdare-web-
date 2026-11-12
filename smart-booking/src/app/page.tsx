import Link from "next/link";
import { PublicShell } from "@/components/booking/PublicShell";
import { listPublicMeetingTypes } from "@/server/public/meeting-types";

export const dynamic = "force-dynamic";

const ICONS: Record<string, string> = {
  "vocare-iuris": "M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M4 7h16a1 1 0 0 1 1 1v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a1 1 0 0 1 1-1Z",
  "cafecito-virtual": "M5 8h11v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8Zm11 1h1.5a2.5 2.5 0 0 1 0 5H16M8 3v2m3-2v2m3-2v2",
  asesoria: "M12 3 4 7v5c0 4.4 3.4 8.3 8 9 4.6-.7 8-4.6 8-9V7l-8-4Zm-3 9 2 2 4-4",
};

export default async function HomePage() {
  const types = await listPublicMeetingTypes();
  return (
    <PublicShell>
      <section className="mx-auto max-w-2xl animate-fade-up">
        <p className="eyebrow text-guinda">Agenda en línea</p>
        <h1 className="mt-3 text-[40px] leading-[1.02] text-navy-deep sm:text-[56px]">
          Conversemos, <em className="text-guinda">a tu ritmo.</em>
        </h1>
        <span className="rule mt-5" aria-hidden="true" />
        <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-navy-deep/65">
          Elige una modalidad, selecciona un horario realmente disponible y recibe la invitación en tu correo.
        </p>
      </section>

      <ul className="grouped mx-auto mt-10 max-w-2xl animate-sheet-in [animation-delay:80ms]">
        {types.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/booking/${t.slug}`}
              className="group flex items-center gap-4 px-5 py-5 transition-colors duration-200 ease-ios hover:bg-navy-50/70 active:bg-navy-100 sm:px-6"
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-white shadow-[0_6px_14px_-8px_rgba(16,36,56,.7)]"
                style={{ background: t.accentColor }}
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d={ICONS[t.slug] ?? ICONS["cafecito-virtual"]} />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[19px] leading-snug text-navy-deep">{t.name}</span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-navy-deep/55">
                  <span>{t.durationMinutes} min</span>
                  <span aria-hidden="true">·</span>
                  <span>{t.requiresPayment ? (t.priceLabel ?? "Con pago") : "Sin costo"}</span>
                  {t.requiresPayment && (
                    <span className="rounded-full bg-guinda-soft px-2 py-0.5 text-[11px] font-semibold text-guinda">Pago seguro</span>
                  )}
                </span>
                <span className="mt-1.5 line-clamp-2 block text-[14px] leading-relaxed text-navy-deep/60">{t.description}</span>
              </span>
              <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-navy-deep/25 transition-transform duration-300 ease-ios group-hover:translate-x-0.5" aria-hidden="true">
                <path d="m7.5 4.5 5.5 5.5-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
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
