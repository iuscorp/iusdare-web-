import Link from "next/link";
import { PublicShell } from "@/components/booking/PublicShell";

export default function NotFound() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="eyebrow text-gold-dark">Error 404</p>
        <h1 className="mt-3 font-display text-2xl font-semibold text-navy-deep">Página no encontrada</h1>
        <p className="mt-3 text-sm text-navy-deep/70">El enlace que seguiste no existe o ya no está disponible.</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-lg bg-navy-deep px-5 font-display text-[15px] font-semibold text-white hover:bg-navy"
        >
          Ver tipos de reunión
        </Link>
      </div>
    </PublicShell>
  );
}
