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
  "/forum",
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

// Decode payload JWT tanpa memverifikasi signature. Digunakan untuk memeriksa expiry dan membaca role untuk keputusan redirect.
function decodeToken(token: string): { exp?: number; role?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

// Periksa apakah token JWT masih valid dengan decode klaim exp. TIDAK memverifikasi signature — hanya memeriksa expiry.
function isTokenValid(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload?.exp) return false;
  // Token valid jika expiry di masa depan (dengan buffer 10 detik)
  return payload.exp * 1000 > Date.now() + 10_000;
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
  const refreshToken = request.cookies.get("refresh_token")?.value;
  const hasValidToken = token ? isTokenValid(token) : false;
  const hasRefreshToken = !!refreshToken;

  // Paksa logout hanya jika access token (expired/invalid) DAN refresh token keduanya tidak ada. Jika refresh token masih ada, biarkan halaman render dan axios interceptor akan rotate access token secara otomatis. Ini mencegah site hard-logout pengguna (termasuk admin) saat access token expire — terutama saat maintenance mode.
  if (token && !hasValidToken && !hasRefreshToken) {
    const response = isPublicPath(pathname)
      ? NextResponse.next()
      : NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("token");
    return response;
  }

  // Redirect pengguna yang sudah login dari halaman auth. Admin/super admin menuju /admin (tetap bisa digunakan saat maintenance), lainnya menuju home.
  if (hasValidToken && AUTH_PAGES.includes(pathname)) {
    const payload = token ? decodeToken(token) : null;
    const role = payload?.role;
    const dest =
      role === "ADMIN" || role === "SUPER_ADMIN" ? "/admin" : "/";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // Redirect pengguna yang belum login dari halaman yang dilindungi
  if (!hasValidToken && !hasRefreshToken && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
