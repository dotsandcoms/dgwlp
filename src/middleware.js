import { NextResponse } from "next/server";

/**
 * Security middleware:
 * - Optional obscure admin path via NEXT_PUBLIC_ADMIN_PATH (e.g. /ops-doron)
 * - Direct /admin blocked when a custom path is configured
 * - noindex on private areas
 */
export function middleware(req) {
  const { pathname } = req.nextUrl;
  const configured = (
    process.env.NEXT_PUBLIC_ADMIN_PATH ||
    process.env.NEXT_ADMIN_PATH ||
    "/admin"
  ).replace(/\/$/, "") || "/admin";
  const customAdmin = configured !== "/admin";
  const slug = configured.replace(/^\//, "");

  if (customAdmin) {
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      return new NextResponse("Not Found", { status: 404 });
    }
    if (pathname === `/${slug}` || pathname.startsWith(`/${slug}/`)) {
      const url = req.nextUrl.clone();
      url.pathname = pathname.replace(new RegExp(`^/${escapeRe(slug)}`), "/admin") || "/admin";
      const res = NextResponse.rewrite(url);
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      return res;
    }
  }

  const sensitive =
    pathname.startsWith("/admin") ||
    (customAdmin && (pathname === `/${slug}` || pathname.startsWith(`/${slug}/`))) ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/order");

  if (sensitive) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  return NextResponse.next();
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const config = {
  matcher: [
    /*
     * Run on app routes; skip static assets.
     * Needed so a custom NEXT_PUBLIC_ADMIN_PATH (any slug) can be rewritten.
     */
    "/((?!_next/static|_next/image|favicon.ico|images/|robots.txt).*)",
  ],
};
