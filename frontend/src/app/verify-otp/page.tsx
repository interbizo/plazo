"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/services/auth.service";
import { OtpInput } from "@/components/auth/simple-otp-input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle, Phone, XCircle } from "lucide-react";
import toast from "react-hot-toast";

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone");
  const type = searchParams.get("type") as 'REGISTRATION' | 'FORGOT_PASSWORD' || 'REGISTRATION';

  console.log('📱 [VERIFY-OTP] Page loaded');
  console.log('📱 [VERIFY-OTP] phone param:', phone);
  console.log('📱 [VERIFY-OTP] phone type:', typeof phone);
  console.log('📱 [VERIFY-OTP] phone is null:', phone === null);
  console.log('📱 [VERIFY-OTP] phone is undefined string:', phone === 'undefined');
  console.log('📱 [VERIFY-OTP] type param:', type);
  console.log('📱 [VERIFY-OTP] searchParams:', Object.fromEntries(searchParams.entries()));
  console.log('📱 [VERIFY-OTP] full URL:', typeof window !== 'undefined' ? window.location.href : 'SSR');

  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [verified, setVerified] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Redirect if no phone
  useEffect(() => {
    console.log('📱 [VERIFY-OTP] useEffect checking phone:', phone);
    
    if (!phone || phone === 'undefined' || phone === 'null') {
      console.error('❌ [VERIFY-OTP] Invalid phone parameter:', phone);
      toast.error("Nomor WhatsApp tidak valid. Silakan daftar ulang.");
      
      setTimeout(() => {
        router.push("/register");
      }, 2000);
    }
  }, [phone, router]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error("Kode OTP harus 6 digit");
      return;
    }

    setIsVerifying(true);
    try {
      const { data } = await authApi.verifyOtp(phone!, otp, type);
      toast.success(data.message || "Verifikasi berhasil!");
      setVerified(true);

      // Clear pending verification from sessionStorage
      sessionStorage.removeItem('pendingVerification');

      // For registration, auto-login with returned tokens
      if (type === 'REGISTRATION' && data.accessToken && data.refreshToken) {
        // Store tokens
        const { tokenStorage } = await import('@/lib/api');
        tokenStorage.setTokens(data.accessToken, data.refreshToken);
        
        // Redirect to dashboard based on role
        setTimeout(() => {
          if (data.user?.role === 'SELLER') {
            window.location.href = '/seller/dashboard';
          } else if (data.user?.role === 'ADMIN' || data.user?.role === 'SUPER_ADMIN') {
            window.location.href = '/admin';
          } else {
            // BUYER - redirect to homepage
            window.location.href = '/';
          }
        }, 1500);
      } else if (type === 'FORGOT_PASSWORD') {
        // For password reset, redirect to reset password page
        setTimeout(() => {
          router.push(`/reset-password?phone=${encodeURIComponent(phone!)}&code=${otp}`);
        }, 1500);
      } else {
        // Fallback to login
        setTimeout(() => {
          router.push("/login?verified=true");
        }, 1500);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Kode OTP tidak valid");
      setOtp("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const { data } = await authApi.resendOtp(phone!, type);
      
      if (data.cooldown) {
        setCooldown(data.cooldown);
        toast.error(data.message);
      } else {
        toast.success(data.message || "Kode OTP baru telah dikirim");
        setCooldown(60); // Set cooldown 60 detik
        setOtp("");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal mengirim ulang OTP");
    } finally {
      setIsResending(false);
    }
  };

  if (!phone || phone === 'undefined' || phone === 'null') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Nomor Tidak Valid
          </h1>
          <p className="text-gray-600 mb-4">
            Nomor WhatsApp tidak ditemukan. Silakan daftar ulang.
          </p>
          <Button onClick={() => router.push('/register')}>
            Kembali ke Registrasi
          </Button>
        </div>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Verifikasi Berhasil!
          </h1>
          <p className="text-gray-600">
            {type === 'REGISTRATION' 
              ? 'Akun Anda telah aktif. Mengalihkan ke dashboard...'
              : 'Mengalihkan...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Phone className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Verifikasi WhatsApp
          </h1>
          <p className="text-gray-600">
            Masukkan kode OTP yang dikirim ke
          </p>
          <p className="font-semibold text-gray-900 mt-1">{phone}</p>
          <p className="text-sm text-gray-500 mt-2">
            Kode berlaku selama 1 menit
          </p>
        </div>

        <div className="space-y-6">
          <OtpInput
            value={otp}
            onChange={setOtp}
            length={6}
            disabled={isVerifying}
          />

          <Button
            onClick={handleVerify}
            disabled={otp.length !== 6 || isVerifying}
            isLoading={isVerifying}
            className="w-full"
          >
            Verifikasi
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Tidak menerima kode?
            </p>
            {cooldown > 0 ? (
              <p className="text-sm text-gray-500">
                Kirim ulang dalam <span className="font-semibold text-blue-600">{cooldown}s</span>
              </p>
            ) : (
              <Button
                variant="outline"
                onClick={handleResend}
                disabled={isResending}
                isLoading={isResending}
                className="w-full"
              >
                Kirim Ulang OTP
              </Button>
            )}
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={() => router.push("/register")}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Kembali ke registrasi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    }>
      <VerifyOtpContent />
    </Suspense>
  );
}
