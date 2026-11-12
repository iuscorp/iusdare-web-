/**
 * Se ejecuta antes de cada archivo de test y ANTES de importar módulos de la app.
 * Nunca usa credenciales reales: todas las APIs externas se simulan.
 */
import { randomBytes } from "node:crypto";

const TEST_DB =
  process.env.TEST_DATABASE_URL ?? "postgresql://smartbooking:smartbooking@localhost:5432/smartbooking_test";

Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: TEST_DB,
  APP_URL: "http://localhost:3000",
  ENCRYPTION_KEY: randomBytes(32).toString("base64"),
  AUTH_SECRET: randomBytes(48).toString("base64"),
  STRIPE_SECRET_KEY: "sk_test_dummy",
  STRIPE_WEBHOOK_SECRET: "whsec_test_secret_for_signature_checks",
  GOOGLE_CLIENT_ID: "test-google-client",
  GOOGLE_CLIENT_SECRET: "test-google-secret",
  DEV_FAKE_CALENDARS: "false",
  TRUST_PROXY: "true",
});
