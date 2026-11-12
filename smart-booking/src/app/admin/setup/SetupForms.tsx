"use client";
import { useActionState } from "react";
import { Field, Input, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { ActionMessage } from "@/components/admin/ActionMessage";
import { createFirstAdminAction, saveOnboardingAction } from "./actions";

export function FirstAdminForm() {
  const [state, action] = useActionState(createFirstAdminAction, {});
  return (
    <form action={action} className="space-y-4">
      <ActionMessage state={state} />
      <Field id="token" label="Token de configuración" required hint="Valor de la variable de entorno SETUP_TOKEN del servidor.">
        <Input id="token" name="token" type="password" autoComplete="off" required />
      </Field>
      <Field id="name" label="Tu nombre" required>
        <Input id="name" name="name" autoComplete="name" required />
      </Field>
      <Field id="email" label="Correo electrónico" required>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </Field>
      <Field id="password" label="Contraseña" required hint="Mínimo 12 caracteres, con letras y números.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required />
      </Field>
      <Field id="confirm" label="Confirmar contraseña" required>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton className="w-full" pendingText="Creando cuenta…">
        Crear cuenta de administración
      </SubmitButton>
    </form>
  );
}

export function OnboardingForm({
  ownerName,
  timezone,
  price,
}: {
  ownerName: string;
  timezone: string;
  price: { amount: string; currency: string } | null;
}) {
  const [state, action] = useActionState(saveOnboardingAction, {});
  return (
    <form action={action} className="space-y-4">
      <ActionMessage state={state} />
      <Field id="ownerName" label="Nombre visible de la organizadora">
        <Input id="ownerName" name="ownerName" defaultValue={ownerName} maxLength={120} />
      </Field>
      <Field id="timezone" label="Zona horaria principal" required hint="Zona IANA en la que se definen tus horarios.">
        <Input id="timezone" name="timezone" defaultValue={timezone} required />
      </Field>
      <fieldset className="rounded-xl border border-line p-4">
        <legend className="px-1 text-sm font-semibold">Precio de la Asesoría profesional</legend>
        <p className="mb-3 text-xs text-navy-deep/60">
          Sin precio configurado, la página de asesorías no aceptará reservas. Puedes cambiarlo luego en Configuración.
        </p>
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <Field id="amount" label="Monto">
            <Input id="amount" name="amount" inputMode="decimal" placeholder="0.00" defaultValue={price?.amount ?? ""} pattern="^\d+([.,]\d{1,2})?$" />
          </Field>
          <Field id="currency" label="Moneda">
            <Select id="currency" name="currency" defaultValue={price?.currency ?? ""}>
              <option value="">—</option>
              <option value="PEN">PEN (S/)</option>
              <option value="USD">USD ($)</option>
            </Select>
          </Field>
        </div>
      </fieldset>
      <SubmitButton variant="outline" pendingText="Guardando…">
        Guardar
      </SubmitButton>
    </form>
  );
}
