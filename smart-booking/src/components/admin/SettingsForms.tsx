"use client";
import { useActionState } from "react";
import { Field, Input, Select } from "@/components/ui/Field";
import { SubmitButton } from "./SubmitButton";
import { ActionMessage } from "./ActionMessage";
import { saveAppSettingsAction, saveMeetingTypeAction, savePriceAction } from "@/app/admin/(panel)/actions";

export function PriceForm({ slug, amount, currency }: { slug: string; amount: string; currency: string }) {
  const [state, action] = useActionState(savePriceAction, {});
  return (
    <form action={action} className="space-y-3">
      <ActionMessage state={state} />
      <input type="hidden" name="slug" value={slug} />
      <div className="grid grid-cols-[1fr_140px] gap-3">
        <Field id={`amount-${slug}`} label="Monto" required>
          <Input id={`amount-${slug}`} name="amount" inputMode="decimal" placeholder="0.00" defaultValue={amount} required pattern="^\d+([.,]\d{1,2})?$" />
        </Field>
        <Field id={`currency-${slug}`} label="Moneda" required>
          <Select id={`currency-${slug}`} name="currency" defaultValue={currency} required>
            <option value="" disabled>—</option>
            <option value="PEN">PEN (S/)</option>
            <option value="USD">USD ($)</option>
          </Select>
        </Field>
      </div>
      <SubmitButton size="sm" pendingText="Guardando…">Guardar precio</SubmitButton>
    </form>
  );
}

export interface MeetingTypeSettings {
  slug: string;
  name: string;
  isActive: boolean;
  durationMinutes: number;
  slotIntervalMinutes: number;
  minNoticeMinutes: number;
  maxDaysAhead: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  addVideoConference: boolean;
}

function NumberField({ id, name, label, value, min, max, hint }: { id: string; name: string; label: string; value: number; min: number; max: number; hint?: string }) {
  return (
    <Field id={id} label={label} hint={hint}>
      <Input id={id} name={name} type="number" min={min} max={max} defaultValue={value} required />
    </Field>
  );
}

export function MeetingTypeForm({ mt }: { mt: MeetingTypeSettings }) {
  const [state, action] = useActionState(saveMeetingTypeAction, {});
  const id = (k: string) => `${mt.slug}-${k}`;
  return (
    <form action={action} className="space-y-4">
      <ActionMessage state={state} />
      <input type="hidden" name="slug" value={mt.slug} />
      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="isActive" defaultChecked={mt.isActive} className="h-4 w-4 accent-navy" /> Página pública activa
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="addVideoConference" defaultChecked={mt.addVideoConference} className="h-4 w-4 accent-navy" /> Crear enlace de Google Meet
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <NumberField id={id("dur")} name="durationMinutes" label="Duración (min)" value={mt.durationMinutes} min={5} max={480} />
        <NumberField id={id("int")} name="slotIntervalMinutes" label="Intervalo entre horarios (min)" value={mt.slotIntervalMinutes} min={5} max={240} />
        <NumberField id={id("notice")} name="minNoticeMinutes" label="Aviso mínimo (min)" value={mt.minNoticeMinutes} min={0} max={43200} />
        <NumberField id={id("ahead")} name="maxDaysAhead" label="Días máx. de anticipación" value={mt.maxDaysAhead} min={1} max={365} />
        <NumberField id={id("bb")} name="bufferBeforeMinutes" label="Margen antes (min)" value={mt.bufferBeforeMinutes} min={0} max={240} />
        <NumberField id={id("ba")} name="bufferAfterMinutes" label="Margen después (min)" value={mt.bufferAfterMinutes} min={0} max={240} />
      </div>
      <SubmitButton size="sm" variant="outline" pendingText="Guardando…">Guardar cambios</SubmitButton>
    </form>
  );
}

export function AppSettingsForm({
  timezone,
  holdMinutes,
  paymentHoldMinutes,
  ownerName,
}: {
  timezone: string;
  holdMinutes: number;
  paymentHoldMinutes: number;
  ownerName: string;
}) {
  const [state, action] = useActionState(saveAppSettingsAction, {});
  return (
    <form action={action} className="space-y-4">
      <ActionMessage state={state} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field id="ownerName" label="Nombre visible">
          <Input id="ownerName" name="ownerName" defaultValue={ownerName} maxLength={120} />
        </Field>
        <Field id="timezone" label="Zona horaria del horario" hint="Zona IANA, ej. America/Lima">
          <Input id="timezone" name="timezone" defaultValue={timezone} required />
        </Field>
        <Field id="holdMinutes" label="Reserva temporal (min)" hint="Bloqueo mientras se confirma una reserva gratuita.">
          <Input id="holdMinutes" name="holdMinutes" type="number" min={2} max={60} defaultValue={holdMinutes} required />
        </Field>
        <Field id="paymentHoldMinutes" label="Reserva temporal con pago (min)" hint="Mínimo 30 (requisito de Stripe Checkout).">
          <Input id="paymentHoldMinutes" name="paymentHoldMinutes" type="number" min={30} max={1440} defaultValue={paymentHoldMinutes} required />
        </Field>
      </div>
      <SubmitButton size="sm" pendingText="Guardando…">Guardar configuración</SubmitButton>
    </form>
  );
}
