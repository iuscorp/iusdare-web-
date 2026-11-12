import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/server/env";
import { DomainError } from "@/server/errors";
import { logger } from "@/server/logger";
import { getCurrentAdmin } from "@/server/auth/session";
import { completeAuthorization, OAUTH_COOKIE, type OAuthProviderSlug } from "@/server/calendars/oauth";
import { audit } from "@/server/audit";

export const dynamic = "force-dynamic";

/** GET /api/oauth/{google|microsoft}/callback */
export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const base = env().APP_URL.replace(/\/$/, "");
  const back = (q: string) => {
    const res = NextResponse.redirect(`${base}/admin/integrations?${q}`);
    res.cookies.set(OAUTH_COOKIE, "", { path: `/api/oauth/${provider}`, maxAge: 0 });
    return res;
  };
  if (provider !== "google" && provider !== "microsoft") return NextResponse.json({ error: "not_found" }, { status: 404 });

  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.redirect(`${base}/admin/login`);

  try {
    await completeAuthorization(
      provider as OAuthProviderSlug,
      {
        code: req.nextUrl.searchParams.get("code"),
        state: req.nextUrl.searchParams.get("state"),
        error: req.nextUrl.searchParams.get("error"),
      },
      req.cookies.get(OAUTH_COOKIE)?.value,
    );
    await audit(admin.id, "integration.connected", "CalendarIntegration", provider);
    return back(`connected=${provider}`);
  } catch (err) {
    logger.warn("oauth_callback_failed", { provider, message: (err as Error).message });
    const msg = err instanceof DomainError ? err.message : "No se pudo completar la conexión.";
    return back(`error=${encodeURIComponent(msg)}`);
  }
}
