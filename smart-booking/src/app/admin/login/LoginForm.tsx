"use client";
import { useActionState } from "react";
import { Field, Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { ActionMessage } from "@/components/admin/ActionMessage";
import { loginAction } from "./actions";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <ActionMessage state={state} />
      <Field id="email" label="Correo electrónico" required>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </Field>
      <Field id="password" label="Contraseña" required>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton className="w-full" pendingText="Ingresando…">
        Ingresar
      </SubmitButton>
    </form>
  );
}
