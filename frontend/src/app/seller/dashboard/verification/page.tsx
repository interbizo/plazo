"use client";

import { useEffect, useState } from "react";
import { sellerApi } from "@/services/seller.service";
import { uploadApi } from "@/services/upload.service";
import { validateImageFile } from "@/lib/file-validation";
import { getErrorMessage } from "@/lib/api";

import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { ShieldCheck, Upload, FileCheck, AlertCircle, Camera } from "lucide-react";
import toast from "react-hot-toast";

interface KycSubmission {
  id: string;
  ktpNumber?: string;
  fullName?: string;
  address?: string;
  dateOfBirth?: string;
  ktpPhotoPath?: string;
  selfieWithKtpPath?: string;
  status: string;
  rejectionReason?: string;
  createdAt: string;
}

interface VerificationData {
  kyc: {
    status: string;
    submission?: KycSubmission;
  };
  seller: {
    level: string;
  };
  store: {
    isVerified: boolean;
  };
}

export default function SellerVerificationPage() {
  const [data, setData] = useState<VerificationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ktpNumber, setKtpNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  useEffect(() => {
    sellerApi
      .getVerificationStatus()
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setIsLoading(false));
  }, []);

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setDocFile(file);
  };

  const handleSelfieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setSelfieFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!docFile) {
      toast.error("Upload foto KTP terlebih dahulu");
      return;
    }
    if (!selfieFile) {
      toast.error("Upload foto selfie dengan KTP terlebih dahulu");
      return;
    }
    if (!ktpNumber.trim()) {
      toast.error("Masukkan NIK");
      return;
    }
    if (!/^\d{16}$/.test(ktpNumber)) {
      toast.error("NIK harus 16 digit angka");
      return;
    }
    if (!fullName.trim()) {
      toast.error("Masukkan nama lengkap sesuai KTP");
      return;
    }

    setSubmitting(true);
    try {
      // Upload KTP photo
      const formData1 = new FormData();
      formData1.append("file", docFile);
      const docRes = await uploadApi.uploadFile(formData1, "KYC_DOCUMENT");

      // Upload selfie with KTP
      const formData2 = new FormData();
      formData2.append("file", selfieFile);
      const selfieRes = await uploadApi.uploadFile(formData2, "KYC_DOCUMENT");

      await sellerApi.submitKyc({
        ktpNumber,
        fullName,
        address: address || undefined,
        dateOfBirth: dateOfBirth || undefined,
        ktpPhotoPath: docRes.data.file.url,
        selfieWithKtpPath: selfieRes.data.file.url,
      });

      toast.success("Dokumen KYC berhasil dikirim! Menunggu verifikasi.");
      // Refresh
      const { data: refreshed } = await sellerApi.getVerificationStatus();
      setData(refreshed);
      setDocFile(null);
      setSelfieFile(null);
      setKtpNumber("");
      setFullName("");
      setAddress("");
      setDateOfBirth("");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const status = data?.kyc?.status || "NOT_SUBMITTED";

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Verifikasi & KYC</h1>

      {/* Status Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
        <div className="flex items-center gap-4">
          <div
            className={`rounded-full p-3 ${
              status === "APPROVED"
                ? "bg-green-100 text-green-600"
                : status === "PENDING"
                  ? "bg-yellow-100 text-yellow-600"
                  : status === "REJECTED"
                    ? "bg-red-100 text-red-600"
                    : "bg-gray-100 text-gray-500"
            }`}
          >
            {status === "APPROVED" ? (
              <ShieldCheck className="h-6 w-6" />
            ) : status === "PENDING" ? (
              <FileCheck className="h-6 w-6" />
            ) : (
              <AlertCircle className="h-6 w-6" />
            )}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Status Verifikasi</h2>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={status} />
              {data?.seller?.level && (
                <span className="text-sm text-gray-500">
                  Level: {data.seller.level}
                </span>
              )}
            </div>
          </div>
        </div>

        {data?.kyc?.submission?.rejectionReason && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <strong>Alasan penolakan:</strong>{" "}
            {data.kyc.submission.rejectionReason}
          </div>
        )}
      </div>

      {/* Submit Form */}
      {(status === "NOT_SUBMITTED" || status === "REJECTED") && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-6 space-y-5"
        >
          <h2 className="font-semibold text-gray-900">Kirim Dokumen KYC</h2>

          <div>
            <label className="text-sm font-medium text-gray-700">
              NIK (Nomor Induk Kependudukan) *
            </label>
            <Input
              type="text"
              value={ktpNumber}
              onChange={(e) => setKtpNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
              placeholder="16 digit NIK"
              maxLength={16}
              required
            />
            <p className="mt-1 text-xs text-gray-500">Data akan dienkripsi dan aman</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Nama Lengkap (sesuai KTP) *
            </label>
            <Input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nama lengkap sesuai KTP"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Alamat (opsional)
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Alamat lengkap sesuai KTP"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Tanggal Lahir (opsional)
            </label>
            <Input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Foto KTP *
            </label>
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-4 hover:border-emerald-500 transition-colors">
              <label className="flex flex-col items-center gap-2 cursor-pointer">
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {docFile ? docFile.name : "Klik untuk upload foto KTP"}
                </span>
                <span className="text-xs text-gray-400">Max 10MB, format JPG/PNG</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleDocUpload}
                  required
                />
              </label>
              {docFile && (
                <div className="mt-2 text-center">
                  <span className="inline-flex items-center gap-1 text-xs text-green-600">
                    <FileCheck className="h-4 w-4" />
                    File siap diupload
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Foto Selfie Pegang KTP * <span className="text-red-500">(WAJIB)</span>
            </label>
            <div className="rounded-lg border-2 border-dashed border-red-300 bg-red-50/30 p-4 hover:border-red-500 transition-colors">
              <label className="flex flex-col items-center gap-2 cursor-pointer">
                <Camera className="h-8 w-8 text-red-500" />
                <span className="text-sm text-gray-900 font-medium">
                  {selfieFile ? selfieFile.name : "Klik untuk upload selfie dengan KTP"}
                </span>
                <span className="text-xs text-red-600 text-center">
                  Foto Anda memegang KTP di samping wajah (untuk verifikasi identitas)
                </span>
                <span className="text-xs text-gray-400">Max 10MB, format JPG/PNG</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleSelfieUpload}
                  required
                />
              </label>
              {selfieFile && (
                <div className="mt-2 text-center">
                  <span className="inline-flex items-center gap-1 text-xs text-green-600">
                    <FileCheck className="h-4 w-4" />
                    File siap diupload
                  </span>
                </div>
              )}
            </div>
            <div className="mt-2 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Tips foto selfie dengan KTP:</strong>
              </p>
              <ul className="mt-1 text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li>Pastikan wajah dan KTP terlihat jelas</li>
                <li>Gunakan pencahayaan yang cukup</li>
                <li>KTP dipegang di samping wajah</li>
                <li>Tidak blur atau terpotong</li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <Button type="submit" isLoading={submitting} className="w-full">
              <ShieldCheck className="h-4 w-4 mr-2" />
              Kirim Verifikasi KYC
            </Button>
            <p className="mt-2 text-xs text-center text-gray-500">
              Data Anda akan dienkripsi dan dijaga kerahasiaannya
            </p>
          </div>
        </form>
      )}

      {status === "PENDING" && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 text-center">
          <FileCheck className="mx-auto h-8 w-8 text-yellow-500 mb-2" />
          <p className="font-medium text-yellow-800">Dokumen sedang ditinjau</p>
          <p className="text-sm text-yellow-600 mt-1">
            Proses verifikasi biasanya memakan waktu 1-3 hari kerja
          </p>
        </div>
      )}

      {status === "APPROVED" && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-green-500 mb-2" />
          <p className="font-medium text-green-800">Akun Terverifikasi</p>
          <p className="text-sm text-green-600 mt-1">
            Selamat! Akun Anda telah terverifikasi. Anda sekarang dapat menarik
            dana.
          </p>
        </div>
      )}
    </div>
  );
}
