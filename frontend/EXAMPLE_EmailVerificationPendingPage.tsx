/**
 * Email Verification Pending Page
 * Path: /verify-email
 * 
 * Shows status after email sent, with resend option
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';

export default function EmailVerificationPendingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email') || localStorage.getItem('pendingVerificationEmail');
    if (emailParam) {
      setEmail(emailParam);
      setEmailSent(true);
    }

    // If token in URL, auto-verify
    if (token) {
      verifyEmail(token);
    }
  }, [searchParams, token]);

  // Countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const verifyEmail = async (verificationToken: string) => {
    setVerifying(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/email/verify', {
        token: verificationToken,
      });

      if (response.data.success) {
        setSuccess(true);
        localStorage.removeItem('pendingVerificationEmail');
        
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verifikasi gagal. Token mungkin sudah kadaluarsa.');
    } finally {
      setVerifying(false);
    }
  };

  const resendEmail = async () => {
    if (!email) {
      setError('Email tidak ditemukan');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/email/resend-verification', {
        email,
      });

      if (response.data.success) {
        setEmailSent(true);
        alert('Email verifikasi telah dikirim ulang. Silakan cek inbox Anda.');
      } else if (response.data.cooldown) {
        setCooldown(response.data.cooldown);
        setError(response.data.message);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mengirim email');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-lg text-gray-700">Memverifikasi email...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
              <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Email Terverifikasi!</h3>
            <p className="text-gray-600 mb-6">
              Akun Anda telah aktif. Anda akan diarahkan ke halaman login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-blue-100 mb-6">
              <svg className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Cek Email Anda
            </h2>
            <p className="text-gray-600">
              Kami telah mengirim link verifikasi ke
            </p>
            {email && (
              <p className="text-blue-600 font-semibold mt-2">
                {email}
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 rounded-xl p-6 mb-6">
            <h3 className="text-sm font-semibold text-blue-900 mb-3">
              Langkah selanjutnya:
            </h3>
            <ol className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-xs font-bold mr-3">1</span>
                <span>Buka inbox email Anda</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-xs font-bold mr-3">2</span>
                <span>Cari email dari Plazo Marketplace</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-xs font-bold mr-3">3</span>
                <span>Klik tombol "Verifikasi Email Saya"</span>
              </li>
            </ol>
          </div>

          {/* Resend Button */}
          <div className="space-y-4">
            <button
              onClick={resendEmail}
              disabled={loading || cooldown > 0}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                'Mengirim...'
              ) : cooldown > 0 ? (
                `Kirim Ulang dalam ${cooldown} detik`
              ) : (
                'Kirim Ulang Email'
              )}
            </button>

            <button
              onClick={() => router.push('/verify-account')}
              className="w-full bg-white text-gray-700 py-3 px-4 rounded-lg font-medium border-2 border-gray-300 hover:border-gray-400 transition-colors"
            >
              Ganti Metode Verifikasi
            </button>
          </div>

          {/* Tips */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-600 mb-2 font-semibold">💡 Tips:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Cek folder spam/junk jika email tidak ditemukan</li>
              <li>• Link verifikasi berlaku selama 24 jam</li>
              <li>• Pastikan email Anda aktif dan dapat menerima email</li>
            </ul>
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
