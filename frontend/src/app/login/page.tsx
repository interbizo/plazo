"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth.store";
import { getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Turnstile, TurnstileRef } from "@/components/ui/turnstile";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { PageTitle } from "@/components/shared/page-title";
import { Spinner } from "@/components/ui/spinner";

function getSafeReturnUrl(url: string | null): string | null {
  if (!url || !url.startsWith("/")) return null;
  return url;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const turnstileRef = useRef<TurnstileRef>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  const referralCode = searchParams.get("ref");

  useEffect(() => {
    const url =
      getSafeReturnUrl(searchParams.get("returnUrl")) ??
      getSafeReturnUrl(searchParams.get("redirect"));
    setReturnUrl(url);
    if (referralCode && typeof window !== "undefined") {
      window.localStorage.setItem("affiliateReferralCode", referralCode);
    }
  }, [searchParams, referralCode]);

  const validate = () => {
    const errs: typeof errors = {};
    if (!email) errs.email = "Email wajib diisi";
    else if (!/\S+@\S+\.\S+/.test(email))
      errs.email = "Format email tidak valid";
    if (!password) errs.password = "Password wajib diisi";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (!turnstileToken) {
      toast.error("Mohon selesaikan verifikasi keamanan");
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password, turnstileToken);
      
      // Check if user is suspended
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.accountStatus === "SUSPENDED" || currentUser?.accountStatus === "UNDER_APPEAL") {
        return;
      }

      toast.success("Login berhasil!");

      if (returnUrl) {
        window.location.href = returnUrl;
      } else {
        const user = useAuthStore.getState().user;
        if (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") {
          window.location.href = "/admin";
        } else {
          window.location.href = "/";
        }
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
      turnstileRef.current?.reset();
      setTurnstileToken("");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-12">
      <PageTitle title="Masuk" />
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Masuk ke Plazo
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Belum punya akun?{" "}
            <Link
              href={
                returnUrl
                  ? `/register?returnUrl=${encodeURIComponent(returnUrl)}${referralCode ? `&ref=${encodeURIComponent(referralCode)}` : ""}`
                  : referralCode
                    ? `/register?ref=${encodeURIComponent(referralCode)}`
                    : "/register"
              }
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Daftar gratis
            </Link>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors ${
                errors.email
                  ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              }`}
            />
            {errors.email && (
              <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-blue-600 hover:text-blue-500"
              >
                Lupa password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className={`w-full rounded-lg border bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors ${
                  errors.password
                    ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>
            )}
          </div>

          {/* Turnstile */}
          <div className="flex justify-center">
            <Turnstile
              ref={turnstileRef}
              onSuccess={(token) => setTurnstileToken(token)}
              onError={() => {
                setTurnstileToken("");
                toast.error("Verifikasi keamanan gagal. Silakan coba lagi.");
              }}
              onExpire={() => {
                setTurnstileToken("");
              }}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isLoading}
            disabled={!turnstileToken}
          >
            Masuk
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[85vh]">
        <Spinner />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
