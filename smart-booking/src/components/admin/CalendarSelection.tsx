"use client";
import { useActionState } from "react";
import { Field, Select } from "@/components/ui/Field";
import { SubmitButton } from "./SubmitButton";
import { ActionMessage } from "./ActionMessage";
import { saveCalendarsAction } from "@/app/admin/(panel)/actions";

export function CalendarSelection({
  provider,
  calendars,
  selected,
  target,
}: {
  provider: "GOOGLE" | "MICROSOFT";
  calendars: { id: string; summary: string; primary: boolean }[];
  selected: string[];
  target?: string | null;
}) {
  const [state, action] = useActionState(saveCalendarsAction.bind(null, provider), {});
  const isSelected = (c: { id: string; primary: boolean }) =>
    selected.length ? selected.includes(c.id) || (c.primary && selected.includes("primary")) : c.primary;
  return (
    <form action={action} className="space-y-3">
      <ActionMessage state={state} />
      {provider === "GOOGLE" && (
        <Field id={`target-${provider}`} label="Calendario donde se crean las reservas">
          <Select id={`target-${provider}`} name="targetCalendarId" defaultValue={target ?? "primary"}>
            <option value="primary">Principal</option>
            {calendars.filter((c) => !c.primary).map((c) => (
              <option key={c.id} value={c.id}>{c.summary}</option>
            ))}
          </Select>
        </Field>
      )}
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Calendarios consultados para disponibilidad</legend>
        <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border border-line p-3">
          {calendars.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="calendarIds" value={c.id} defaultChecked={isSelected(c)} className="h-4 w-4 accent-navy" />
              <span className="truncate">{c.summary}</span>
              {c.primary && <span className="text-xs text-navy-deep/50">(principal)</span>}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-navy-deep/60">Sin selección se consulta solo el calendario principal.</p>
      </fieldset>
      <SubmitButton size="sm" variant="outline" pendingText="Guardando…">Guardar calendarios</SubmitButton>
    </form>
  );
}
