/**
 * WhatsApp OTP Verification Page
 * Path: /verify-otp
 * 
 * This page handles WhatsApp OTP verification after user registration.
 * User receives OTP code via WhatsApp (Fonnte) and enters it here.
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';

export default function VerifyOTPPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']); // 6 digit OTP
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Get phone from URL params or localStorage
  useEffect(() => {
    const phoneFromUrl = searchParams.get('phone');
    const phoneFromStorage = localStorage.getItem('pendingVerificationPhone');
    
    if (phoneFromUrl) {
      setPhone(phoneFromUrl);
    } else if (phoneFromStorage) {
      setPhone(phoneFromStorage);
    }
  }, [searchParams]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => {
        setCooldown(cooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Auto-focus first input on mount
  useEffect(() => {
    const firstInput = document.getElementById('otp-0');
    if (firstInput) {
      firstInput.focus();
    }
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
    }

    // Auto-submit when all 6 digits are entered
    if (index === 5 && value) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === 6) {
        verifyOtp(fullOtp);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    // Only allow 6 digit numbers
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      
      // Focus last input
      const lastInput = document.getElementById('otp-5');
      if (lastInput) {
        lastInput.focus();
      }
      
      // Auto-submit
      verifyOtp(pastedData);
    }
  };

  const verifyOtp = async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    
    if (code.length !== 6) {
      setError('Silakan masukkan 6 digit kode OTP');
      return;
    }

    if (!phone) {
      setError('Nomor WhatsApp tidak ditemukan. Silakan daftar ulang.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/verify-otp', {
        phone,
        code,
      });

      if (response.data.message) {
        setSuccess(true);
        
        // Store tokens if provided (auto-login after verification)
        if (response.data.accessToken) {
          localStorage.setItem('accessToken', response.data.accessToken);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        
        // Clear pending verification data
        localStorage.removeItem('pendingVerificationPhone');
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      
      if (errorData?.requiresEmailVerification) {
        setError(errorData.message);
        // Redirect to email verification
        setTimeout(() => {
          router.push('/verify-email');
        }, 2000);
      } else {
        setError(
          errorData?.message || 'Kode OTP tidak valid. Silakan coba lagi.'
        );
        // Clear OTP inputs on error
        setOtp(['', '', '', '', '', '']);
        const firstInput = document.getElementById('otp-0');
        if (firstInput) {
          firstInput.focus();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!phone) {
      setError('Nomor WhatsApp tidak ditemukan');
      return;
    }

    setResendLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/auth/resend-otp', {
        phone,
        type: 'REGISTRATION',
      });

      if (response.data.message) {
        alert(response.data.message);
        if (response.data.cooldown) {
          setCooldown(response.data.cooldown);
        }
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      
      if (errorData?.cooldown) {
        setCooldown(errorData.cooldown);
        setError(errorData.message);
      } else {
        setError(
          errorData?.message || 'Gagal mengirim ulang kode OTP'
        );
      }
    } finally {
      setResendLoading(false);
    }
  };

  const formatPhoneNumber = (phoneNumber: string) => {
    // Format: 628123456789 -> +62 812-3456-789
    if (phoneNumber.startsWith('62')) {
      return `+${phoneNumber.slice(0, 2)} ${phoneNumber.slice(2, 5)}-${phoneNumber.slice(5, 9)}-${phoneNumber.slice(9)}`;
    }
    return phoneNumber;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="rounded-full bg-green-100 p-3">
              <svg
                className="h-12 w-12 text-green-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verifikasi WhatsApp
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Masukkan kode OTP yang dikirim ke
          </p>
          <p className="mt-1 text-center text-sm font-medium text-gray-900">
            {phone ? formatPhoneNumber(phone) : 'WhatsApp Anda'}
          </p>
        </div>

        <div className="mt-8 space-y-6">
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
                    Akun Anda telah aktif. Anda akan diarahkan ke dashboard...
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
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

              <div className="rounded-md bg-blue-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      Kode OTP telah dikirim ke WhatsApp Anda. Kode berlaku selama 1 menit.
                    </p>
                  </div>
                </div>
              </div>

              {/* OTP Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 text-center mb-4">
                  Masukkan Kode OTP (6 digit)
                </label>
                <div className="flex justify-center space-x-2" onPaste={handlePaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      disabled={loading}
                      className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  ))}
                </div>
              </div>

              {/* Verify Button */}
              <div>
                <button
                  onClick={() => verifyOtp()}
                  disabled={loading || otp.join('').length !== 6}
                  className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Memverifikasi...
                    </div>
                  ) : (
                    'Verifikasi'
                  )}
                </button>
              </div>

              {/* Resend OTP */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Tidak menerima kode?
                </p>
                <button
                  onClick={resendOtp}
                  disabled={resendLoading || cooldown > 0}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {resendLoading ? (
                    'Mengirim ulang...'
                  ) : cooldown > 0 ? (
                    `Kirim ulang dalam ${cooldown} detik`
                  ) : (
                    'Kirim ulang kode OTP'
                  )}
                </button>
              </div>

              {/* Help Text */}
              <div className="rounded-md bg-gray-50 p-4">
                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-2">Tips:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Cek pesan WhatsApp dari Plazo Marketplace</li>
                    <li>Kode OTP berlaku selama 1 menit</li>
                    <li>Jangan bagikan kode OTP kepada siapapun</li>
                    <li>Pastikan nomor WhatsApp Anda aktif</li>
                  </ul>
                </div>
              </div>

              {/* Change Phone Number */}
              <div className="text-center">
                <button
                  onClick={() => router.push('/register')}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Nomor WhatsApp salah? Daftar ulang
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
