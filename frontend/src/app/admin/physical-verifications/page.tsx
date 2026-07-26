"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Search,
  Filter,
  Eye,
  Calendar,
  CheckCircle,
  XCircle,
  Upload,
  Download,
  MapPin,
  Phone,
  Building,
  Clock,
  User,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { physicalVerificationApi } from "@/services/physical-verification.service";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";

interface PhysicalVerification {
  id: string;
  tenantId: string;
  businessName: string;
  businessAddress: string;
  businessCity?: string;
  businessPhone?: string;
  requestNotes?: string;
  status: string;
  scheduledDate?: string;
  visitedDate?: string;
  verifiedBy?: string;
  verificationNotes?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  certificateUrl?: string;
  visitPhotos: string[];
  requestedAt: string;
  tenant?: {
    name: string;
    owner: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
    };
  };
}

interface Stats {
  total: number;
  pending: number;
  scheduled: number;
  inProgress: number;
  approved: number;
  rejected: number;
}

const STATUS_COLORS: Record<string, string> = {
  NOT_REQUESTED: "bg-gray-100 text-gray-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-purple-100 text-purple-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  NOT_REQUESTED: "Belum Request",
  PENDING: "Menunggu",
  SCHEDULED: "Terjadwal",
  IN_PROGRESS: "Proses",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

export default function AdminPhysicalVerificationsPage() {
  const [verifications, setVerifications] = useState<PhysicalVerification[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedVerification, setSelectedVerification] = useState<PhysicalVerification | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form states
  const [scheduleForm, setScheduleForm] = useState({ scheduledDate: "", notes: "" });
  const [approveForm, setApproveForm] = useState({ verificationNotes: "", visitedDate: "" });
  const [rejectForm, setRejectForm] = useState({ rejectionReason: "" });
  const [certificateUrl, setCertificateUrl] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [verificationsRes, statsRes] = await Promise.all([
        physicalVerificationApi.getAllVerifications(),
        physicalVerificationApi.getStatistics(),
      ]);
      setVerifications(verificationsRes.data.data || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Gagal memuat data verifikasi");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredVerifications = verifications.filter((v) => {
    const matchesSearch =
      v.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.businessCity?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.tenant?.owner.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.tenant?.owner.lastName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || v.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleScheduleVisit = async () => {
    if (!selectedVerification || !scheduleForm.scheduledDate) {
      toast.error("Tanggal kunjungan wajib diisi");
      return;
    }

    setIsProcessing(true);
    try {
      await physicalVerificationApi.scheduleVisit(selectedVerification.id, scheduleForm);
      toast.success("Jadwal kunjungan berhasil disimpan");
      setScheduleForm({ scheduledDate: "", notes: "" });
      fetchData();
      setShowDetailModal(false);
    } catch (error: any) {
      console.error("Error scheduling visit:", error);
      toast.error(error?.response?.data?.message || "Gagal menjadwalkan kunjungan");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedVerification || !approveForm.verificationNotes) {
      toast.error("Catatan verifikasi wajib diisi");
      return;
    }

    setIsProcessing(true);
    try {
      await physicalVerificationApi.approveVerification(selectedVerification.id, approveForm);
      toast.success("Verifikasi berhasil disetujui");
      setApproveForm({ verificationNotes: "", visitedDate: "" });
      fetchData();
      setShowDetailModal(false);
    } catch (error: any) {
      console.error("Error approving:", error);
      toast.error(error?.response?.data?.message || "Gagal menyetujui verifikasi");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedVerification || !rejectForm.rejectionReason) {
      toast.error("Alasan penolakan wajib diisi");
      return;
    }

    setIsProcessing(true);
    try {
      await physicalVerificationApi.rejectVerification(selectedVerification.id, rejectForm);
      toast.success("Verifikasi ditolak");
      setRejectForm({ rejectionReason: "" });
      fetchData();
      setShowDetailModal(false);
    } catch (error: any) {
      console.error("Error rejecting:", error);
      toast.error(error?.response?.data?.message || "Gagal menolak verifikasi");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadCertificate = async () => {
    if (!selectedVerification || !certificateUrl) {
      toast.error("URL sertifikat wajib diisi");
      return;
    }

    setIsProcessing(true);
    try {
      await physicalVerificationApi.uploadCertificate(selectedVerification.id, { certificateUrl });
      toast.success("Sertifikat berhasil diupload");
      setCertificateUrl("");
      fetchData();
    } catch (error: any) {
      console.error("Error uploading certificate:", error);
      toast.error(error?.response?.data?.message || "Gagal upload sertifikat");
    } finally {
      setIsProcessing(false);
    }
  };

  const openDetailModal = (verification: PhysicalVerification) => {
    setSelectedVerification(verification);
    setShowDetailModal(true);
    setScheduleForm({ scheduledDate: verification.scheduledDate || "", notes: "" });
    setApproveForm({ verificationNotes: "", visitedDate: verification.visitedDate || "" });
    setRejectForm({ rejectionReason: "" });
    setCertificateUrl(verification.certificateUrl || "");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Verifikasi Fisik</h1>
        <p className="mt-1 text-sm text-gray-500">
          Kelola verifikasi kunjungan fisik untuk seller
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-6">
          {[
            { label: "Total", value: stats.total, icon: ShieldCheck, color: "text-gray-600 bg-gray-100" },
            { label: "Pending", value: stats.pending, icon: Clock, color: "text-yellow-600 bg-yellow-100" },
            { label: "Terjadwal", value: stats.scheduled, icon: Calendar, color: "text-blue-600 bg-blue-100" },
            { label: "Proses", value: stats.inProgress, icon: Clock, color: "text-purple-600 bg-purple-100" },
            { label: "Disetujui", value: stats.approved, icon: CheckCircle, color: "text-green-600 bg-green-100" },
            { label: "Ditolak", value: stats.rejected, icon: XCircle, color: "text-red-600 bg-red-100" },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className={`inline-flex rounded-lg p-2 ${card.color}`}>
                <card.icon className="h-4 w-4" />
              </div>
              <p className="mt-3 text-sm text-gray-500">{card.label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama bisnis, kota, atau owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Status</option>
              <option value="PENDING">Pending</option>
              <option value="SCHEDULED">Terjadwal</option>
              <option value="IN_PROGRESS">Proses</option>
              <option value="APPROVED">Disetujui</option>
              <option value="REJECTED">Ditolak</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Bisnis</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Owner</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Lokasi</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Tanggal Request</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredVerifications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery || statusFilter !== "all"
                      ? "Tidak ada data yang cocok dengan filter"
                      : "Belum ada request verifikasi fisik"}
                  </td>
                </tr>
              ) : (
                filteredVerifications.map((verification) => (
                  <tr key={verification.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{verification.businessName}</div>
                      <div className="text-xs text-gray-500">{verification.tenant?.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">
                        {verification.tenant?.owner.firstName} {verification.tenant?.owner.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{verification.tenant?.owner.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-700">
                        <MapPin className="h-3 w-3" />
                        {verification.businessCity || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_COLORS[verification.status]}>
                        {STATUS_LABELS[verification.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatDate(verification.requestedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDetailModal(verification)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Detail Verifikasi Fisik</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Business Info */}
            <div className="mb-6 rounded-lg border border-gray-200 p-4">
              <h3 className="mb-3 font-semibold text-gray-900">Informasi Bisnis</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Building className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900">{selectedVerification.businessName}</div>
                    <div className="text-gray-600">{selectedVerification.businessAddress}</div>
                  </div>
                </div>
                {selectedVerification.businessCity && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{selectedVerification.businessCity}</span>
                  </div>
                )}
                {selectedVerification.businessPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{selectedVerification.businessPhone}</span>
                  </div>
                )}
                {selectedVerification.requestNotes && (
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                    <span className="text-gray-700">{selectedVerification.requestNotes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Owner Info */}
            <div className="mb-6 rounded-lg border border-gray-200 p-4">
              <h3 className="mb-3 font-semibold text-gray-900">Informasi Owner</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700">
                    {selectedVerification.tenant?.owner.firstName}{" "}
                    {selectedVerification.tenant?.owner.lastName}
                  </span>
                </div>
                <div className="text-gray-600">{selectedVerification.tenant?.owner.email}</div>
                {selectedVerification.tenant?.owner.phone && (
                  <div className="text-gray-600">{selectedVerification.tenant?.owner.phone}</div>
                )}
              </div>
            </div>

            {/* Status & Actions */}
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Status & Aksi</h3>
                <Badge className={STATUS_COLORS[selectedVerification.status]}>
                  {STATUS_LABELS[selectedVerification.status]}
                </Badge>
              </div>

              {/* Schedule Visit */}
              {(selectedVerification.status === "PENDING" || selectedVerification.status === "SCHEDULED") && (
                <div className="mb-4 rounded-lg border border-gray-200 p-4">
                  <h4 className="mb-3 text-sm font-medium text-gray-900">Jadwalkan Kunjungan</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs text-gray-700">Tanggal Kunjungan</label>
                      <input
                        type="datetime-local"
                        value={scheduleForm.scheduledDate}
                        onChange={(e) =>
                          setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-700">Catatan (Opsional)</label>
                      <textarea
                        value={scheduleForm.notes}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Catatan untuk seller..."
                      />
                    </div>
                    <Button onClick={handleScheduleVisit} isLoading={isProcessing} size="sm">
                      <Calendar className="h-3 w-3 mr-1" />
                      Simpan Jadwal
                    </Button>
                  </div>
                </div>
              )}

              {/* Approve */}
              {(selectedVerification.status === "SCHEDULED" || selectedVerification.status === "IN_PROGRESS") && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
                  <h4 className="mb-3 text-sm font-medium text-gray-900">Setujui Verifikasi</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs text-gray-700">Tanggal Kunjungan</label>
                      <input
                        type="date"
                        value={approveForm.visitedDate}
                        onChange={(e) =>
                          setApproveForm({ ...approveForm, visitedDate: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-700">Catatan Verifikasi *</label>
                      <textarea
                        value={approveForm.verificationNotes}
                        onChange={(e) =>
                          setApproveForm({ ...approveForm, verificationNotes: e.target.value })
                        }
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Hasil kunjungan dan verifikasi..."
                        required
                      />
                    </div>
                    <Button onClick={handleApprove} isLoading={isProcessing} size="sm">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Setujui Verifikasi
                    </Button>
                  </div>
                </div>
              )}

              {/* Reject */}
              {selectedVerification.status !== "APPROVED" && selectedVerification.status !== "REJECTED" && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
                  <h4 className="mb-3 text-sm font-medium text-gray-900">Tolak Verifikasi</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs text-gray-700">Alasan Penolakan *</label>
                      <textarea
                        value={rejectForm.rejectionReason}
                        onChange={(e) =>
                          setRejectForm({ ...rejectForm, rejectionReason: e.target.value })
                        }
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Alasan penolakan..."
                        required
                      />
                    </div>
                    <Button
                      onClick={handleReject}
                      isLoading={isProcessing}
                      variant="danger"
                      size="sm"
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Tolak Verifikasi
                    </Button>
                  </div>
                </div>
              )}

              {/* Upload Certificate */}
              {selectedVerification.status === "APPROVED" && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <h4 className="mb-3 text-sm font-medium text-gray-900">Upload Sertifikat</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs text-gray-700">URL Sertifikat *</label>
                      <input
                        type="url"
                        value={certificateUrl}
                        onChange={(e) => setCertificateUrl(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="https://..."
                      />
                    </div>
                    <Button onClick={handleUploadCertificate} isLoading={isProcessing} size="sm">
                      <Upload className="h-3 w-3 mr-1" />
                      Upload Sertifikat
                    </Button>
                    {selectedVerification.certificateUrl && (
                      <a
                        href={selectedVerification.certificateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                      >
                        <Download className="h-3 w-3" />
                        Lihat Sertifikat Saat Ini
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Verification Details */}
            {(selectedVerification.verificationNotes || selectedVerification.rejectionReason) && (
              <div className="mb-6 rounded-lg border border-gray-200 p-4">
                <h3 className="mb-3 font-semibold text-gray-900">Detail Verifikasi</h3>
                <div className="space-y-2 text-sm">
                  {selectedVerification.scheduledDate && (
                    <div>
                      <span className="text-gray-600">Jadwal Kunjungan: </span>
                      <span className="text-gray-900">
                        {formatDate(selectedVerification.scheduledDate)}
                      </span>
                    </div>
                  )}
                  {selectedVerification.visitedDate && (
                    <div>
                      <span className="text-gray-600">Tanggal Kunjungan: </span>
                      <span className="text-gray-900">
                        {formatDate(selectedVerification.visitedDate)}
                      </span>
                    </div>
                  )}
                  {selectedVerification.verificationNotes && (
                    <div>
                      <span className="text-gray-600">Catatan Verifikasi: </span>
                      <p className="mt-1 text-gray-900">{selectedVerification.verificationNotes}</p>
                    </div>
                  )}
                  {selectedVerification.rejectionReason && (
                    <div>
                      <span className="text-gray-600">Alasan Penolakan: </span>
                      <p className="mt-1 text-red-700">{selectedVerification.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
