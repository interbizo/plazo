"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  MapPin,
  Phone,
  Building2,
  FileText,
  Download,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { physicalVerificationApi } from "@/services/physical-verification.service";
import toast from "react-hot-toast";

interface Eligibility {
  eligible: boolean;
  reason?: string;
  currentPlan?: string;
  planName?: string;
  status?: string;
}

interface Verification {
  id: string;
  status: string;
  businessName: string;
  businessAddress: string;
  businessCity?: string;
  businessPhone?: string;
  requestNotes?: string;
  scheduledDate?: string;
  visitedDate?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  certificateUrl?: string;
  requestedAt: string;
  verificationNotes?: string;
}

const STATUS_CONFIG = {
  NOT_REQUESTED: {
    label: "Belum Diajukan",
    color: "bg-gray-100 text-gray-700",
    icon: AlertCircle,
  },
  PENDING: {
    label: "Menunggu Jadwal",
    color: "bg-yellow-100 text-yellow-700",
    icon: Clock,
  },
  SCHEDULED: {
    label: "Terjadwal",
    color: "bg-blue-100 text-blue-700",
    icon: Calendar,
  },
  IN_PROGRESS: {
    label: "Sedang Diproses",
    color: "bg-indigo-100 text-indigo-700",
    icon: Clock,
  },
  APPROVED: {
    label: "Terverifikasi",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  REJECTED: {
    label: "Ditolak",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
};

export default function SellerPhysicalVerificationPage() {
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    businessName: "",
    businessAddress: "",
    businessCity: "",
    businessPhone: "",
    requestNotes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [eligibilityRes, statusRes] = await Promise.all([
        physicalVerificationApi.checkEligibility(),
        physicalVerificationApi.getStatus(),
      ]);

      setEligibility(eligibilityRes.data);
      
      if (statusRes.data.verification) {
        setVerification(statusRes.data.verification);
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Gagal memuat data verifikasi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.businessName.trim() || !form.businessAddress.trim()) {
      toast.error("Nama bisnis dan alamat wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      await physicalVerificationApi.requestVerification(form);
      toast.success("Pengajuan verifikasi berhasil dikirim!");
      setShowForm(false);
      loadData();
    } catch (error: any) {
      console.error("Error submitting request:", error);
      toast.error(error.response?.data?.message || "Gagal mengirim pengajuan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadCertificate = async () => {
    try {
      const { data } = await physicalVerificationApi.getCertificate();
      if (data.certificateUrl) {
        window.open(data.certificateUrl, "_blank");
      }
    } catch (error) {
      toast.error("Gagal mengunduh sertifikat");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const statusConfig = verification
    ? STATUS_CONFIG[verification.status as keyof typeof STATUS_CONFIG]
    : STATUS_CONFIG.NOT_REQUESTED;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Verifikasi Fisik</h1>
        <p className="text-gray-600 mt-1">
          Dapatkan badge "Terverifikasi" untuk meningkatkan kepercayaan pembeli
        </p>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${statusConfig.color}`}>
            <StatusIcon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-lg font-semibold text-gray-900">
                Status Verifikasi
              </h2>
              <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
            </div>

            {verification?.status === "APPROVED" && (
              <div className="space-y-3">
                <p className="text-green-600 font-medium">
                  Selamat! Toko Anda telah terverifikasi secara fisik.
                </p>
                {verification.approvedAt && (
                  <p className="text-sm text-gray-600">
                    Diverifikasi pada:{" "}
                    {new Date(verification.approvedAt).toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
                {verification.certificateUrl && (
                  <Button
                    size="sm"
                    onClick={handleDownloadCertificate}
                    className="mt-2"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Sertifikat
                  </Button>
                )}
              </div>
            )}

            {verification?.status === "PENDING" && (
              <p className="text-gray-600">
                Pengajuan Anda sedang ditinjau. Tim kami akan menghubungi Anda untuk
                menjadwalkan kunjungan verifikasi.
              </p>
            )}

            {verification?.status === "SCHEDULED" && verification.scheduledDate && (
              <div className="space-y-2">
                <p className="text-blue-600 font-medium">
                  Kunjungan verifikasi telah dijadwalkan
                </p>
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(verification.scheduledDate).toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Pastikan lokasi bisnis Anda siap untuk dikunjungi pada tanggal tersebut.
                </p>
              </div>
            )}

            {verification?.status === "IN_PROGRESS" && (
              <p className="text-indigo-600">
                Verifikasi sedang dalam proses. Mohon tunggu hasil dari tim kami.
              </p>
            )}

            {verification?.status === "REJECTED" && (
              <div className="space-y-2">
                <p className="text-red-600 font-medium">
                  Pengajuan verifikasi Anda ditolak
                </p>
                {verification.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">
                      <strong>Alasan:</strong> {verification.rejectionReason}
                    </p>
                  </div>
                )}
                <p className="text-sm text-gray-600">
                  Anda dapat mengajukan verifikasi ulang setelah memperbaiki hal-hal yang
                  disebutkan di atas.
                </p>
              </div>
            )}

            {!verification && !eligibility?.eligible && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-3">
                <p className="text-amber-800">
                  <strong>Tidak Eligible:</strong> {eligibility?.reason}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Request Form */}
      {eligibility?.eligible && !verification && !showForm && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
          <div className="flex items-start gap-4">
            <ShieldCheck className="h-8 w-8 text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ajukan Verifikasi Fisik
              </h3>
              <p className="text-gray-700 mb-4">
                Dapatkan badge "Terverifikasi" dengan verifikasi kunjungan fisik ke lokasi
                bisnis Anda. Ini akan meningkatkan kepercayaan pembeli terhadap toko Anda.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Tim kami akan mengunjungi lokasi bisnis Anda</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Verifikasi alamat dan keberadaan bisnis</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Dapatkan sertifikat verifikasi resmi</span>
                </li>
              </ul>
              <Button onClick={() => setShowForm(true)}>
                Ajukan Verifikasi Sekarang
              </Button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Form Pengajuan Verifikasi Fisik
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Bisnis <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nama toko/bisnis Anda"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alamat Lengkap <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <textarea
                  value={form.businessAddress}
                  onChange={(e) => setForm({ ...form, businessAddress: e.target.value })}
                  rows={3}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Alamat lengkap lokasi bisnis"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kota
                </label>
                <input
                  type="text"
                  value={form.businessCity}
                  onChange={(e) => setForm({ ...form, businessCity: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Kota"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nomor Telepon
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    value={form.businessPhone}
                    onChange={(e) => setForm({ ...form, businessPhone: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="08xx xxxx xxxx"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catatan Tambahan
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <textarea
                  value={form.requestNotes}
                  onChange={(e) => setForm({ ...form, requestNotes: e.target.value })}
                  rows={3}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Informasi tambahan yang perlu kami ketahui..."
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Mengirim..." : "Kirim Pengajuan"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Verification Details */}
      {verification && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Detail Pengajuan
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Nama Bisnis</label>
                <p className="font-medium text-gray-900">{verification.businessName}</p>
              </div>

              <div>
                <label className="text-sm text-gray-500">Kota</label>
                <p className="font-medium text-gray-900">
                  {verification.businessCity || "-"}
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm text-gray-500">Alamat</label>
                <p className="font-medium text-gray-900">{verification.businessAddress}</p>
              </div>

              <div>
                <label className="text-sm text-gray-500">Telepon</label>
                <p className="font-medium text-gray-900">
                  {verification.businessPhone || "-"}
                </p>
              </div>

              <div>
                <label className="text-sm text-gray-500">Tanggal Pengajuan</label>
                <p className="font-medium text-gray-900">
                  {new Date(verification.requestedAt).toLocaleDateString("id-ID", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            {verification.requestNotes && (
              <div>
                <label className="text-sm text-gray-500">Catatan Anda</label>
                <p className="text-gray-700 bg-gray-50 rounded-lg p-3 mt-1">
                  {verification.requestNotes}
                </p>
              </div>
            )}

            {verification.verificationNotes && (
              <div>
                <label className="text-sm text-gray-500">Catatan dari Tim Verifikasi</label>
                <p className="text-gray-700 bg-blue-50 rounded-lg p-3 mt-1">
                  {verification.verificationNotes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
