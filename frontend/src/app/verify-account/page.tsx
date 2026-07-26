"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, MessageSquare, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import api from "@/lib/api";

interface VerificationMethod {
  available: boolean;
  sent: boolean;
  address?: string;
  number?: string;
}

interface VerificationData {
  user: {
    id: string;
    email: string;
    phone?: string;
    whatsappNumber?: string;
    firstName: string;
    lastName: string;
  };
  verificationMethods: {
    email: VerificationMethod;
    phone: VerificationMethod;
  };
  nextStep?: {
    action: string;
    redirectTo: string;
    message: string;
  };
}

export default function VerifyAccountPage() {
  const router = useRouter();
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    // Get verification data from sessionStorage
    const storedData = sessionStorage.getItem('pendingVerification');
    console.log('📦 [VERIFY-ACCOUNT] Raw stored data:', storedData);
    
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        console.log('📦 [VERIFY-ACCOUNT] Parsed data:', data);
        console.log('📦 [VERIFY-ACCOUNT] User phone:', data.user?.phone);
        console.log('📦 [VERIFY-ACCOUNT] User whatsappNumber:', data.user?.whatsappNumber);
        
        // Check if user is already verified/active - if so, clear and redirect
        if (data.user?.isActive || data.user?.isEmailVerified || data.user?.isPhoneVerified) {
          sessionStorage.removeItem('pendingVerification');
          toast.success('Akun Anda sudah terverifikasi');
          router.push('/login');
          return;
        }
        
        setVerificationData(data);
        // Check if already sent from backend
        setEmailSent(data.verificationMethods?.email?.sent || false);
        setOtpSent(data.verificationMethods?.phone?.sent || false);
      } catch (error) {
        console.error('Failed to parse verification data:', error);
        toast.error('Data verifikasi tidak valid');
        router.push('/register');
      }
    } else {
      // No verification data, redirect to register
      toast.error('Silakan daftar terlebih dahulu');
      router.push('/register');
    }
  }, [router]);

  const handleSendEmail = async () => {
    if (!verificationData?.user.email) return;
    
    setIsSendingEmail(true);
    try {
      await api.post('/auth/email/resend-verification', {
        email: verificationData.user.email
      });
      setEmailSent(true);
      toast.success('Email verifikasi telah dikirim! Silakan cek inbox Anda.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal mengirim email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendOTP = async () => {
    // Try multiple sources for phone number
    const phoneNumber = verificationData?.user.phone 
      || verificationData?.user.whatsappNumber 
      || verificationData?.verificationMethods?.phone?.number;
    
    console.log('📞 [VERIFY-ACCOUNT] handleSendOTP called');
    console.log('📞 [VERIFY-ACCOUNT] verificationData:', verificationData);
    console.log('📞 [VERIFY-ACCOUNT] user.phone:', verificationData?.user.phone);
    console.log('📞 [VERIFY-ACCOUNT] user.whatsappNumber:', verificationData?.user.whatsappNumber);
    console.log('📞 [VERIFY-ACCOUNT] verificationMethods.phone.number:', verificationData?.verificationMethods?.phone?.number);
    console.log('📞 [VERIFY-ACCOUNT] final phoneNumber:', phoneNumber);
    
    if (!phoneNumber) {
      console.error('❌ [VERIFY-ACCOUNT] No phone number found!');
      console.error('❌ [VERIFY-ACCOUNT] Full verificationData:', JSON.stringify(verificationData, null, 2));
      toast.error('Nomor WhatsApp tidak ditemukan. Silakan daftar ulang.');
      setTimeout(() => {
        router.push('/register');
      }, 2000);
      return;
    }
    
    setIsSendingOTP(true);
    try {
      console.log('📤 [VERIFY-ACCOUNT] Sending OTP to:', phoneNumber);
      const response = await api.post('/api/auth/resend-otp', {
        phone: phoneNumber,
        type: 'REGISTRATION'
      });
      console.log('✅ [VERIFY-ACCOUNT] OTP sent successfully:', response.data);
      
      setOtpSent(true);
      toast.success('Kode OTP telah dikirim ke WhatsApp Anda!');
      
      // Validate phone number before redirect
      if (!phoneNumber || phoneNumber === 'undefined' || phoneNumber === 'null') {
        console.error('❌ [VERIFY-ACCOUNT] Invalid phone number for redirect:', phoneNumber);
        toast.error('Nomor WhatsApp tidak valid');
        return;
      }
      
      // Auto redirect to OTP input page after sending
      setTimeout(() => {
        const encodedPhone = encodeURIComponent(phoneNumber);
        const redirectUrl = `/verify-otp?phone=${encodedPhone}&type=REGISTRATION`;
        console.log('🔄 [VERIFY-ACCOUNT] Redirecting to:', redirectUrl);
        router.push(redirectUrl);
      }, 1500);
    } catch (error: any) {
      console.error('❌ [VERIFY-ACCOUNT] Error sending OTP:', error);
      console.error('❌ [VERIFY-ACCOUNT] Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Gagal mengirim OTP');
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleResendEmail = async () => {
    if (!verificationData?.user.email) return;
    
    setIsSendingEmail(true);
    try {
      await api.post('/auth/email/resend-verification', {
        email: verificationData.user.email
      });
      toast.success('Email verifikasi telah dikirim ulang!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal mengirim email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleResendOTP = async () => {
    const phoneNumber = verificationData?.user.phone 
      || verificationData?.user.whatsappNumber 
      || verificationData?.verificationMethods?.phone?.number;
      
    if (!phoneNumber) {
      toast.error('Nomor WhatsApp tidak ditemukan');
      return;
    }
    
    setIsSendingOTP(true);
    try {
      await api.post('/api/auth/resend-otp', {
        phone: phoneNumber,
        type: 'REGISTRATION'
      });
      toast.success('Kode OTP telah dikirim ulang!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal mengirim OTP');
    } finally {
      setIsSendingOTP(false);
    }
  };

  if (!verificationData) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  const { user, verificationMethods } = verificationData;

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Registrasi Berhasil!
          </h1>
          <p className="text-gray-600">
            Halo <span className="font-semibold">{user.firstName} {user.lastName}</span>, 
            akun Anda telah dibuat. Silakan pilih metode verifikasi untuk mengaktifkan akun.
          </p>
        </div>

        {/* Verification Methods */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Email Verification */}
          <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-colors">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  Verifikasi Email
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {verificationMethods.email.address}
                </p>
                
                {emailSent ? (
                  <div className="flex items-center gap-2 text-sm text-green-600 mb-3">
                    <CheckCircle className="h-4 w-4" />
                    <span>Email verifikasi telah dikirim</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <Mail className="h-4 w-4" />
                    <span>Belum dikirim</span>
                  </div>
                )}

                <div className="space-y-2">
                  {!emailSent ? (
                    <Button
                      onClick={handleSendEmail}
                      className="w-full"
                      size="sm"
                      isLoading={isSendingEmail}
                    >
                      Kirim Email Verifikasi
                    </Button>
                  ) : (
                    <>
                      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-800">
                          <strong>💡 Catatan:</strong> Jika email tidak muncul di inbox, silakan cek folder <strong>Spam/Junk</strong> Anda.
                        </p>
                      </div>
                      <Button
                        onClick={() => toast.success('Silakan cek inbox email Anda')}
                        className="w-full"
                        size="sm"
                        variant="outline"
                      >
                        Cek Email Saya
                      </Button>
                      <Button
                        onClick={handleResendEmail}
                        className="w-full"
                        size="sm"
                        variant="ghost"
                        isLoading={isSendingEmail}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Kirim Ulang Email
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* WhatsApp OTP Verification */}
          <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-green-300 transition-colors">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  Verifikasi WhatsApp
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {verificationMethods.phone.number || verificationData?.user.phone || verificationData?.user.whatsappNumber || 'Nomor tidak tersedia'}
                </p>
                
                {otpSent ? (
                  <div className="flex items-center gap-2 text-sm text-green-600 mb-3">
                    <CheckCircle className="h-4 w-4" />
                    <span>Kode OTP telah dikirim</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <MessageSquare className="h-4 w-4" />
                    <span>Belum dikirim</span>
                  </div>
                )}

                <div className="space-y-2">
                  {!otpSent ? (
                    <Button
                      onClick={handleSendOTP}
                      className="w-full"
                      size="sm"
                      isLoading={isSendingOTP}
                    >
                      Kirim Kode OTP
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => {
                          const phoneNumber = verificationData.user.phone 
                            || verificationData.user.whatsappNumber 
                            || verificationData?.verificationMethods?.phone?.number;
                          if (phoneNumber && phoneNumber !== 'undefined' && phoneNumber !== 'null') {
                            router.push(`/verify-otp?phone=${encodeURIComponent(phoneNumber)}&type=REGISTRATION`);
                          } else {
                            toast.error('Nomor WhatsApp tidak valid');
                          }
                        }}
                        className="w-full"
                        size="sm"
                      >
                        Masukkan Kode OTP
                      </Button>
                      <Button
                        onClick={handleResendOTP}
                        className="w-full"
                        size="sm"
                        variant="ghost"
                        isLoading={isSendingOTP}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Kirim Ulang OTP
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-blue-900 mb-2">
            💡 Tips Verifikasi
          </h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Pilih salah satu metode verifikasi (Email atau WhatsApp)</li>
            <li>• Verifikasi WhatsApp lebih cepat (instant)</li>
            <li>• Cek folder spam jika email tidak masuk</li>
            <li>• Kode OTP berlaku selama 5 menit</li>
          </ul>
        </div>

        {/* Back to Login */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Sudah verifikasi?{" "}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Masuk ke Akun
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
