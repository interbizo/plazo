"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Clock, RefreshCw, CheckCircle } from "lucide-react";

interface OtpInputProps {
  phone: string;
  type: "REGISTRATION" | "FORGOT_PASSWORD";
  onVerified: (userId?: string) => void;
  onResend: () => Promise<{ success: boolean; cooldown?: number }>;
  onVerify: (code: string) => Promise<{ success: boolean; message: string; userId?: string }>;
}

export function OtpInput({ phone, type, onVerified, onResend, onVerify }: OtpInputProps) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [cooldown]);

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError("");

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits entered
    if (newCode.every((digit) => digit !== "") && !isVerifying) {
      handleVerify(newCode.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    
    if (!/^\d+$/.test(pastedData)) return;

    const newCode = pastedData.split("").concat(Array(6).fill("")).slice(0, 6);
    setCode(newCode);

    // Focus last filled input
    const lastIndex = Math.min(pastedData.length, 5);
    inputRefs.current[lastIndex]?.focus();

    // Auto-verify if complete
    if (pastedData.length === 6) {
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (otpCode: string) => {
    setIsVerifying(true);
    setError("");

    try {
      const result = await onVerify(otpCode);
      
      if (result.success) {
        onVerified(result.userId);
      } else {
        setError(result.message || "Kode OTP tidak valid");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Gagal memverifikasi OTP");
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError("");

    try {
      const result = await onResend();
      
      if (result.success) {
        setCooldown(result.cooldown || 60);
        setCanResend(false);
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Gagal mengirim ulang OTP");
    } finally {
      setIsResending(false);
    }
  };

  const formatPhone = (phone: string) => {
    // Format: 0812-3456-7890
    return phone.replace(/(\d{4})(\d{4})(\d+)/, "$1-$2-$3");
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <CheckCircle className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Verifikasi WhatsApp
        </h2>
        <p className="text-sm text-gray-600">
          Kode OTP telah dikirim ke WhatsApp
        </p>
        <p className="text-sm font-semibold text-gray-900 mt-1">
          {formatPhone(phone)}
        </p>
      </div>

      {/* OTP Input */}
      <div className="flex gap-2 justify-center mb-6">
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            disabled={isVerifying}
            className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg transition-colors
              ${digit ? "border-blue-500 bg-blue-50" : "border-gray-300"}
              ${error ? "border-red-500" : ""}
              focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none
              disabled:bg-gray-100 disabled:cursor-not-allowed
            `}
          />
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-600 text-center">{error}</p>
        </div>
      )}

      {/* Verifying State */}
      {isVerifying && (
        <div className="mb-4 flex items-center justify-center gap-2 text-blue-600">
          <Spinner className="w-4 h-4" />
          <span className="text-sm">Memverifikasi kode...</span>
        </div>
      )}

      {/* Resend OTP */}
      <div className="text-center">
        {canResend ? (
          <Button
            variant="outline"
            onClick={handleResend}
            disabled={isResending}
            isLoading={isResending}
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Kirim Ulang OTP
          </Button>
        ) : (
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Clock className="w-4 h-4" />
            <span className="text-sm">
              Kirim ulang dalam <strong>{cooldown}</strong> detik
            </span>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
        <p className="text-xs text-gray-600 text-center">
          Tidak menerima kode? Pastikan nomor WhatsApp Anda aktif dan dapat menerima pesan.
          Kode OTP berlaku selama <strong>1 menit</strong>.
        </p>
      </div>
    </div>
  );
}
