import { cn } from "@/lib/cn";

export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <nav aria-label="Progreso de la reserva">
      <ol className="flex items-center gap-1.5 sm:gap-2">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={label} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2" aria-current={active ? "step" : undefined}>
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-medium transition-colors",
                  done && "bg-gold text-ink",
                  active && "bg-navy-deep text-white",
                  !done && !active && "bg-navy-100 text-navy-deep/60",
                )}
              >
                {done ? (
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                    <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cn(
                  "truncate text-xs font-medium",
                  active ? "text-navy-deep" : "text-navy-deep/55",
                  !active && "hidden sm:inline",
                )}
              >
                {label}
                <span className="sr-only">{done ? " (completado)" : active ? " (paso actual)" : ""}</span>
              </span>
              {i < steps.length - 1 && <span className="h-px min-w-3 flex-1 bg-line" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
