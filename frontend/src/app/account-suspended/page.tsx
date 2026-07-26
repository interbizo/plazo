"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import api, { tokenStorage, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ShieldAlert, Send, Clock, CheckCircle, XCircle, LogIn } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

interface Appeal {
  id: string;
  reason: string;
  evidence?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote?: string;
  createdAt: string;
  reviewedAt?: string;
}

export default function AccountSuspendedPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout, fetchUser } = useAuthStore();
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    // Check if user has a token (might be suspended but still has token)
    const token = tokenStorage.getAccessToken();
    setHasToken(!!token);

    if (token) {
      // Try to fetch user profile — if suspended, JWT guard allows appeal routes
      fetchUser();
      fetchAppeals();
    } else {
      setIsLoading(false);
    }
  }, []);

  // If user is active (appeal approved), redirect to home
  useEffect(() => {
    if (user && user.accountStatus === "ACTIVE") {
      router.replace("/");
    }
  }, [user, router]);

  const fetchAppeals = async () => {
    try {
      const { data } = await api.get("/api/account-appeal/my-appeals");
      setAppeals(Array.isArray(data) ? data : []);
    } catch {
      setAppeals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Alasan banding wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/account-appeal/submit", {
        reason: reason.trim(),
        evidence: evidence.trim() || undefined,
      });
      toast.success("Banding berhasil diajukan!");
      setReason("");
      setEvidence("");
      fetchAppeals();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const hasPendingAppeal = appeals.some((a) => a.status === "PENDING");

  // Show loading only briefly
  if (isLoading && hasToken) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 bg-gray-50">
      <div className="w-full max-w-lg">
        {/* Status Card */}
        <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm mb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <ShieldAlert className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Akun Di-Suspend</h1>
          <p className="mt-2 text-sm text-gray-600">
            Akun Anda telah di-suspend oleh admin. Anda masih bisa mengajukan banding untuk memulihkan akun.
          </p>
          <p className="mt-2 text-xs text-red-600">
            Jika tidak ada tindakan dalam 30 hari, akun akan dihapus permanen.
          </p>
        </div>

        {/* If not authenticated, show login prompt */}
        {!hasToken && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm mb-6 text-center">
            <p className="text-sm text-gray-600 mb-4">
              Silakan login untuk mengajukan banding pemulihan akun.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Login untuk Ajukan Banding
            </Link>
          </div>
        )}

        {/* Appeal Form — only show if authenticated and no pending appeal */}
        {hasToken && !hasPendingAppeal && (
          <form onSubmit={handleSubmitAppeal} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              Ajukan Banding
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alasan Banding <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Jelaskan mengapa akun Anda seharusnya dipulihkan..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bukti Pendukung (opsional)
                </label>
                <input
                  type="url"
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Link ke bukti (Google Drive, screenshot, dll)"
                />
              </div>

              <Button type="submit" isLoading={submitting} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                Kirim Banding
              </Button>
            </div>
          </form>
        )}

        {/* Pending Appeal Notice */}
        {hasToken && hasPendingAppeal && (
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 shadow-sm mb-6 text-center">
            <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-yellow-800">Banding Sedang Diproses</h3>
            <p className="text-xs text-yellow-700 mt-1">
              Admin akan meninjau banding Anda dalam 1-3 hari kerja.
            </p>
          </div>
        )}

        {/* Appeal History */}
        {appeals.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Riwayat Banding</h2>
            <div className="space-y-4">
              {appeals.map((appeal) => (
                <div key={appeal.id} className="rounded-lg border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">
                      {new Date(appeal.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      appeal.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                      appeal.status === "APPROVED" ? "bg-green-100 text-green-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {appeal.status === "PENDING" && <Clock className="h-3 w-3" />}
                      {appeal.status === "APPROVED" && <CheckCircle className="h-3 w-3" />}
                      {appeal.status === "REJECTED" && <XCircle className="h-3 w-3" />}
                      {appeal.status === "PENDING" ? "Menunggu Review" :
                       appeal.status === "APPROVED" ? "Disetujui" : "Ditolak"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{appeal.reason}</p>
                  {appeal.adminNote && (
                    <p className="mt-2 text-xs text-gray-500 border-t pt-2">
                      <strong>Catatan Admin:</strong> {appeal.adminNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logout / Back */}
        <div className="text-center space-x-4">
          {hasToken && (
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Logout
            </button>
          )}
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-700">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
