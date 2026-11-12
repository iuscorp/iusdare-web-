import "server-only";
import type { CalendarIntegration } from "@prisma/client";
import { prisma } from "../db";
import { env } from "../env";
import { logger } from "../logger";
import { decrypt, encrypt } from "../security/crypto";
import { GOOGLE_TOKEN_URL, MICROSOFT_SCOPES, microsoftAuthority } from "./oauth-config";
import { CalendarApiError, type ProviderId } from "./types";

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  id_token?: string;
}

const REFRESH_MARGIN_MS = 60_000;
const inflight = new Map<ProviderId, Promise<string>>();

export async function storeTokens(provider: ProviderId, tokens: TokenResponse, accountEmail: string | null) {
  const data = {
    accessTokenEnc: encrypt(tokens.access_token),
    ...(tokens.refresh_token ? { refreshTokenEnc: encrypt(tokens.refresh_token) } : {}),
    tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    scopes: tokens.scope ?? null,
    status: "CONNECTED" as const,
    lastError: null,
  };
  return prisma.calendarIntegration.upsert({
    where: { provider },
    create: {
      provider,
      accountEmail,
      connectedAt: new Date(),
      targetCalendarId: provider === "GOOGLE" ? "primary" : null,
      ...data,
    },
    update: { ...data, accountEmail: accountEmail ?? undefined, connectedAt: new Date() },
  });
}

async function postForm(url: string, body: Record<string, string>, provider: ProviderId): Promise<TokenResponse> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch (err) {
    throw new CalendarApiError(provider, 0, `Error de red al renovar token: ${(err as Error).name}`);
  }
  const json = (await res.json().catch(() => ({}))) as TokenResponse & { error?: string };
  if (!res.ok || !json.access_token) {
    const reauth = json.error === "invalid_grant" || json.error === "interaction_required" || res.status === 400;
    throw new CalendarApiError(provider, res.status, `Renovación de token rechazada (${json.error ?? res.status})`, reauth);
  }
  return json;
}

export async function exchangeCode(
  provider: ProviderId,
  code: string,
  redirectUri: string,
  codeVerifier?: string,
): Promise<TokenResponse> {
  const e = env();
  if (provider === "GOOGLE") {
    return postForm(
      GOOGLE_TOKEN_URL,
      {
        code,
        client_id: e.GOOGLE_CLIENT_ID!,
        client_secret: e.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      },
      provider,
    );
  }
  return postForm(
    `${microsoftAuthority()}/token`,
    {
      code,
      client_id: e.MICROSOFT_CLIENT_ID!,
      client_secret: e.MICROSOFT_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      scope: MICROSOFT_SCOPES.join(" "),
      ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
    },
    provider,
  );
}

async function refresh(integration: CalendarIntegration): Promise<string> {
  const provider = integration.provider;
  if (!integration.refreshTokenEnc) {
    throw new CalendarApiError(provider, 401, "No hay refresh token; reconecta la cuenta", true);
  }
  const refreshToken = decrypt(integration.refreshTokenEnc);
  const e = env();
  try {
    const tokens =
      provider === "GOOGLE"
        ? await postForm(
            GOOGLE_TOKEN_URL,
            {
              client_id: e.GOOGLE_CLIENT_ID ?? "",
              client_secret: e.GOOGLE_CLIENT_SECRET ?? "",
              refresh_token: refreshToken,
              grant_type: "refresh_token",
            },
            provider,
          )
        : await postForm(
            `${microsoftAuthority()}/token`,
            {
              client_id: e.MICROSOFT_CLIENT_ID ?? "",
              client_secret: e.MICROSOFT_CLIENT_SECRET ?? "",
              refresh_token: refreshToken,
              grant_type: "refresh_token",
              scope: MICROSOFT_SCOPES.join(" "),
            },
            provider,
          );
    await storeTokens(provider, tokens, null);
    logger.info("oauth_token_refreshed", { provider });
    return tokens.access_token;
  } catch (err) {
    if (err instanceof CalendarApiError && err.reauthRequired) {
      await prisma.calendarIntegration.update({
        where: { provider },
        data: { status: "ERROR", lastError: "La autorización expiró o fue revocada. Vuelve a conectar la cuenta." },
      });
    }
    throw err;
  }
}

/** Devuelve un access token válido, renovándolo automáticamente si está por expirar. */
export async function getAccessToken(provider: ProviderId): Promise<string> {
  const integration = await prisma.calendarIntegration.findUnique({ where: { provider } });
  if (!integration || integration.status === "DISCONNECTED" || !integration.accessTokenEnc) {
    throw new CalendarApiError(provider, 401, "Integración no conectada", true);
  }
  const expiresAt = integration.tokenExpiresAt?.getTime() ?? 0;
  if (expiresAt - REFRESH_MARGIN_MS > Date.now()) return decrypt(integration.accessTokenEnc);

  // Deduplicar renovaciones concurrentes dentro del proceso
  const existing = inflight.get(provider);
  if (existing) return existing;
  const p = refresh(integration).finally(() => inflight.delete(provider));
  inflight.set(provider, p);
  return p;
}

/** Fuerza renovación (tras un 401 inesperado). */
export async function forceRefresh(provider: ProviderId): Promise<string> {
  const integration = await prisma.calendarIntegration.findUnique({ where: { provider } });
  if (!integration) throw new CalendarApiError(provider, 401, "Integración no conectada", true);
  return refresh(integration);
}

/** Decodifica (sin verificar firma: proviene directamente del endpoint de tokens por TLS) el email del id_token. */
export function emailFromIdToken(idToken?: string): string | null {
  if (!idToken) return null;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1] ?? "", "base64url").toString("utf8")) as {
      email?: string;
      preferred_username?: string;
    };
    return payload.email ?? payload.preferred_username ?? null;
  } catch {
    return null;
  }
}
