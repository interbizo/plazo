/**
 * Unified Forgot Password Page with Method Selection
 * Path: /forgot-password
 * 
 * User can choose to reset password via Email or WhatsApp
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';

enum VerificationMethod {
  EMAIL = 'email',
  PHONE = 'phone',
}

export default function UnifiedForgotPasswordPage() {
  const router = useRouter();
  
  const [selectedMethod, setSelectedMethod] = useState<VerificationMethod | null>(null);
  const [identifier, setIdentifier] = useState(''); // Email or phone
  const [code, setCode] = useState(''); // OTP or token
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password minimal 8 karakter');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password harus mengandung huruf besar');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password harus mengandung huruf kecil');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password harus mengandung angka');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password harus mengandung karakter khusus');
    }

    return errors;
  };

  const sendResetCode = async () => {
    if (!selectedMethod) {
      setError('Silakan pilih metode reset password');
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
      const response = await axios.post('/api/auth/verify/forgot-password', {
        method: selectedMethod,
        identifier,
      });

      if (response.data.success) {
        setCodeSent(true);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Gagal mengirim kode reset password'
      );
    } finally {
      setSendLoading(false);
    }
  };

  const resetPassword = async () => {
    setError('');
    setPasswordErrors([]);

    if (!code) {
      setError('Silakan masukkan kode verifikasi');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Password tidak cocok');
      return;
    }

    const errors = validatePassword(newPassword);
    if (errors.length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/auth/verify/reset-password', {
        method: selectedMethod,
        code,
        newPassword,
        identifier: selectedMethod === VerificationMethod.PHONE ? identifier : undefined,
      });

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setPasswordErrors(err.response.data.errors);
      } else {
        setError(
          err.response?.data?.message ||
            'Gagal reset password. Silakan coba lagi.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Pilih metode untuk reset password Anda
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
                  Password berhasil direset!
                </h3>
                <p className="mt-2 text-sm text-green-700">
                  Password Anda telah berhasil diubah. Anda akan diarahkan ke
                  halaman login...
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

            {passwordErrors.length > 0 && (
              <div className="rounded-md bg-yellow-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-yellow-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Password tidak memenuhi persyaratan:
                    </h3>
                    <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                      {passwordErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Method Selection */}
            {!selectedMethod && (
              <div className="space-y-4">
                <p className="text-center text-sm text-gray-700 font-medium">
                  Pilih metode reset password:
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
                  Reset via Email
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
                  Reset via WhatsApp
                </button>
              </div>
            )}

            {/* Reset Form */}
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
                      setNewPassword('');
                      setConfirmPassword('');
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
                      onClick={sendResetCode}
                      disabled={sendLoading}
                      className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {sendLoading ? 'Mengirim...' : 'Kirim Kode Reset'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="rounded-md bg-blue-50 p-4">
                      <p className="text-sm text-blue-700">
                        {selectedMethod === VerificationMethod.EMAIL
                          ? 'Link reset password telah dikirim ke email Anda.'
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

                    <div>
                      <label htmlFor="new-password" className="sr-only">
                        Password Baru
                      </label>
                      <input
                        id="new-password"
                        name="new-password"
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                        placeholder="Password Baru"
                      />
                    </div>

                    <div>
                      <label htmlFor="confirm-password" className="sr-only">
                        Konfirmasi Password
                      </label>
                      <input
                        id="confirm-password"
                        name="confirm-password"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                        placeholder="Konfirmasi Password"
                      />
                    </div>

                    <div className="rounded-md bg-blue-50 p-4">
                      <div className="text-sm text-blue-700">
                        <p className="font-medium mb-2">Persyaratan Password:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Minimal 8 karakter</li>
                          <li>Mengandung huruf besar dan kecil</li>
                          <li>Mengandung angka</li>
                          <li>Mengandung karakter khusus (!@#$%^&*)</li>
                        </ul>
                      </div>
                    </div>

                    <button
                      onClick={resetPassword}
                      disabled={loading}
                      className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Mereset Password...' : 'Reset Password'}
                    </button>
                  </>
                )}

                <div className="text-center">
                  <Link
                    href="/login"
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Kembali ke Login
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
