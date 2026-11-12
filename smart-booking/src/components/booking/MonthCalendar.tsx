"use client";

import { DateTime } from "luxon";
import { useMemo, useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

export function MonthCalendar({
  month,
  timezone,
  availableDates,
  selectedDate,
  loading,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  onSelect,
}: {
  month: DateTime; // inicio de mes en la zona elegida
  timezone: string;
  availableDates: Map<string, number>;
  selectedDate: string | null;
  loading: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (isoDate: string) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const today = DateTime.now().setZone(timezone).toISODate();

  const cells = useMemo(() => {
    const first = month.startOf("month");
    const lead = first.weekday - 1;
    const days = first.daysInMonth ?? 30;
    const out: (DateTime | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 0; d < days; d++) out.push(first.plus({ days: d }));
    while (out.length % 7) out.push(null);
    return out;
  }, [month]);

  const title = month.setLocale("es").toFormat("LLLL yyyy");

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const deltas: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const delta = deltas[e.key];
    if (delta === undefined) return;
    const target = e.target as HTMLElement;
    const idx = Number(target.dataset.idx);
    if (Number.isNaN(idx)) return;
    e.preventDefault();
    const buttons = gridRef.current?.querySelectorAll<HTMLButtonElement>("button[data-idx]");
    if (!buttons) return;
    let next = idx + delta;
    while (next >= 0 && next < cells.length) {
      const btn = Array.from(buttons).find((b) => Number(b.dataset.idx) === next);
      if (btn && !btn.disabled) {
        btn.focus();
        return;
      }
      next += delta > 0 ? 1 : -1;
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-[20px] text-navy-deep first-letter:uppercase" aria-live="polite">
          {title}
        </h3>
        <div className="flex gap-1">
          <NavBtn label="Mes anterior" disabled={!canGoPrev} onClick={onPrev} dir="prev" />
          <NavBtn label="Mes siguiente" disabled={!canGoNext} onClick={onNext} dir="next" />
        </div>
      </div>

      <div role="grid" aria-label={`Calendario de ${title}`} aria-busy={loading} ref={gridRef} onKeyDown={onKeyDown}>
        <div role="row" className="mb-1 grid grid-cols-7">
          {WEEKDAYS.map((w) => (
            <div key={w} role="columnheader" className="eyebrow py-1.5 text-center text-[10px] text-navy-deep/50">
              {w}
            </div>
          ))}
        </div>
        <div role="rowgroup" className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} role="gridcell" aria-hidden="true" />;
            const iso = d.toISODate()!;
            const count = availableDates.get(iso) ?? 0;
            const available = count > 0 && !loading;
            const selected = iso === selectedDate;
            const isToday = iso === today;
            return (
              <div key={iso} role="gridcell" aria-selected={selected}>
                <button
                  type="button"
                  data-idx={i}
                  disabled={!available}
                  onClick={() => onSelect(iso)}
                  aria-label={`${d.setLocale("es").toFormat("cccc d 'de' LLLL")}${available ? `, ${count} horarios disponibles` : ", sin disponibilidad"}`}
                  className={cn(
                    "relative mx-auto flex aspect-square w-full max-w-[48px] items-center justify-center rounded-full text-[16px] tabular-nums transition-all duration-300 ease-ios",
                    available && !selected && "font-semibold text-navy-deep hover:bg-navy-50 active:scale-90",
                    selected && "animate-pop bg-guinda font-semibold text-white shadow-[0_8px_18px_-8px_rgba(98,20,16,.8)]",
                    !available && "cursor-default text-navy-deep/30",
                  )}
                >
                  {d.day}
                  {isToday && (
                    <span
                      className={cn("absolute bottom-1 h-1 w-1 rounded-full", selected ? "bg-white" : "bg-guinda")}
                      aria-hidden="true"
                    />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NavBtn({ label, disabled, onClick, dir }: { label: string; disabled: boolean; onClick: () => void; dir: "prev" | "next" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full text-guinda transition-all duration-200 ease-ios hover:bg-guinda-soft active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
        <path
          d={dir === "prev" ? "M12.5 4.5L7 10l5.5 5.5" : "M7.5 4.5L13 10l-5.5 5.5"}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
