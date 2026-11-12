"use client";

import { Button } from "@/components/ui/Button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper px-4">
      <div className="max-w-md text-center" role="alert">
        <p className="eyebrow text-gold-dark">Algo salió mal</p>
        <h1 className="mt-3 font-display text-2xl font-semibold text-navy-deep">Ocurrió un error inesperado</h1>
        <p className="mt-3 text-sm text-navy-deep/70">Inténtalo nuevamente en unos segundos.</p>
        <Button className="mt-6" onClick={reset}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}
