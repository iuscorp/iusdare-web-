import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "./logger";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "SLOT_UNAVAILABLE"
  | "CALENDAR_UNAVAILABLE"
  | "CALENDAR_WRITE_FAILED"
  | "PAYMENT_NOT_CONFIGURED"
  | "PAYMENT_ERROR"
  | "MEETING_TYPE_INACTIVE"
  | "RATE_LIMITED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "INTERNAL";

export class DomainError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function toErrorResponse(err: unknown, headers?: HeadersInit) {
  if (err instanceof DomainError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, details: err.details } },
      { status: err.status, headers },
    );
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Revisa los datos ingresados.",
          details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        },
      },
      { status: 422, headers },
    );
  }
  logger.error("unhandled_error", { err });
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "Ocurrió un error inesperado. Inténtalo nuevamente." } },
    { status: 500, headers },
  );
}
