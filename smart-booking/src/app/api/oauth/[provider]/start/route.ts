import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/server/env";
import { toErrorResponse } from "@/server/errors";
import { requireAdminApi } from "@/server/auth/session";
import { buildAuthorization, OAUTH_COOKIE, type OAuthProviderSlug } from "@/server/calendars/oauth";
import { enforceRateLimit, RATE_LIMITS } from "@/server/security/rate-limit";
import { clientFingerprint } from "@/server/security/request";
import { audit } from "@/server/audit";

export const dynamic = "force-dynamic";

/** GET /api/oauth/{google|microsoft}/start — solo administradores. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  try {
    const admin = await requireAdminApi();
    await enforceRateLimit(RATE_LIMITS.oauth, clientFingerprint(req));
    const { provider } = await ctx.params;
    if (provider !== "google" && provider !== "microsoft") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const { url, cookie } = buildAuthorization(provider as OAuthProviderSlug);
    await audit(admin.id, "integration.connect_started", "CalendarIntegration", provider);
    const res = NextResponse.redirect(url);
    res.cookies.set(OAUTH_COOKIE, cookie, {
      httpOnly: true,
      secure: env().APP_URL.startsWith("https://"),
      sameSite: "lax",
      path: `/api/oauth/${provider}`,
      maxAge: 600,
    });
    return res;
  } catch (err) {
    return toErrorResponse(err);
  }
}
