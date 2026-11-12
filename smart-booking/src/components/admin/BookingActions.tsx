"use client";
import { useActionState, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { SubmitButton } from "./SubmitButton";
import { ActionMessage } from "./ActionMessage";
import { cancelBookingAction, rescheduleBookingAction } from "@/app/admin/(panel)/actions";

export function CancelBookingForm({ bookingId, canRefund }: { bookingId: string; canRefund: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(cancelBookingAction.bind(null, bookingId), {});
  if (state.ok) return <ActionMessage state={state} />;
  if (!open) {
    return (
      <Button variant="outline" className="w-full border-guinda/40 text-guinda hover:border-guinda hover:bg-red-50" onClick={() => setOpen(true)}>
        Cancelar reserva
      </Button>
    );
  }
  return (
    <form action={action} className="space-y-3 rounded-xl border border-red-200 bg-red-50/40 p-4">
      <ActionMessage state={state} />
      <Field id="reason" label="Motivo (opcional)" hint="Se elimina el evento de Google Calendar y el participante recibe la notificación.">
        <Textarea id="reason" name="reason" maxLength={500} className="min-h-[80px]" />
      </Field>
      {canRefund && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="refund" className="h-4 w-4 accent-guinda" /> Reembolsar el pago en Stripe
        </label>
      )}
      <div className="flex gap-2">
        <SubmitButton variant="danger" size="sm" pendingText="Cancelando…">Confirmar cancelación</SubmitButton>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Volver</Button>
      </div>
    </form>
  );
}

export function RescheduleDatePicker({ defaultDate, minDate }: { defaultDate?: string; minDate: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [date, setDate] = useState(defaultDate ?? "");
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (date) router.push(`${pathname}?date=${date}#reprogramar`);
      }}
    >
      <Field id="date" label="Nueva fecha">
        <Input id="date" type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} required className="w-48" />
      </Field>
      <Button type="submit" variant="outline">Ver horarios</Button>
    </form>
  );
}

export function RescheduleSlotsForm({ bookingId, slots }: { bookingId: string; slots: { start: string; label: string }[] }) {
  const [state, action] = useActionState(rescheduleBookingAction.bind(null, bookingId), {});
  if (slots.length === 0) return <p className="text-sm text-navy-deep/60">No hay horarios disponibles ese día.</p>;
  return (
    <form action={action} className="space-y-3">
      <ActionMessage state={state} />
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Horarios disponibles</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((s) => (
            <label key={s.start} className="cursor-pointer">
              <input type="radio" name="start" value={s.start} className="peer sr-only" required />
              <span className="block rounded-lg border border-navy-deep/20 py-2 text-center text-sm font-medium peer-checked:border-navy-deep peer-checked:bg-navy-deep peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-gold">
                {s.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <SubmitButton pendingText="Reprogramando…">Reprogramar</SubmitButton>
    </form>
  );
}
