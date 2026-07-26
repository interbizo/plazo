/**
 * Email Verification Page
 * Path: /verify-email
 * 
 * This page handles email verification after user registration.
 * User receives verification link via email and clicks it to verify.
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [email, setEmail] = useState('');

  // Auto-verify if token is present in URL
  useEffect(() => {
    if (token) {
      verifyEmail(token);
    }
  }, [token]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => {
        setCooldown(cooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const verifyEmail = async (verificationToken: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/email/verify', {
        token: verificationToken,
      });

      if (response.data.success) {
        setSuccess(true);
        // Redirect to OTP verification page after 2 seconds
        setTimeout(() => {
          router.push('/verify-otp');
        }, 2000);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Verifikasi email gagal. Token mungkin sudah kadaluarsa.'
      );
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    if (!email) {
      setError('Silakan masukkan email Anda');
      return;
    }

    setResendLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/email/resend-verification', {
        email,
      });

      if (response.data.success) {
        alert('Email verifikasi telah dikirim. Silakan cek inbox Anda.');
      } else if (response.data.cooldown) {
        setCooldown(response.data.cooldown);
        setError(response.data.message);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Gagal mengirim email verifikasi'
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verifikasi Email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Silakan verifikasi email Anda untuk melanjutkan
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {loading && (
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-sm text-gray-600">Memverifikasi email...</p>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-green-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Email berhasil diverifikasi!
                  </h3>
                  <p className="mt-2 text-sm text-green-700">
                    Anda akan diarahkan ke halaman verifikasi WhatsApp...
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          {!token && !success && (
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                />
              </div>

              <div>
                <button
                  onClick={resendVerificationEmail}
                  disabled={resendLoading || cooldown > 0}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {resendLoading ? (
                    'Mengirim...'
                  ) : cooldown > 0 ? (
                    `Tunggu ${cooldown} detik`
                  ) : (
                    'Kirim Ulang Email Verifikasi'
                  )}
                </button>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Belum menerima email?{' '}
                  <span className="font-medium text-indigo-600">
                    Cek folder spam Anda
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
