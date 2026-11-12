import Link from "next/link";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="border-b border-white/10 bg-ink">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
          <Link href="/" className="flex flex-col leading-none" aria-label="Inicio — tipos de reunión">
            <span className="font-display text-[17px] font-bold tracking-[0.16em] text-white">AGENDA</span>
            <span className="mt-1 font-mono text-[9px] tracking-[0.3em] text-gold-light">RESERVA TU REUNIÓN</span>
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
      <footer className="border-t border-line py-6 text-center text-xs text-navy-deep/55">
        Horarios sincronizados en tiempo real · Tus datos se tratan de forma confidencial
      </footer>
    </div>
  );
}
