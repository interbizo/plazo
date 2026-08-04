import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSubdomainFromHostname } from "@/lib/domain";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/verify-account",
  "/verify-otp",
  "/products",
  "/services",
  "/jobs",
  "/articles",
  "/store",
  "/terms",
  "/privacy",
];

const AUTH_PAGES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(p + "/")),
  );
}

/**
 * Check if a JWT token is still valid by decoding the exp claim.
 * Does NOT verify the signature — just checks expiry.
 */
function isTokenValid(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const base64 = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    const payload = JSON.parse(atob(base64));
    if (!payload.exp) return false;
    // Token is valid if expiry is in the future (with 10s buffer)
    return payload.exp * 1000 > Date.now() + 10_000;
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  // Skip static/api/next internal paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin-api") ||
    pathname.includes(".") // static files
  ) {
    return NextResponse.next();
  }

  const subdomain = getSubdomainFromHostname(hostname);
  if (subdomain) {
    if (pathname.startsWith(`/store/${subdomain}`)) {
      return NextResponse.next();
    }

    const storePath =
      pathname === "/" ? `/store/${subdomain}` : `/store/${subdomain}${pathname}`;
    const url = request.nextUrl.clone();
    url.pathname = storePath;
    return NextResponse.rewrite(url);
  }

  const token = request.cookies.get("token")?.value;
  const hasValidToken = token ? isTokenValid(token) : false;


  // If token is expired/invalid, clear the cookie and treat as unauthenticated
  if (token && !hasValidToken) {

    const response = isPublicPath(pathname)
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("token");
    return response;
  }

  // Redirect authenticated users away from auth pages
  if (hasValidToken && AUTH_PAGES.includes(pathname)) {

    return NextResponse.redirect(new URL("/", request.url));
  }

  // Redirect unauthenticated users away from protected pages
  if (!hasValidToken && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
