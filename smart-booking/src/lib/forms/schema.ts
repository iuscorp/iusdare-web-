/**
 * Formularios declarativos. Cada tipo de reunión guarda su `formFields` (JSON) en BD;
 * la UI los renderiza genéricamente y el backend construye el validador zod a partir de la misma definición.
 * Añadir un tipo de reunión o un campo nuevo NO requiere código nuevo.
 *
 * Los campos de identidad (nombre, email, teléfono) son comunes a todos los tipos (`CORE_FIELDS`).
 */
import { z } from "zod";

export type FieldType = "text" | "email" | "tel" | "textarea" | "multiselect" | "select";

export interface FieldOption {
  value: string;
  label: string;
}

export interface FormField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  maxLength?: number;
  minLength?: number;
  options?: FieldOption[];
  /** multiselect/select: permite una opción personalizada escrita por el usuario */
  allowCustom?: boolean;
  customLabel?: string;
  minSelected?: number;
}

export const CORE_FIELDS: FormField[] = [
  { key: "fullName", label: "Nombre completo", type: "text", required: true, minLength: 3, maxLength: 120, placeholder: "Nombre y apellidos" },
  { key: "phone", label: "Número de teléfono", type: "tel", required: true, maxLength: 25, placeholder: "+51 999 999 999" },
  { key: "email", label: "Correo electrónico", type: "email", required: true, maxLength: 254, placeholder: "tu@correo.com" },
];

const fieldSchema: z.ZodType<FormField> = z.object({
  key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,40}$/),
  label: z.string().min(1).max(200),
  type: z.enum(["text", "email", "tel", "textarea", "multiselect", "select"]),
  required: z.boolean(),
  placeholder: z.string().max(400).optional(),
  helpText: z.string().max(400).optional(),
  maxLength: z.number().int().positive().max(10000).optional(),
  minLength: z.number().int().nonnegative().optional(),
  options: z.array(z.object({ value: z.string().min(1).max(80), label: z.string().min(1).max(120) })).optional(),
  allowCustom: z.boolean().optional(),
  customLabel: z.string().max(120).optional(),
  minSelected: z.number().int().nonnegative().optional(),
});

export const formFieldsSchema = z.array(fieldSchema).max(30);

/** Parse seguro del JSON almacenado. */
export function parseFormFields(json: unknown): FormField[] {
  return formFieldsSchema.parse(json);
}

/** Teléfono internacional flexible: dígitos, espacios, +, -, paréntesis; 7–15 dígitos. */
export const phoneSchema = z
  .string()
  .trim()
  .max(25)
  .regex(/^\+?[0-9\s\-().]{7,25}$/, "Ingresa un número de teléfono válido")
  .refine((v) => {
    const digits = v.replace(/\D/g, "").length;
    return digits >= 7 && digits <= 15;
  }, "Ingresa un número de teléfono válido");

/** Valor de un multiselect: opciones elegidas + texto personalizado opcional. */
export interface MultiValue {
  selected: string[];
  custom?: string;
}

/** Elimina caracteres de control (excepto saltos de línea en textareas). */
function clean(v: string, multiline: boolean) {
  // eslint-disable-next-line no-control-regex
  const re = multiline ? /[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g;
  return v.replace(re, "").trim();
}

function fieldValidator(f: FormField): z.ZodTypeAny {
  switch (f.type) {
    case "email":
      return z.string().trim().toLowerCase().max(f.maxLength ?? 254).email("Ingresa un correo electrónico válido");
    case "tel":
      return phoneSchema;
    case "text":
    case "textarea": {
      const multiline = f.type === "textarea";
      const max = f.maxLength ?? (multiline ? 3000 : 200);
      let inner = z.string().max(max, `${f.label}: máximo ${max} caracteres`);
      if (f.required) {
        const min = Math.max(1, f.minLength ?? 1);
        inner = inner.min(min, min > 1 ? `${f.label}: mínimo ${min} caracteres` : `${f.label} es obligatorio`);
      }
      const base = z.string().transform((v) => clean(v, multiline)).pipe(inner);
      return f.required ? base : base.optional().default("");
    }
    case "select": {
      const allowed = new Set((f.options ?? []).map((o) => o.value));
      return z
        .string()
        .refine((v) => allowed.has(v) || (f.allowCustom && v.length > 0 && v.length <= 120), `Selecciona una opción válida`);
    }
    case "multiselect": {
      const allowed = new Set((f.options ?? []).map((o) => o.value));
      return z
        .object({
          selected: z.array(z.string()).max(50).default([]),
          custom: z
            .string()
            .max(200)
            .optional()
            .transform((v) => (v ? clean(v, false) : undefined)),
        })
        .superRefine((val, ctx) => {
          const invalid = val.selected.filter((s) => !allowed.has(s));
          if (invalid.length) ctx.addIssue({ code: "custom", message: "Opción no válida" });
          if (val.custom && !f.allowCustom) ctx.addIssue({ code: "custom", message: "No se admiten opciones personalizadas" });
          const count = new Set(val.selected).size + (val.custom ? 1 : 0);
          const min = f.required ? Math.max(1, f.minSelected ?? 1) : f.minSelected ?? 0;
          if (count < min) ctx.addIssue({ code: "custom", message: `Selecciona al menos ${min} opción(es) en "${f.label}"` });
        })
        .transform((v) => ({ selected: Array.from(new Set(v.selected)), ...(v.custom ? { custom: v.custom } : {}) }));
    }
  }
}

/** Construye el validador de respuestas (campos núcleo + específicos). Rechaza claves desconocidas. */
export function buildAnswersSchema(fields: FormField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of [...CORE_FIELDS, ...fields]) shape[f.key] = fieldValidator(f);
  return z.object(shape).strict();
}

/** Representación legible de una respuesta (para el evento de calendario y el panel). */
export function formatAnswer(field: FormField, value: unknown): string {
  if (value == null || value === "") return "—";
  if (field.type === "multiselect" && typeof value === "object") {
    const v = value as MultiValue;
    const labels = v.selected.map((s) => field.options?.find((o) => o.value === s)?.label ?? s);
    if (v.custom) labels.push(`${field.customLabel ?? "Otra"}: ${v.custom}`);
    return labels.join(", ");
  }
  if (field.type === "select" && typeof value === "string") {
    return field.options?.find((o) => o.value === value)?.label ?? value;
  }
  return String(value);
}
