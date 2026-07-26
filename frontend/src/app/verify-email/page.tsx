"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/services/auth.service";
import { getErrorMessage } from "@/lib/api";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "no-token"
  >(token ? "loading" : "no-token");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;

    const verify = async () => {
      try {
        const response = await authApi.verifyEmail(token);
        setStatus("success");
        setMessage(
          "Email Anda berhasil diverifikasi! Mengalihkan ke dashboard...",
        );
        
        // Clear pending verification from sessionStorage
        sessionStorage.removeItem('pendingVerification');
        
        // Auto-login with returned tokens
        if (response.data.accessToken && response.data.refreshToken) {
          const { tokenStorage } = await import('@/lib/api');
          tokenStorage.setTokens(response.data.accessToken, response.data.refreshToken);
          
          // Redirect to dashboard based on role
          setTimeout(() => {
            if (response.data.user?.role === 'SELLER') {
              window.location.href = '/seller/dashboard';
            } else if (response.data.user?.role === 'ADMIN' || response.data.user?.role === 'SUPER_ADMIN') {
              window.location.href = '/admin';
            } else {
              // BUYER - redirect to homepage
              window.location.href = '/';
            }
          }, 2000);
        } else {
          // Fallback to login if no tokens
          setTimeout(() => {
            window.location.href = '/login?verified=true';
          }, 2000);
        }
      } catch (err) {
        setStatus("error");
        setMessage(getErrorMessage(err));
      }
    };

    verify();
  }, [token]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          <h1 className="mt-4 text-xl font-bold text-gray-900">
            Memverifikasi Email...
          </h1>
          <p className="mt-2 text-sm text-gray-600">Mohon tunggu sebentar.</p>
        </div>
      </div>
    );
  }

  if (status === "no-token") {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
            <XCircle className="h-8 w-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Link Tidak Valid</h1>
          <p className="mt-2 text-sm text-gray-600">
            Token verifikasi tidak ditemukan. Pastikan Anda mengklik link dari
            email verifikasi.
          </p>
          <div className="mt-6">
            <Link href="/login">
              <Button>Ke Halaman Login</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {status === "success" ? (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Email Terverifikasi!
            </h1>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
            <div className="mt-6">
              <div className="inline-flex items-center gap-2 text-blue-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Mengalihkan ke dashboard...</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Verifikasi Gagal
            </h1>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
            <div className="mt-6 space-y-3">
              <Link href="/login" className="block">
                <Button size="lg" className="w-full">
                  Ke Halaman Login
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
