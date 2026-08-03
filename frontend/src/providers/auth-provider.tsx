"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";

const AUTH_PAGES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

const VERIFICATION_PAGES = [
  "/verify-account",
  "/verify-otp",
  "/verify-email",
];

function isPublicPath(pathname: string) {
  const publicPrefixes = [
    "/products",
    "/services",
    "/jobs",
    "/articles",
    "/store",
    "/browse",
  ];
  const publicExact = [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/verify-account",
    "/verify-otp",
    "/terms",
    "/privacy",
    "/account-suspended",
  ];
  return (
    publicExact.includes(pathname) ||
    publicPrefixes.some((p) => pathname.startsWith(p))
  );
}

function getDashboardPath(role?: string) {
  if (role === "SELLER") return "/seller/dashboard";
  if (role === "ADMIN" || role === "SUPER_ADMIN") return "/admin";
  return "/"; // BUYER - redirect to homepage
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { fetchUser, isLoading, isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Redirect logic
  useEffect(() => {
    if (isLoading) return;

    console.log('🔐 [AUTH PROVIDER] Redirect check:', {
      pathname,
      isAuthenticated,
      isLoading,
      userRole: user?.role,
      isAuthPage: AUTH_PAGES.includes(pathname),
      isVerificationPage: VERIFICATION_PAGES.includes(pathname),
      isPublicPath: isPublicPath(pathname),
    });

    // If authenticated and on auth pages (login/register), redirect to dashboard
    // BUT allow verification pages even if authenticated (for edge cases)
    if (isAuthenticated && AUTH_PAGES.includes(pathname) && user) {
      const redirectPath = getDashboardPath(user?.role);
      console.log('🔄 [AUTH PROVIDER] Redirecting authenticated user from auth page to:', redirectPath);
      router.replace(redirectPath);
      return;
    }

    // If not authenticated and on protected page (not public and not verification), redirect to login
    if (!isAuthenticated && !isPublicPath(pathname) && !VERIFICATION_PAGES.includes(pathname)) {
      const search =
        typeof window !== "undefined" ? window.location.search : "";
      const returnUrl = `${pathname}${search}`;
      console.log('🔄 [AUTH PROVIDER] Redirecting unauthenticated user to login with returnUrl:', returnUrl);
      router.replace(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
    }
  }, [isLoading, isAuthenticated, pathname, router, user]);

  // Only show loading spinner for PROTECTED pages
  // Public pages (beranda, products, login, register, verification, etc.) render immediately
  if (isLoading && !isPublicPath(pathname) && !VERIFICATION_PAGES.includes(pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  return <>{children}</>;
}
