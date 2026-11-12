import "server-only";
import { createHash } from "node:crypto";
import { env, googleConfigured, microsoftConfigured } from "../env";
import { DomainError } from "../errors";
import { encrypt, decrypt, randomToken, signPayload, verifyPayload } from "../security/crypto";
import { GOOGLE_AUTH_URL, GOOGLE_SCOPES, MICROSOFT_SCOPES, microsoftAuthority, redirectUri } from "./oauth-config";
import { emailFromIdToken, exchangeCode, storeTokens } from "./tokens";
import type { ProviderId } from "./types";

export type OAuthProviderSlug = "google" | "microsoft";
export const OAUTH_COOKIE = "sb_oauth";
const STATE_TTL_MS = 10 * 60_000;

export function providerFromSlug(slug: string): ProviderId {
  if (slug === "google") return "GOOGLE";
  if (slug === "microsoft") return "MICROSOFT";
  throw new DomainError("NOT_FOUND", "Proveedor desconocido", 404);
}

interface StatePayload {
  p: OAuthProviderSlug;
  n: string;
  exp: number;
}

/** Construye la URL de autorización y el valor de la cookie (nonce + PKCE verifier cifrados). */
export function buildAuthorization(slug: OAuthProviderSlug): { url: string; cookie: string } {
  if (slug === "google" && !googleConfigured()) {
    throw new DomainError("VALIDATION_ERROR", "Faltan GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET en el entorno.", 503);
  }
  if (slug === "microsoft" && !microsoftConfigured()) {
    throw new DomainError("VALIDATION_ERROR", "Faltan MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET en el entorno.", 503);
  }
  const nonce = randomToken(16);
  const verifier = randomToken(48);
  const state = signPayload({ p: slug, n: nonce, exp: Date.now() + STATE_TTL_MS } satisfies StatePayload);
  const cookie = encrypt(JSON.stringify({ n: nonce, v: verifier }));
  const e = env();

  if (slug === "google") {
    const params = new URLSearchParams({
      client_id: e.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri("google"),
      response_type: "code",
      scope: GOOGLE_SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    });
    return { url: `${GOOGLE_AUTH_URL}?${params}`, cookie };
  }
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const params = new URLSearchParams({
    client_id: e.MICROSOFT_CLIENT_ID!,
    redirect_uri: redirectUri("microsoft"),
    response_type: "code",
    response_mode: "query",
    scope: MICROSOFT_SCOPES.join(" "),
    prompt: "select_account",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
  });
  return { url: `${microsoftAuthority()}/authorize?${params}`, cookie };
}

/** Valida state + cookie, intercambia el código y guarda los tokens cifrados. */
export async function completeAuthorization(
  slug: OAuthProviderSlug,
  params: { code: string | null; state: string | null; error: string | null },
  cookieValue: string | undefined,
) {
  if (params.error) throw new DomainError("FORBIDDEN", "La autorización fue cancelada o denegada.", 400);
  if (!params.code || !params.state || !cookieValue) throw new DomainError("FORBIDDEN", "Solicitud OAuth inválida.", 400);
  const state = verifyPayload<StatePayload>(params.state);
  if (!state || state.p !== slug || state.exp < Date.now()) {
    throw new DomainError("FORBIDDEN", "El estado OAuth es inválido o expiró. Intenta de nuevo.", 400);
  }
  let stored: { n: string; v: string };
  try {
    stored = JSON.parse(decrypt(cookieValue)) as { n: string; v: string };
  } catch {
    throw new DomainError("FORBIDDEN", "Sesión OAuth inválida.", 400);
  }
  if (stored.n !== state.n) throw new DomainError("FORBIDDEN", "El estado OAuth no coincide.", 400);

  const provider = providerFromSlug(slug);
  const tokens = await exchangeCode(provider, params.code, redirectUri(slug), slug === "microsoft" ? stored.v : undefined);
  if (provider === "GOOGLE" && !tokens.refresh_token) {
    // Sin refresh token no podemos operar a largo plazo.
    throw new DomainError("VALIDATION_ERROR", "Google no devolvió un refresh token. Revoca el acceso y vuelve a conectar.", 400);
  }
  await storeTokens(provider, tokens, emailFromIdToken(tokens.id_token));
}
