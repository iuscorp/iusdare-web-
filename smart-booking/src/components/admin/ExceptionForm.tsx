"use client";
import { useActionState, useState } from "react";
import { Field, Input, Select } from "@/components/ui/Field";
import { SubmitButton } from "./SubmitButton";
import { ActionMessage } from "./ActionMessage";
import { addExceptionAction } from "@/app/admin/(panel)/actions";

export function ExceptionForm({ today }: { today: string }) {
  const [state, action] = useActionState(addExceptionAction, {});
  const [kind, setKind] = useState<"BLOCKED" | "CUSTOM_HOURS">("BLOCKED");
  const [allDay, setAllDay] = useState(true);
  const showTimes = kind === "CUSTOM_HOURS" || !allDay;
  return (
    <form action={action} className="space-y-4">
      <ActionMessage state={state} />
      <Field id="kind" label="Tipo">
        <Select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as "BLOCKED" | "CUSTOM_HOURS")}>
          <option value="BLOCKED">Bloquear (no disponible)</option>
          <option value="CUSTOM_HOURS">Horario personalizado (reemplaza el semanal)</option>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="startDate" label="Desde" required>
          <Input id="startDate" name="startDate" type="date" min={today} required />
        </Field>
        <Field id="endDate" label="Hasta" hint="Vacío = un solo día">
          <Input id="endDate" name="endDate" type="date" min={today} />
        </Field>
      </div>
      {kind === "BLOCKED" && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="allDay" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="h-4 w-4 accent-navy" />
          Todo el día
        </label>
      )}
      {showTimes && (
        <div className="grid grid-cols-2 gap-3">
          <Field id="startTime" label="Hora inicio" required>
            <Input id="startTime" name="startTime" type="time" step={900} required />
          </Field>
          <Field id="endTime" label="Hora fin" required>
            <Input id="endTime" name="endTime" type="time" step={900} required />
          </Field>
        </div>
      )}
      <Field id="reason" label="Motivo (opcional)">
        <Input id="reason" name="reason" maxLength={200} placeholder="Ej. Feriado, viaje, audiencia" />
      </Field>
      <SubmitButton pendingText="Agregando…">Agregar excepción</SubmitButton>
    </form>
  );
}
