"use client";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SubmitButton } from "./SubmitButton";
import { ActionMessage } from "./ActionMessage";
import { hhmmToMinutes, minutesToHHmm, WEEKDAYS } from "./time";
import { saveWeeklyRulesAction } from "@/app/admin/(panel)/actions";

interface Range {
  start: string;
  end: string;
}
type Week = Record<number, Range[]>;

export function WeeklyRulesEditor({ initial }: { initial: { weekday: number; startMinute: number; endMinute: number }[] }) {
  const [week, setWeek] = useState<Week>(() => {
    const w: Week = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
    for (const r of [...initial].sort((a, b) => a.startMinute - b.startMinute)) {
      w[r.weekday]!.push({ start: minutesToHHmm(r.startMinute), end: minutesToHHmm(r.endMinute) });
    }
    return w;
  });
  const [state, action] = useActionState(saveWeeklyRulesAction, {});

  const rules: { weekday: number; startMinute: number; endMinute: number }[] = [];
  let invalid = false;
  for (let d = 1; d <= 7; d++) {
    for (const r of week[d]!) {
      const s = hhmmToMinutes(r.start);
      const e = hhmmToMinutes(r.end);
      if (s == null || e == null || e <= s) invalid = true;
      else rules.push({ weekday: d, startMinute: s, endMinute: e });
    }
  }

  const update = (d: number, fn: (r: Range[]) => Range[]) => setWeek((w) => ({ ...w, [d]: fn(w[d]!) }));

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="rules" value={JSON.stringify(rules)} />
      <ActionMessage state={state} />
      <ul className="divide-y divide-line">
        {[1, 2, 3, 4, 5, 6, 7].map((d) => {
          const ranges = week[d]!;
          const enabled = ranges.length > 0;
          return (
            <li key={d} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start">
              <label className="flex w-40 shrink-0 items-center gap-2 pt-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-navy"
                  checked={enabled}
                  onChange={(e) => update(d, () => (e.target.checked ? [{ start: "09:00", end: "18:00" }] : []))}
                />
                {WEEKDAYS[d]}
              </label>
              <div className="flex-1 space-y-2">
                {!enabled && <p className="pt-2 text-sm text-navy-deep/50">No disponible</p>}
                {ranges.map((r, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <input
                      type="time"
                      aria-label={`${WEEKDAYS[d]} inicio ${i + 1}`}
                      value={r.start}
                      step={900}
                      onChange={(e) => update(d, (rs) => rs.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))}
                      className="h-10 rounded-lg border border-navy-deep/20 px-2 text-sm"
                    />
                    <span aria-hidden="true">–</span>
                    <input
                      type="time"
                      aria-label={`${WEEKDAYS[d]} fin ${i + 1}`}
                      value={r.end === "24:00" ? "23:59" : r.end}
                      step={900}
                      onChange={(e) => update(d, (rs) => rs.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))}
                      className="h-10 rounded-lg border border-navy-deep/20 px-2 text-sm"
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => update(d, (rs) => rs.filter((_, j) => j !== i))} aria-label="Quitar rango">
                      ✕
                    </Button>
                  </div>
                ))}
                {enabled && (
                  <button
                    type="button"
                    className="text-sm font-medium text-navy hover:underline"
                    onClick={() => update(d, (rs) => [...rs, { start: "18:00", end: "20:00" }])}
                  >
                    + Agregar rango
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {invalid && <p className="text-sm text-guinda" role="alert">Revisa los rangos: la hora de fin debe ser posterior a la de inicio.</p>}
      <SubmitButton disabled={invalid} pendingText="Guardando…">Guardar disponibilidad semanal</SubmitButton>
    </form>
  );
}
