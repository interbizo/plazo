"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/services/admin.service";
import { formatPrice, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CreditCard,
  Eye,
  CheckCircle,
  XCircle,
  X,
  RefreshCw,
  Clock,
  ImageIcon,
} from "lucide-react";
import toast from "react-hot-toast";

// ============================================
// TYPES
// ============================================

interface SubscriptionPayment {
  id: string;
  tenantId: string;
  plan: string;
  planName: string;
  amount: number;
  durationDays: number;
  proofImageUrl: string;
  accountName?: string;
  accountNumber?: string;
  transferDate?: string;
  notes?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  tenant?: {
    id: string;
    name: string;
    subdomain: string;
    owner?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Semua" },
  { value: "PENDING", label: "Menunggu" },
  { value: "APPROVED", label: "Disetujui" },
  { value: "REJECTED", label: "Ditolak" },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function AdminSubscriptionPaymentsPage() {
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  // Modal states
  const [proofModal, setProofModal] = useState<string | null>(null);
  const [approveModal, setApproveModal] = useState<SubscriptionPayment | null>(null);
  const [rejectModal, setRejectModal] = useState<SubscriptionPayment | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const status = statusFilter === "ALL" ? undefined : statusFilter;
      console.log('[Subscription Payments] Fetching with status:', status);
      
      const { data } = await adminApi.getSubscriptionPayments(status);
      console.log('[Subscription Payments] Response:', data);
      
      setPayments(data?.data || []);
    } catch (error: any) {
      console.error('[Subscription Payments] Error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || "Gagal memuat data pembayaran - Internal Server Error";
      toast.error(errorMessage);
      setPayments([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // ============ APPROVE ============

  const handleApprove = async () => {
    if (!approveModal) return;
    setProcessing(true);
    try {
      await adminApi.reviewSubscriptionPayment(approveModal.id, {
        status: "APPROVED",
        reviewNotes: reviewNotes || undefined,
      });
      toast.success("Pembayaran disetujui dan langganan diaktifkan");
      setApproveModal(null);
      setReviewNotes("");
      fetchPayments();
    } catch {
      toast.error("Gagal menyetujui pembayaran");
    } finally {
      setProcessing(false);
    }
  };

  // ============ REJECT ============

  const handleReject = async () => {
    if (!rejectModal) return;
    if (!rejectionReason.trim()) {
      toast.error("Alasan penolakan wajib diisi");
      return;
    }
    setProcessing(true);
    try {
      await adminApi.reviewSubscriptionPayment(rejectModal.id, {
        status: "REJECTED",
        rejectionReason: rejectionReason,
      });
      toast.success("Pembayaran ditolak");
      setRejectModal(null);
      setRejectionReason("");
      fetchPayments();
    } catch {
      toast.error("Gagal menolak pembayaran");
    } finally {
      setProcessing(false);
    }
  };

  // ============ STATUS BADGE ============

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="warning">Menunggu</Badge>;
      case "APPROVED":
        return <Badge variant="success">Disetujui</Badge>;
      case "REJECTED":
        return <Badge variant="danger">Ditolak</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // ============ COUNTS ============

  const pendingCount = payments.filter((p) => p.status === "PENDING").length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Pembayaran Langganan
          </h1>
          <p className="text-sm text-gray-500">
            Review dan verifikasi pembayaran langganan dari seller
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                {pendingCount} menunggu
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPayments}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 mb-6 rounded-lg bg-gray-100 p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : payments.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-12 w-12 text-gray-300" />}
          title="Tidak ada pembayaran"
          description={
            statusFilter === "ALL"
              ? "Belum ada pembayaran langganan yang masuk"
              : `Tidak ada pembayaran dengan status "${STATUS_TABS.find((t) => t.value === statusFilter)?.label}"`
          }
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Toko
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Seller
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Paket
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">
                    Jumlah
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">
                    Durasi
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">
                    Tgl Transfer
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">
                    Tgl Submit
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    {/* Toko */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {payment.tenant?.name || "-"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {payment.tenant?.subdomain || "-"}
                      </p>
                    </td>

                    {/* Seller */}
                    <td className="px-4 py-3">
                      <p className="text-gray-900">
                        {payment.tenant?.owner
                          ? `${payment.tenant.owner.firstName} ${payment.tenant.owner.lastName}`
                          : "-"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {payment.tenant?.owner?.email || "-"}
                      </p>
                    </td>

                    {/* Paket */}
                    <td className="px-4 py-3">
                      <Badge variant="info">{payment.planName}</Badge>
                    </td>

                    {/* Jumlah */}
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatPrice(payment.amount)}
                    </td>

                    {/* Durasi */}
                    <td className="px-4 py-3 text-center text-gray-700">
                      {payment.durationDays} hari
                    </td>

                    {/* Tanggal Transfer */}
                    <td className="px-4 py-3 text-center text-xs text-gray-600">
                      {payment.transferDate
                        ? formatDate(payment.transferDate)
                        : "-"}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      {renderStatusBadge(payment.status)}
                    </td>

                    {/* Tanggal Submit */}
                    <td className="px-4 py-3 text-center text-xs text-gray-600">
                      {formatDate(payment.createdAt)}
                    </td>

                    {/* Aksi */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* View Proof */}
                        <button
                          onClick={() => setProofModal(payment.proofImageUrl)}
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          title="Lihat Bukti Transfer"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {payment.status === "PENDING" && (
                          <>
                            {/* Approve */}
                            <button
                              onClick={() => {
                                setApproveModal(payment);
                                setReviewNotes("");
                              }}
                              className="rounded-lg p-1.5 text-gray-500 hover:bg-green-50 hover:text-green-600 transition-colors"
                              title="Setujui"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>

                            {/* Reject */}
                            <button
                              onClick={() => {
                                setRejectModal(payment);
                                setRejectionReason("");
                              }}
                              className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                              title="Tolak"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}

                        {payment.status === "REJECTED" && payment.rejectionReason && (
                          <span
                            className="text-xs text-red-500 max-w-[120px] truncate cursor-help"
                            title={payment.rejectionReason}
                          >
                            {payment.rejectionReason}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ PROOF IMAGE MODAL ============ */}
      {proofModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setProofModal(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-2xl w-full bg-white rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Bukti Transfer</h3>
              </div>
              <button
                onClick={() => setProofModal(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-gray-50 min-h-[300px]">
              <img
                src={proofModal}
                alt="Bukti Transfer"
                className="max-h-[70vh] max-w-full object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "";
                  (e.target as HTMLImageElement).alt = "Gagal memuat gambar";
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ============ APPROVE MODAL ============ */}
      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4 w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Setujui Pembayaran</h3>
                <p className="text-sm text-gray-500">
                  Langganan akan langsung diaktifkan
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm space-y-1">
              <p>
                <span className="text-gray-500">Toko:</span>{" "}
                <strong>{approveModal.tenant?.name}</strong>
              </p>
              <p>
                <span className="text-gray-500">Paket:</span>{" "}
                <strong>{approveModal.planName}</strong>
              </p>
              <p>
                <span className="text-gray-500">Jumlah:</span>{" "}
                <strong>{formatPrice(approveModal.amount)}</strong>
              </p>
              <p>
                <span className="text-gray-500">Durasi:</span>{" "}
                <strong>{approveModal.durationDays} hari</strong>
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Catatan (opsional)
              </label>
              <textarea
                rows={2}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Catatan untuk internal..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setApproveModal(null)}
                disabled={processing}
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleApprove}
                isLoading={processing}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Setujui & Aktifkan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============ REJECT MODAL ============ */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4 w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Tolak Pembayaran</h3>
                <p className="text-sm text-gray-500">
                  Seller akan diberitahu alasan penolakan
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm space-y-1">
              <p>
                <span className="text-gray-500">Toko:</span>{" "}
                <strong>{rejectModal.tenant?.name}</strong>
              </p>
              <p>
                <span className="text-gray-500">Paket:</span>{" "}
                <strong>{rejectModal.planName}</strong>
              </p>
              <p>
                <span className="text-gray-500">Jumlah:</span>{" "}
                <strong>{formatPrice(rejectModal.amount)}</strong>
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Alasan Penolakan <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Contoh: Bukti transfer tidak valid, nominal tidak sesuai..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRejectModal(null)}
                disabled={processing}
              >
                Batal
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={handleReject}
                isLoading={processing}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Tolak Pembayaran
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
