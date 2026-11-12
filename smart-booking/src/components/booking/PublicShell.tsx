import Link from "next/link";

/** Marca: isotipo "R" en tarjeta marino + wordmark REVOREDO (marino) / IUSCORP (guinda). */
export function BrandMark({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-[10px] font-display text-[17px] italic ${
          inverted ? "bg-white text-navy-deep" : "bg-navy-deep text-white"
        }`}
        aria-hidden="true"
      >
        R
      </span>
      <span className="flex flex-col leading-none">
        <span className={`text-[12px] font-bold tracking-[0.2em] ${inverted ? "text-white" : "text-navy-deep"}`}>REVOREDO</span>
        <span className={`mt-[3px] text-[9px] font-bold tracking-[0.34em] ${inverted ? "text-guinda-tint" : "text-guinda"}`}>IUSCORP</span>
      </span>
    </span>
  );
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="glass sticky top-0 z-40 border-b border-line pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="press" aria-label="Revoredo IusCorp — inicio">
            <BrandMark />
          </Link>
          <span className="hidden text-[13px] text-navy-deep/55 sm:block">
            El mundo <em className="font-display text-[14px] text-navy-deep">jurídico</em> en un solo lugar.
          </span>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-10">
        {children}
      </main>
      <footer className="pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 text-center text-[12px] text-navy-deep/45">
        Disponibilidad sincronizada en tiempo real · Tus datos se tratan de forma confidencial
      </footer>
    </div>
  );
}
