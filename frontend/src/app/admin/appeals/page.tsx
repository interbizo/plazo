"use client";

import { useEffect, useState } from "react";
import api, { getErrorMessage } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import {
  ShieldAlert,
  Check,
  X,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Activity,
} from "lucide-react";
import toast from "react-hot-toast";

interface AppealUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  suspendedAt?: string;
  suspendedReason?: string;
  lastActiveAt?: string;
  lastLoginAt?: string;
  createdAt: string;
}

interface Appeal {
  id: string;
  userId: string;
  reason: string;
  evidence?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote?: string;
  reviewedAt?: string;
  createdAt: string;
  user: AppealUser;
}

export default function AdminAppealsPage() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);

  const fetchAppeals = async () => {
    setIsLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (filter) params.status = filter;
      const { data } = await api.get("/api/account-appeal/admin/list", { params });
      setAppeals(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.pages || 1);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAppeals(); }, [page, filter]);

  const handleApprove = async (id: string) => {
    if (!confirm("Yakin ingin menyetujui banding ini? Akun user akan dipulihkan.")) return;
    setProcessing(id);
    try {
      await api.put(`/api/account-appeal/admin/${id}/approve`, { adminNote });
      toast.success("Banding disetujui. Akun dipulihkan.");
      setSelectedAppeal(null);
      setAdminNote("");
      fetchAppeals();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Yakin ingin menolak banding ini?")) return;
    setProcessing(id);
    try {
      await api.put(`/api/account-appeal/admin/${id}/reject`, { adminNote });
      toast.success("Banding ditolak.");
      setSelectedAppeal(null);
      setAdminNote("");
      fetchAppeals();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Banding Akun</h1>
          <p className="text-sm text-gray-500">{total} pengajuan banding</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { value: "", label: "Semua" },
          { value: "PENDING", label: "Pending" },
          { value: "APPROVED", label: "Disetujui" },
          { value: "REJECTED", label: "Ditolak" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setPage(1); }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f.value
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Spinner /></div>
      ) : appeals.length === 0 ? (
        <EmptyState
          icon={<ShieldAlert className="h-12 w-12 text-gray-300" />}
          title="Tidak ada banding"
          description="Belum ada pengajuan banding akun."
        />
      ) : (
        <>
          <div className="space-y-4">
            {appeals.map((appeal) => (
              <div key={appeal.id} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* User Info */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                        <User className="h-5 w-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {appeal.user.firstName} {appeal.user.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{appeal.user.email} • {appeal.user.role}</p>
                      </div>
                    </div>

                    {/* Appeal Reason */}
                    <div className="rounded-lg bg-gray-50 p-3 mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Alasan Banding:</p>
                      <p className="text-sm text-gray-600">{appeal.reason}</p>
                      {appeal.evidence && (
                        <a href={appeal.evidence} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                          📎 Lihat Bukti
                        </a>
                      )}
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Diajukan: {formatDate(appeal.createdAt)}
                      </span>
                      {appeal.user.suspendedAt && (
                        <span className="flex items-center gap-1">
                          <ShieldAlert className="h-3 w-3 text-red-500" />
                          Suspend: {formatDate(appeal.user.suspendedAt)}
                        </span>
                      )}
                      {appeal.user.lastLoginAt && (
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          Login terakhir: {formatRelativeTime(appeal.user.lastLoginAt)}
                        </span>
                      )}
                      {appeal.user.suspendedReason && (
                        <span className="text-red-600">
                          Alasan suspend: {appeal.user.suspendedReason}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex flex-col items-end gap-2">
                    <Badge
                      variant={
                        appeal.status === "APPROVED" ? "success" :
                        appeal.status === "REJECTED" ? "danger" : "warning"
                      }
                    >
                      {appeal.status === "PENDING" && <Clock className="h-3 w-3 mr-1" />}
                      {appeal.status === "APPROVED" && <CheckCircle className="h-3 w-3 mr-1" />}
                      {appeal.status === "REJECTED" && <XCircle className="h-3 w-3 mr-1" />}
                      {appeal.status === "PENDING" ? "Pending" :
                       appeal.status === "APPROVED" ? "Disetujui" : "Ditolak"}
                    </Badge>

                    {/* Action Buttons */}
                    {appeal.status === "PENDING" && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          onClick={() => { setSelectedAppeal(appeal); setAdminNote(""); }}
                          className="bg-green-600 hover:bg-green-700"
                          disabled={processing === appeal.id}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Setujui
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setSelectedAppeal(appeal); setAdminNote(""); }}
                          disabled={processing === appeal.id}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Tolak
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {appeal.adminNote && (
                  <div className="mt-3 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
                    <strong>Catatan Admin:</strong> {appeal.adminNote}
                  </div>
                )}
              </div>
            ))}
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Review Modal */}
      {selectedAppeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Review Banding</h3>
            <p className="text-sm text-gray-600 mb-4">
              <strong>{selectedAppeal.user.firstName} {selectedAppeal.user.lastName}</strong> — {selectedAppeal.reason.substring(0, 100)}...
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catatan Admin (opsional)
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Catatan internal untuk keputusan ini..."
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => handleApprove(selectedAppeal.id)}
                isLoading={processing === selectedAppeal.id}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Setujui & Pulihkan
              </Button>
              <Button
                variant="outline"
                onClick={() => handleReject(selectedAppeal.id)}
                isLoading={processing === selectedAppeal.id}
                className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Tolak
              </Button>
            </div>

            <button
              onClick={() => setSelectedAppeal(null)}
              className="mt-3 w-full text-center text-sm text-gray-500 hover:text-gray-700"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
