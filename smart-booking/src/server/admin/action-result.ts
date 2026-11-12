import "server-only";
import { ZodError } from "zod";
import { DomainError } from "../errors";
import { logger } from "../logger";

export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}

/** Traduce errores de dominio/validación a un estado serializable para useActionState. */
export function actionError(err: unknown): ActionState {
  if (err instanceof DomainError) return { ok: false, error: err.message };
  if (err instanceof ZodError) return { ok: false, error: err.issues[0]?.message ?? "Datos inválidos" };
  logger.error("admin_action_failed", { err });
  return { ok: false, error: "Ocurrió un error inesperado. Inténtalo nuevamente." };
}
