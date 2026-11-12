"use client";
import { useState } from "react";

export function CopyButton({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* portapapeles no disponible */
        }
      }}
      className="inline-flex h-8 items-center rounded-md border border-navy-deep/20 px-2.5 text-xs font-semibold text-navy-deep hover:bg-navy-50"
      aria-live="polite"
    >
      {copied ? "¡Copiado!" : label}
    </button>
  );
}
