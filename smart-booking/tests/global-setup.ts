import { execSync } from "node:child_process";

const TEST_DB =
  process.env.TEST_DATABASE_URL ?? "postgresql://smartbooking:smartbooking@localhost:5432/smartbooking_test";

/** Aplica las migraciones pendientes a la BD de pruebas (no destructivo; los tests truncan tablas). */
export default function setup() {
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DB, PRISMA_HIDE_UPDATE_MESSAGE: "1" },
    stdio: "pipe",
  });
}
