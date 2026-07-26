"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/services/auth.service";
import api from "@/lib/api";
import { getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, MessageSquare, ArrowLeft, CheckCircle, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

type ResetMethod = 'email' | 'whatsapp' | null;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(""); // Email or Phone
  const [method, setMethod] = useState<ResetMethod>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");

  const handleEmailReset = async () => {
    if (!identifier) {
      setError("Email wajib diisi");
      return;
    }

    // Validate email format
    if (!/\S+@\S+\.\S+/.test(identifier)) {
      setError("Format email tidak valid");
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/email/forgot-password', { email: identifier });
      setEmailSent(true);
      toast.success("Link reset password telah dikirim ke email Anda");
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsAppReset = async () => {
    if (!identifier) {
      setError("Nomor WhatsApp wajib diisi");
      return;
    }

    // Validate phone format
    if (!/^(\+62|62|0)[0-9]{9,13}$/.test(identifier.replace(/[\s-]/g, ''))) {
      setError("Format nomor WhatsApp tidak valid");
      return;
    }

    setIsLoading(true);
    try {
      const cleanPhone = identifier.replace(/[\s-]/g, '');
      await authApi.forgotPasswordOtp(cleanPhone);
      setOtpSent(true);
      toast.success("Kode OTP telah dikirim ke WhatsApp Anda");
      
      // Redirect to verify OTP page
      setTimeout(() => {
        router.push(`/verify-otp?phone=${encodeURIComponent(cleanPhone)}&type=FORGOT_PASSWORD`);
      }, 1500);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setIsLoading(true);
    try {
      await api.post('/auth/email/forgot-password', { email: identifier });
      toast.success("Link reset password telah dikirim ulang");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // If method not selected yet, show method selection
  if (!method) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke login
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Lupa Password</h1>
            <p className="mt-2 text-sm text-gray-600">
              Pilih metode untuk reset password Anda
            </p>
          </div>

          <div className="space-y-4">
            {/* Email Method */}
            <button
              onClick={() => setMethod('email')}
              className="w-full border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-colors text-left"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Reset via Email
                  </h3>
                  <p className="text-sm text-gray-600">
                    Kami akan mengirim link reset password ke email Anda
                  </p>
                </div>
              </div>
            </button>

            {/* WhatsApp Method */}
            <button
              onClick={() => setMethod('whatsapp')}
              className="w-full border-2 border-gray-200 rounded-xl p-6 hover:border-green-300 transition-colors text-left"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Reset via WhatsApp OTP
                  </h3>
                  <p className="text-sm text-gray-600">
                    Kami akan mengirim kode OTP ke nomor WhatsApp Anda
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Sudah punya akun?{" "}
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                Login di sini
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Email Reset Flow
  if (method === 'email') {
    if (emailSent) {
      return (
        <div className="flex min-h-[80vh] items-center justify-center px-4">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Email Terkirim</h1>
            <p className="mt-2 text-sm text-gray-600">
              Link reset password telah dikirim ke{" "}
              <span className="font-medium text-gray-900">{identifier}</span>.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Silakan cek inbox email Anda (dan folder spam jika tidak ada).
            </p>
            
            <div className="mt-6 space-y-3">
              <Button
                onClick={handleResendEmail}
                variant="outline"
                className="w-full"
                isLoading={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Kirim Ulang Email
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
          <button
            onClick={() => setMethod(null)}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Pilih metode lain
          </button>

          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Reset via Email</h1>
            <p className="mt-2 text-sm text-gray-600">
              Masukkan email yang terdaftar, kami akan mengirimkan link untuk reset password.
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleEmailReset(); }} className="space-y-5">
            <Input
              id="email"
              type="email"
              label="Email"
              placeholder="nama@email.com"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setError("");
              }}
              error={error}
              autoComplete="email"
            />

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-xs text-blue-800">
                <strong>💡 Catatan:</strong> Jika email tidak muncul di inbox, silakan cek folder <strong>Spam/Junk</strong> Anda.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              Kirim Link Reset Password
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Sudah punya akun?{" "}
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                Login di sini
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // WhatsApp OTP Reset Flow
  if (method === 'whatsapp') {
    if (otpSent) {
      return (
        <div className="flex min-h-[80vh] items-center justify-center px-4">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">OTP Terkirim</h1>
            <p className="mt-2 text-sm text-gray-600">
              Kode OTP telah dikirim ke WhatsApp{" "}
              <span className="font-medium text-gray-900">{identifier}</span>.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Anda akan diarahkan ke halaman input OTP...
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-md">
          <button
            onClick={() => setMethod(null)}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Pilih metode lain
          </button>

          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
              <MessageSquare className="h-6 w-6 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Reset via WhatsApp</h1>
            <p className="mt-2 text-sm text-gray-600">
              Masukkan nomor WhatsApp yang terdaftar, kami akan mengirimkan kode OTP
              untuk reset password.
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleWhatsAppReset(); }} className="space-y-5">
            <Input
              id="phone"
              type="tel"
              label="Nomor WhatsApp"
              placeholder="08123456789"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setError("");
              }}
              error={error}
              autoComplete="tel"
            />

            <div className="rounded-lg bg-green-50 border border-green-200 p-3">
              <p className="text-xs text-green-800">
                <strong>Catatan:</strong> Pastikan nomor WhatsApp Anda aktif dan dapat menerima pesan.
                Kode OTP akan dikirim melalui WhatsApp.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              Kirim Kode OTP
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Sudah punya akun?{" "}
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                Login di sini
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
