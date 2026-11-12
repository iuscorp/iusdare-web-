import { NextResponse, type NextRequest } from "next/server";

/**
 * Filtro barato: si no hay cookie de sesión, redirige /admin/* al login.
 * La validación real de la sesión se hace en el servidor con requireAdmin().
 */
const PUBLIC_ADMIN = ["/admin/login", "/admin/setup"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_ADMIN.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();
  if (!req.cookies.get("sb_admin")?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
