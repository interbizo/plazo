/**
 * Unified Verification Page with Method Selection
 * Path: /verify-account
 * 
 * User can choose to verify via Email or WhatsApp
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

enum VerificationMethod {
  EMAIL = 'email',
  PHONE = 'phone',
}

export default function UnifiedVerificationPage() {
  const router = useRouter();
  
  const [selectedMethod, setSelectedMethod] = useState<VerificationMethod | null>(null);
  const [identifier, setIdentifier] = useState(''); // Email or phone
  const [code, setCode] = useState(''); // OTP or token
  const [loading, setLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [availableMethods, setAvailableMethods] = useState<VerificationMethod[]>([
    VerificationMethod.EMAIL,
    VerificationMethod.PHONE,
  ]);

  // Countdown timer for cooldown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => {
        setCooldown(cooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Get available methods on mount
  useEffect(() => {
    const storedEmail = localStorage.getItem('pendingVerificationEmail');
    const storedPhone = localStorage.getItem('pendingVerificationPhone');
    
    if (storedEmail) {
      setIdentifier(storedEmail);
    } else if (storedPhone) {
      setIdentifier(storedPhone);
    }
  }, []);

  const sendVerificationCode = async () => {
    if (!selectedMethod) {
      setError('Silakan pilih metode verifikasi');
      return;
    }

    if (!identifier) {
      setError(
        selectedMethod === VerificationMethod.EMAIL
          ? 'Silakan masukkan email Anda'
          : 'Silakan masukkan nomor WhatsApp Anda'
      );
      return;
    }

    setSendLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/verify/resend', {
        method: selectedMethod,
        identifier,
      });

      if (response.data.success) {
        setCodeSent(true);
        alert(
          selectedMethod === VerificationMethod.EMAIL
            ? 'Kode verifikasi telah dikirim ke email Anda. Silakan cek inbox.'
            : 'Kode OTP telah dikirim ke WhatsApp Anda.'
        );
      } else if (response.data.cooldown) {
        setCooldown(response.data.cooldown);
        setError(response.data.message);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Gagal mengirim kode verifikasi'
      );
    } finally {
      setSendLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!code) {
      setError('Silakan masukkan kode verifikasi');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/verify/confirm', {
        method: selectedMethod,
        code,
        identifier: selectedMethod === VerificationMethod.PHONE ? identifier : undefined,
      });

      if (response.data.success) {
        setSuccess(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Verifikasi gagal. Silakan coba lagi.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verifikasi Akun
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Pilih metode verifikasi yang Anda inginkan
          </p>
        </div>

        {success ? (
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
                  Verifikasi berhasil!
                </h3>
                <p className="mt-2 text-sm text-green-700">
                  Akun Anda telah aktif. Anda akan diarahkan ke halaman login...
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
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

            {/* Method Selection */}
            {!selectedMethod && (
              <div className="space-y-4">
                <p className="text-center text-sm text-gray-700 font-medium">
                  Pilih metode verifikasi:
                </p>
                
                <button
                  onClick={() => setSelectedMethod(VerificationMethod.EMAIL)}
                  className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg
                    className="h-5 w-5 mr-2 text-indigo-600"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  Verifikasi via Email
                </button>

                <button
                  onClick={() => setSelectedMethod(VerificationMethod.PHONE)}
                  className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <svg
                    className="h-5 w-5 mr-2 text-green-600"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  Verifikasi via WhatsApp
                </button>
              </div>
            )}

            {/* Verification Form */}
            {selectedMethod && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">
                    Metode: {selectedMethod === VerificationMethod.EMAIL ? 'Email' : 'WhatsApp'}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedMethod(null);
                      setCodeSent(false);
                      setCode('');
                      setError('');
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    Ganti metode
                  </button>
                </div>

                {!codeSent ? (
                  <>
                    <div>
                      <label htmlFor="identifier" className="sr-only">
                        {selectedMethod === VerificationMethod.EMAIL ? 'Email' : 'Nomor WhatsApp'}
                      </label>
                      <input
                        id="identifier"
                        name="identifier"
                        type={selectedMethod === VerificationMethod.EMAIL ? 'email' : 'tel'}
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                        placeholder={
                          selectedMethod === VerificationMethod.EMAIL
                            ? 'Email address'
                            : 'Nomor WhatsApp (contoh: 628123456789)'
                        }
                      />
                    </div>

                    <button
                      onClick={sendVerificationCode}
                      disabled={sendLoading || cooldown > 0}
                      className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {sendLoading ? (
                        'Mengirim...'
                      ) : cooldown > 0 ? (
                        `Tunggu ${cooldown} detik`
                      ) : (
                        'Kirim Kode Verifikasi'
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="rounded-md bg-blue-50 p-4">
                      <p className="text-sm text-blue-700">
                        {selectedMethod === VerificationMethod.EMAIL
                          ? 'Kode verifikasi telah dikirim ke email Anda. Silakan cek inbox (dan folder spam).'
                          : 'Kode OTP telah dikirim ke WhatsApp Anda.'}
                      </p>
                    </div>

                    <div>
                      <label htmlFor="code" className="sr-only">
                        Kode Verifikasi
                      </label>
                      <input
                        id="code"
                        name="code"
                        type="text"
                        required
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                        placeholder={
                          selectedMethod === VerificationMethod.EMAIL
                            ? 'Masukkan token dari email'
                            : 'Masukkan kode OTP (6 digit)'
                        }
                      />
                    </div>

                    <button
                      onClick={verifyCode}
                      disabled={loading}
                      className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Memverifikasi...' : 'Verifikasi'}
                    </button>

                    <button
                      onClick={sendVerificationCode}
                      disabled={sendLoading || cooldown > 0}
                      className="w-full text-sm text-indigo-600 hover:text-indigo-500"
                    >
                      {cooldown > 0
                        ? `Kirim ulang dalam ${cooldown} detik`
                        : 'Kirim ulang kode'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
