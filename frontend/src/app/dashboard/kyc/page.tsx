"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import api, { getErrorMessage } from "@/lib/api";
import { uploadApi } from "@/services/upload.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  ArrowLeft,
  ShieldCheck,
  Upload,
  X,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

interface KycStatus {
  kycStatus: string;
  submission?: {
    id: string;
    fullName: string;
    ktpPhotoPath: string;
    selfieWithKtpPath: string;
    status: string;
    rejectionReason?: string;
    createdAt: string;
    reviewedAt?: string;
  };
}

export default function KycPage() {
  const router = useRouter();
  const [status, setStatus] = useState<KycStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    ktpNumber: "",
    fullName: "",
    address: "",
    dateOfBirth: "",
  });

  // File state
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [ktpPreview, setKtpPreview] = useState<string>("");
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string>("");

  // Upload progress
  const [uploadingKtp, setUploadingKtp] = useState(false);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const { data } = await api.get("/api/kyc/status");
      // Backend returns { status: "...", ... } not { kycStatus: "..." }
      setStatus({ kycStatus: data.status || "NOT_SUBMITTED", submission: data });
    } catch {
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKtpSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 10MB");
      return;
    }
    setKtpFile(file);
    setKtpPreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleSelfieSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 10MB");
      return;
    }
    setSelfieFile(file);
    setSelfiePreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.ktpNumber || !form.fullName) {
      toast.error("NIK dan Nama Lengkap wajib diisi");
      return;
    }
    if (!/^[0-9]{16}$/.test(form.ktpNumber)) {
      toast.error("NIK harus 16 digit angka");
      return;
    }
    if (!ktpFile) {
      toast.error("Foto KTP wajib diupload");
      return;
    }
    if (!selfieFile) {
      toast.error("Foto selfie dengan KTP wajib diupload");
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload KTP photo
      setUploadingKtp(true);
      const ktpRes = await uploadApi.uploadFile(ktpFile, "KYC_DOCUMENT");
      const ktpPhotoPath = ktpRes.data.file.url;
      setUploadingKtp(false);

      // Upload selfie photo
      setUploadingSelfie(true);
      const selfieRes = await uploadApi.uploadFile(selfieFile, "KYC_DOCUMENT");
      const selfieWithKtpPath = selfieRes.data.file.url;
      setUploadingSelfie(false);

      // Submit KYC
      await api.post("/api/kyc/submit", {
        ktpNumber: form.ktpNumber,
        fullName: form.fullName,
        address: form.address || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        ktpPhotoPath,
        selfieWithKtpPath,
      });

      toast.success("KYC berhasil diajukan! Admin akan meninjau dalam 1-3 hari kerja.");
      fetchStatus();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
      setUploadingKtp(false);
      setUploadingSelfie(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const kycStatus = status?.kycStatus || "NOT_SUBMITTED";
  const submission = status?.submission;

  return (
    <div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="h-7 w-7 text-blue-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Verifikasi KYC</h1>
          <p className="text-sm text-gray-500">
            Verifikasi identitas untuk keamanan akun dan akses fitur lengkap
          </p>
        </div>
      </div>

      {/* Status Banner */}
      {kycStatus === "APPROVED" && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-5 flex items-start gap-3">
          <CheckCircle className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-green-900">KYC Terverifikasi</h3>
            <p className="text-sm text-green-700 mt-1">
              Identitas Anda telah diverifikasi. Anda dapat mengakses semua fitur platform.
            </p>
          </div>
        </div>
      )}

      {kycStatus === "PENDING" && (
        <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-5 flex items-start gap-3">
          <Clock className="h-6 w-6 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-yellow-900">Menunggu Review</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Dokumen KYC Anda sedang ditinjau oleh admin. Proses ini membutuhkan 1-3 hari kerja.
            </p>
            {submission?.createdAt && (
              <p className="text-xs text-yellow-600 mt-2">
                Diajukan pada: {new Date(submission.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </div>
        </div>
      )}

      {kycStatus === "REJECTED" && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5 flex items-start gap-3">
          <XCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-900">KYC Ditolak</h3>
            <p className="text-sm text-red-700 mt-1">
              Verifikasi KYC Anda ditolak. Silakan ajukan ulang dengan dokumen yang benar.
            </p>
            {submission?.rejectionReason && (
              <p className="text-sm text-red-600 mt-2">
                Alasan: {submission.rejectionReason}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Form — show if NOT_SUBMITTED or REJECTED */}
      {(kycStatus === "NOT_SUBMITTED" || kycStatus === "REJECTED") && (
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
          {/* Info */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Persyaratan Verifikasi KYC:</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                <li>Foto KTP asli yang jelas dan tidak buram</li>
                <li>Foto selfie sambil memegang KTP di samping wajah</li>
                <li>Pastikan NIK dan nama di KTP terbaca jelas</li>
                <li>Data yang dimasukkan harus sesuai dengan KTP</li>
              </ul>
            </div>
          </div>

          {/* Personal Data */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Data Identitas</h2>

            <Input
              label="NIK (Nomor Induk Kependudukan)"
              value={form.ktpNumber}
              onChange={(e) => setForm({ ...form, ktpNumber: e.target.value.replace(/\D/g, "").slice(0, 16) })}
              placeholder="16 digit angka NIK"
              maxLength={16}
              required
            />

            <Input
              label="Nama Lengkap (sesuai KTP)"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Nama lengkap sesuai KTP"
              required
            />

            <Input
              label="Alamat (sesuai KTP)"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Alamat lengkap sesuai KTP (opsional)"
            />

            <Input
              label="Tanggal Lahir"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            />
          </div>

          {/* Photo Upload */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-5">
            <h2 className="text-sm font-semibold text-gray-900">Upload Dokumen</h2>

            {/* KTP Photo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Foto KTP <span className="text-red-500">*</span>
              </label>
              {ktpPreview ? (
                <div className="relative w-full max-w-sm">
                  <div className="relative aspect-[3/2] rounded-lg overflow-hidden border-2 border-gray-200">
                    <Image src={ktpPreview} alt="KTP Preview" fill className="object-cover" unoptimized />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setKtpFile(null); setKtpPreview(""); }}
                    className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center cursor-pointer rounded-lg border-2 border-dashed border-gray-300 px-6 py-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors max-w-sm">
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-gray-700">Upload Foto KTP</span>
                  <span className="text-xs text-gray-500 mt-1">JPG, PNG maksimal 10MB</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleKtpSelect} />
                </label>
              )}
              {uploadingKtp && <p className="text-xs text-blue-600 mt-1">Mengupload foto KTP...</p>}
            </div>

            {/* Selfie with KTP */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Foto Selfie dengan KTP <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Ambil foto diri Anda sambil memegang KTP di samping wajah. Pastikan wajah dan KTP terlihat jelas.
              </p>
              {selfiePreview ? (
                <div className="relative w-full max-w-sm">
                  <div className="relative aspect-[3/4] rounded-lg overflow-hidden border-2 border-gray-200">
                    <Image src={selfiePreview} alt="Selfie Preview" fill className="object-cover" unoptimized />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelfieFile(null); setSelfiePreview(""); }}
                    className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center cursor-pointer rounded-lg border-2 border-dashed border-gray-300 px-6 py-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors max-w-sm">
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-gray-700">Upload Foto Selfie + KTP</span>
                  <span className="text-xs text-gray-500 mt-1">JPG, PNG maksimal 10MB</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleSelfieSelect} />
                </label>
              )}
              {uploadingSelfie && <p className="text-xs text-blue-600 mt-1">Mengupload foto selfie...</p>}
            </div>
          </div>

          <Button type="submit" isLoading={isSubmitting} className="w-full" size="lg">
            Ajukan Verifikasi KYC
          </Button>
        </form>
      )}
    </div>
  );
}
