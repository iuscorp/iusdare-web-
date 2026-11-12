import "server-only";
import { CalendarApiError, type ProviderId } from "./types";

const TIMEOUT_MS = 10_000;

/** fetch con timeout y errores tipados; nunca incluye el cuerpo de la respuesta con datos sensibles en el mensaje. */
export async function apiFetch(
  provider: ProviderId,
  url: string,
  init: RequestInit & { accessToken?: string } = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.accessToken) headers.set("Authorization", `Bearer ${init.accessToken}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch (err) {
    throw new CalendarApiError(provider, 0, `Error de red: ${(err as Error).name}`);
  }
  return res;
}

export async function readJson<T>(provider: ProviderId, res: Response, op: string): Promise<T> {
  if (!res.ok) {
    let code = "";
    try {
      const body = (await res.json()) as { error?: { code?: string; status?: string; message?: string } | string };
      code = typeof body.error === "string" ? body.error : (body.error?.status ?? body.error?.code ?? "");
    } catch {
      /* ignore */
    }
    throw new CalendarApiError(provider, res.status, `${op} falló (${res.status}${code ? ` ${code}` : ""})`, res.status === 401);
  }
  return (await res.json()) as T;
}
