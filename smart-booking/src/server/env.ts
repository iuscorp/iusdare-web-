import "server-only";
import { z } from "zod";

/**
 * Única puerta de entrada a variables de entorno del servidor.
 * Las integraciones son opcionales al arrancar (la app debe funcionar sin credenciales
 * para poder hacer el onboarding); cada módulo verifica lo que necesita con `require*()`.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  /** 32 bytes en base64 — cifra tokens OAuth en reposo */
  ENCRYPTION_KEY: z.string().min(1),
  /** Secreto ≥ 32 caracteres para HMAC (state OAuth, hash de IPs, tokens) */
  AUTH_SECRET: z.string().min(32),
  /** Token de un solo uso para crear la primera cuenta admin (/admin/setup) */
  SETUP_TOKEN: z.string().min(16).optional(),
  CRON_SECRET: z.string().min(16).optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_TENANT_ID: z.string().default("common"),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  TRUST_PROXY: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  DEV_FAKE_CALENDARS: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Configuración de entorno inválida: ${issues}`);
  }
  if (parsed.data.NODE_ENV === "production" && parsed.data.DEV_FAKE_CALENDARS) {
    throw new Error("DEV_FAKE_CALENDARS no puede activarse en producción");
  }
  cached = parsed.data;
  return cached;
}

/** Solo para tests */
export function resetEnvCache() {
  cached = null;
}

export function useFakeCalendars(): boolean {
  const e = env();
  return e.DEV_FAKE_CALENDARS && e.NODE_ENV !== "production";
}

export function googleConfigured(): boolean {
  const e = env();
  return Boolean(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET);
}

export function microsoftConfigured(): boolean {
  const e = env();
  return Boolean(e.MICROSOFT_CLIENT_ID && e.MICROSOFT_CLIENT_SECRET);
}

export function stripeConfigured(): boolean {
  const e = env();
  return Boolean(e.STRIPE_SECRET_KEY && e.STRIPE_WEBHOOK_SECRET);
}
