import { cn } from "@/lib/cn";

/** Progreso estilo iOS: barra segmentada fluida + etiqueta del paso actual. */
export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <nav aria-label="Progreso de la reserva">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow text-navy-deep/45">
          Paso {Math.min(current + 1, steps.length)} de {steps.length}
        </p>
        <p className="text-[13px] font-semibold text-navy-deep">{steps[current]}</p>
      </div>
      <ol className="mt-2.5 flex gap-1.5">
        {steps.map((label, i) => (
          <li key={label} className="h-1 flex-1 overflow-hidden rounded-full bg-navy-100" aria-current={i === current ? "step" : undefined}>
            <span
              className={cn(
                "block h-full rounded-full transition-[width,background-color] duration-500 ease-ios",
                i < current ? "w-full bg-navy-deep" : i === current ? "w-1/2 bg-guinda" : "w-0",
              )}
            />
            <span className="sr-only">
              {label}
              {i < current ? " (completado)" : i === current ? " (paso actual)" : ""}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
