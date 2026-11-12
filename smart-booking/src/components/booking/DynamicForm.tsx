"use client";

import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import type { FormField, MultiValue } from "@/lib/forms/schema";

export type AnswerValue = string | MultiValue;
export type Answers = Record<string, AnswerValue>;

export function initialAnswers(fields: FormField[]): Answers {
  const a: Answers = {};
  for (const f of fields) a[f.key] = f.type === "multiselect" ? { selected: [] } : "";
  return a;
}

export function DynamicForm({
  fields,
  values,
  errors,
  onChange,
  disabled,
}: {
  fields: FormField[];
  values: Answers;
  errors: Record<string, string>;
  onChange: (key: string, value: AnswerValue) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-5">
      {fields.map((f) => {
        const id = `f-${f.key}`;
        const err = errors[f.key];
        const describedBy = err ? `${id}-error` : f.helpText ? `${id}-hint` : undefined;
        const common = {
          id,
          name: f.key,
          disabled,
          "aria-invalid": err ? true : undefined,
          "aria-describedby": describedBy,
          "aria-required": f.required || undefined,
        };

        if (f.type === "multiselect") {
          return (
            <MultiSelectField
              key={f.key}
              field={f}
              value={(values[f.key] as MultiValue) ?? { selected: [] }}
              error={err}
              disabled={disabled}
              onChange={(v) => onChange(f.key, v)}
            />
          );
        }

        const value = typeof values[f.key] === "string" ? (values[f.key] as string) : "";
        return (
          <Field key={f.key} id={id} label={f.label} required={f.required} hint={f.helpText} error={err}>
            {f.type === "textarea" ? (
              <>
                <Textarea
                  {...common}
                  value={value}
                  placeholder={f.placeholder}
                  maxLength={f.maxLength}
                  rows={5}
                  onChange={(e) => onChange(f.key, e.target.value)}
                />
                {f.maxLength && (
                  <p className="text-right font-mono text-[11px] text-navy-deep/45" aria-hidden="true">
                    {value.length}/{f.maxLength}
                  </p>
                )}
              </>
            ) : f.type === "select" ? (
              <Select {...common} value={value} onChange={(e) => onChange(f.key, e.target.value)}>
                <option value="">Selecciona…</option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                {...common}
                type={f.type}
                value={value}
                placeholder={f.placeholder}
                maxLength={f.maxLength}
                autoComplete={f.key === "fullName" ? "name" : f.type === "email" ? "email" : f.type === "tel" ? "tel" : undefined}
                inputMode={f.type === "tel" ? "tel" : f.type === "email" ? "email" : undefined}
                onChange={(e) => onChange(f.key, e.target.value)}
              />
            )}
          </Field>
        );
      })}
    </div>
  );
}

function MultiSelectField({
  field,
  value,
  error,
  disabled,
  onChange,
}: {
  field: FormField;
  value: MultiValue;
  error?: string;
  disabled?: boolean;
  onChange: (v: MultiValue) => void;
}) {
  const id = `f-${field.key}`;
  const customOn = value.custom !== undefined;
  const toggle = (v: string) => {
    const set = new Set(value.selected);
    if (set.has(v)) set.delete(v);
    else set.add(v);
    onChange({ ...value, selected: Array.from(set) });
  };
  return (
    <fieldset
      className="space-y-2.5"
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${id}-error` : field.helpText ? `${id}-hint` : undefined}
    >
      <legend className="text-sm font-medium text-navy-deep">
        {field.label}
        {field.required && <span className="ml-0.5 text-guinda" aria-hidden="true">*</span>}
      </legend>
      {field.helpText && (
        <p id={`${id}-hint`} className="text-xs text-navy-deep/60">
          {field.helpText}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {field.options?.map((o) => {
          const checked = value.selected.includes(o.value);
          return (
            <label
              key={o.value}
              className={cn(
                "inline-flex min-h-[40px] cursor-pointer select-none items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold",
                checked
                  ? "border-navy-deep bg-navy-deep text-white"
                  : "border-navy-deep/20 bg-white text-navy-deep hover:border-navy-deep/50",
                disabled && "pointer-events-none opacity-60",
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(o.value)}
              />
              {checked && (
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {o.label}
            </label>
          );
        })}
        {field.allowCustom && (
          <label
            className={cn(
              "inline-flex min-h-[40px] cursor-pointer select-none items-center gap-2 rounded-full border border-dashed px-3.5 py-1.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold",
              customOn ? "border-gold bg-gold-50 text-gold-dark" : "border-navy-deep/30 text-navy-deep/80 hover:border-navy-deep/60",
            )}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={customOn}
              disabled={disabled}
              onChange={() => {
                if (customOn) {
                  const { custom: _omit, ...rest } = value;
                  void _omit;
                  onChange(rest);
                } else onChange({ ...value, custom: "" });
              }}
            />
            + Personalizar
          </label>
        )}
      </div>
      {field.allowCustom && customOn && (
        <div className="animate-fade-up">
          <label htmlFor={`${id}-custom`} className="sr-only">
            {field.customLabel ?? "Otra opción"}
          </label>
          <Input
            id={`${id}-custom`}
            value={value.custom ?? ""}
            maxLength={200}
            disabled={disabled}
            placeholder={field.customLabel ?? "Especifica otra opción"}
            onChange={(e) => onChange({ ...value, custom: e.target.value })}
            autoFocus
          />
        </div>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-guinda" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
