"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { MessageCircle, Clock, CheckCircle, XCircle, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

interface Report {
  id: string;
  reason: string;
  description: string;
  status: string;
  createdAt: string;
  _count: {
    messages: number;
  };
}

export default function MyReportsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    loadReports();
  }, [user, page]);

  const loadReports = async () => {
    try {
      const response = await api.get(`/api/reports/my-reports?page=${page}&limit=10`);
      setReports(response.data.data.data);
      setTotalPages(response.data.data.pagination.totalPages);
    } catch (error: any) {
      console.error("Load reports error:", error);
      toast.error(error.response?.data?.message || "Gagal memuat laporan");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
      PENDING: { label: "Menunggu", color: "bg-yellow-100 text-yellow-800", icon: Clock },
      REVIEWING: { label: "Ditinjau", color: "bg-blue-100 text-blue-800", icon: Clock },
      RESOLVED: { label: "Selesai", color: "bg-green-100 text-green-800", icon: CheckCircle },
      DISMISSED: { label: "Ditolak", color: "bg-red-100 text-red-800", icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Laporan Saya</h1>
          <p className="text-gray-600 mt-2">Kelola dan pantau laporan yang Anda buat</p>
        </div>

        {reports.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Laporan</h3>
            <p className="text-gray-600 mb-6">Anda belum membuat laporan apapun</p>
            <button
              onClick={() => router.push("/")}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Kembali ke Beranda
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                onClick={() => router.push(`/reports/${report.id}`)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{report.reason}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{report.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      <span>{report._count.messages} pesan</span>
                    </div>
                    <span>
                      {new Date(report.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {getStatusBadge(report.status)}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sebelumnya
                </button>
                <span className="px-4 py-2 text-gray-700">
                  Halaman {page} dari {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Selanjutnya
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
