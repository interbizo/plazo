"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { authApi } from "@/services/auth.service";
import { getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, CheckCircle, MessageCircle, Mail } from "lucide-react";
import toast from "react-hot-toast";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneParam = searchParams.get("phone") || "";
  const tokenParam = searchParams.get("token") || "";
  const codeParam = searchParams.get("code") || "";

  // Determine reset method based on params
  const isEmailReset = !!tokenParam;
  const isOtpReset = !!phoneParam;

  const [phone, setPhone] = useState(phoneParam);
  const [code, setCode] = useState(codeParam);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cooldown, setCooldown] = useState(0);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  // Verify email token on mount
  useEffect(() => {
    if (isEmailReset && tokenParam) {
      verifyToken();
    }
  }, [isEmailReset, tokenParam]);

  const verifyToken = async () => {
    try {
      await api.post('/auth/email/verify-reset-token', { token: tokenParam });
      setTokenValid(true);
    } catch (err) {
      setTokenValid(false);
      toast.error("Link reset password tidak valid atau sudah kadaluarsa");
    }
  };

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const validateOtp = () => {
    const errs: Record<string, string> = {};
    if (!phone) errs.phone = "Nomor WhatsApp wajib diisi";
    if (!code) errs.code = "Kode OTP wajib diisi";
    if (!password) errs.password = "Password baru wajib diisi";
    else if (password.length < 8) errs.password = "Password minimal 8 karakter";
    if (password !== confirmPassword)
      errs.confirmPassword = "Password tidak cocok";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateEmail = () => {
    const errs: Record<string, string> = {};
    if (!password) errs.password = "Password baru wajib diisi";
    else if (password.length < 8) errs.password = "Password minimal 8 karakter";
    if (password !== confirmPassword)
      errs.confirmPassword = "Password tidak cocok";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleResendOTP = async () => {
    if (!phone) {
      toast.error("Nomor WhatsApp wajib diisi");
      return;
    }

    try {
      await authApi.forgotPasswordOtp(phone);
      toast.success("Kode OTP telah dikirim ulang ke WhatsApp Anda");
      setCooldown(60);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleSubmitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateOtp()) return;

    setIsLoading(true);
    try {
      await authApi.resetPasswordOtp(phone, code, password);
      setIsSuccess(true);
      toast.success("Password berhasil diubah!");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail()) return;

    setIsLoading(true);
    try {
      await api.post('/auth/email/reset-password', {
        token: tokenParam,
        newPassword: password,
      });
      setIsSuccess(true);
      toast.success("Password berhasil diubah!");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Success state (same for both methods)
  if (isSuccess) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Password Diubah</h1>
          <p className="mt-2 text-sm text-gray-600">
            Password Anda berhasil diubah. Silakan login dengan password baru.
          </p>
          <div className="mt-6">
            <Button onClick={() => router.push("/login")} size="lg">
              Masuk Sekarang
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Email reset flow
  if (isEmailReset) {
    if (tokenValid === null) {
      return (
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      );
    }

    if (tokenValid === false) {
      return (
        <div className="flex min-h-[80vh] items-center justify-center px-4">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <Mail className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Link Tidak Valid</h1>
            <p className="mt-2 text-sm text-gray-600">
              Link reset password tidak valid atau sudah kadaluarsa.
            </p>
            <div className="mt-6 space-y-3">
              <Button onClick={() => router.push("/forgot-password")} size="lg">
                Minta Link Baru
              </Button>
              <Link
                href="/login"
                className="block text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                ← Kembali ke halaman login
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
            <p className="mt-2 text-sm text-gray-600">
              Masukkan password baru untuk akun Anda.
            </p>
          </div>

          <form onSubmit={handleSubmitEmail} className="space-y-5">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password Baru
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  placeholder="Minimal 8 karakter"
                  autoComplete="new-password"
                  className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 ${
                    errors.password
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Konfirmasi Password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }}
                placeholder="Ulangi password baru"
                autoComplete="new-password"
                className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 ${
                  errors.confirmPassword
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              Reset Password
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              ← Kembali ke halaman login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // OTP reset flow (existing)
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
            <MessageCircle className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
          <p className="mt-2 text-sm text-gray-600">
            Masukkan kode OTP yang dikirim ke WhatsApp Anda dan password baru.
          </p>
        </div>

        <form onSubmit={handleSubmitOtp} className="space-y-5">
          <Input
            id="phone"
            type="tel"
            label="Nomor WhatsApp"
            placeholder="08123456789"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setErrors((prev) => ({ ...prev, phone: "" }));
            }}
            error={errors.phone}
            autoComplete="tel"
          />

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="code"
                className="block text-sm font-medium text-gray-700"
              >
                Kode OTP
              </label>
              {cooldown > 0 ? (
                <span className="text-xs text-gray-500">
                  Kirim ulang dalam {cooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOTP}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Kirim Ulang OTP
                </button>
              )}
            </div>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setErrors((prev) => ({ ...prev, code: "" }));
              }}
              placeholder="Masukkan 6 digit kode OTP"
              maxLength={6}
              autoComplete="one-time-code"
              className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 ${
                errors.code
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              }`}
            />
            {errors.code && (
              <p className="mt-1 text-sm text-red-600">{errors.code}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password Baru
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, password: "" }));
                }}
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
                className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 ${
                  errors.password
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Konfirmasi Password
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors((prev) => ({ ...prev, confirmPassword: "" }));
              }}
              placeholder="Ulangi password baru"
              autoComplete="new-password"
              className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 ${
                errors.confirmPassword
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              }`}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-xs text-blue-800">
              <strong>Catatan:</strong> Kode OTP berlaku selama 1 menit. Jika tidak menerima kode,
              klik "Kirim Ulang OTP".
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isLoading}
          >
            Reset Password
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            ← Kembali ke halaman login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
