/**
 * Verification Method Selection Page
 * Path: /verify-account
 * 
 * Modern, clean UI for choosing verification method after registration
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';

interface VerificationData {
  email?: string;
  phone?: string;
  firstName?: string;
  userId?: string;
}

export default function VerifyAccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [verificationData, setVerificationData] = useState<VerificationData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get verification data from URL params or localStorage
    const email = searchParams.get('email') || localStorage.getItem('pendingVerificationEmail');
    const phone = searchParams.get('phone') || localStorage.getItem('pendingVerificationPhone');
    const firstName = searchParams.get('firstName') || localStorage.getItem('pendingVerificationFirstName');
    const userId = searchParams.get('userId') || localStorage.getItem('pendingVerificationUserId');

    if (!email && !phone) {
      setError('Data verifikasi tidak ditemukan. Silakan daftar ulang.');
      return;
    }

    setVerificationData({ email, phone, firstName, userId });
  }, [searchParams]);

  const handleSelectMethod = async (method: 'email' | 'phone') => {
    setLoading(true);
    setError('');

    try {
      if (method === 'email') {
        // Redirect to email verification pending page
        router.push(`/verify-email?email=${verificationData.email}`);
      } else {
        // Redirect to OTP verification page
        router.push(`/verify-otp?phone=${verificationData.phone}`);
      }
    } catch (err: any) {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (error && !verificationData.email && !verificationData.phone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Tidak Ditemukan</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/register')}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Kembali ke Registrasi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-4">
            <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Verifikasi Akun Anda
          </h1>
          <p className="text-lg text-gray-600">
            Pilih metode verifikasi yang Anda inginkan
          </p>
          {verificationData.firstName && (
            <p className="text-sm text-gray-500 mt-2">
              Halo, <span className="font-semibold">{verificationData.firstName}</span>!
            </p>
          )}
        </div>

        {/* Verification Methods */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Email Verification */}
          {verificationData.email && (
            <button
              onClick={() => handleSelectMethod('email')}
              disabled={loading}
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 text-left disabled:opacity-50 disabled:cursor-not-allowed border-2 border-transparent hover:border-blue-500"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
                  <svg className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Verifikasi via Email
                </h3>
                
                <p className="text-gray-600 text-sm mb-4">
                  Kami akan mengirim link verifikasi ke email Anda
                </p>
                
                <div className="bg-blue-50 rounded-lg px-4 py-2 mb-4">
                  <p className="text-sm font-medium text-blue-900 truncate">
                    {verificationData.email}
                  </p>
                </div>
                
                <div className="flex items-center text-sm text-gray-500">
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Berlaku 24 jam
                </div>
              </div>
              
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </button>
          )}

          {/* WhatsApp OTP Verification */}
          {verificationData.phone && (
            <button
              onClick={() => handleSelectMethod('phone')}
              disabled={loading}
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 text-left disabled:opacity-50 disabled:cursor-not-allowed border-2 border-transparent hover:border-green-500"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 group-hover:bg-green-600 transition-colors">
                  <svg className="w-8 h-8 text-green-600 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Verifikasi via WhatsApp
                </h3>
                
                <p className="text-gray-600 text-sm mb-4">
                  Kami akan mengirim kode OTP ke WhatsApp Anda
                </p>
                
                <div className="bg-green-50 rounded-lg px-4 py-2 mb-4">
                  <p className="text-sm font-medium text-green-900">
                    {verificationData.phone}
                  </p>
                </div>
                
                <div className="flex items-center text-sm text-gray-500">
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Berlaku 1 menit
                </div>
              </div>
              
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </button>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Informasi Penting
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Anda hanya perlu memverifikasi <strong>salah satu</strong> metode</li>
                <li>• Pilih metode yang paling mudah untuk Anda</li>
                <li>• Akun akan aktif setelah verifikasi berhasil</li>
                <li>• Anda bisa mengganti metode kapan saja</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/login')}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            ← Kembali ke Login
          </button>
        </div>
      </div>
    </div>
  );
}
