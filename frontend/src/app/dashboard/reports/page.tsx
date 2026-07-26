"use client";

import { useEffect, useState } from "react";
import { reportApi, type Report } from "@/services/report.service";
import { AlertCircle, MessageSquare, Clock, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export default function BuyerReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchReports();
  }, [page]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await reportApi.getMyReports({ page, limit: 10 });
      setReports(response.data.data);
      setTotalPages(response.data.meta.totalPages);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: {
        label: "Menunggu",
        color: "bg-yellow-100 text-yellow-700",
        icon: Clock,
      },
      REVIEWING: {
        label: "Ditinjau",
        color: "bg-blue-100 text-blue-700",
        icon: AlertCircle,
      },
      RESOLVED: {
        label: "Selesai",
        color: "bg-green-100 text-green-700",
        icon: CheckCircle,
      },
      DISMISSED: {
        label: "Ditolak",
        color: "bg-gray-100 text-gray-700",
        icon: XCircle,
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  const getTargetTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      user: "Pengguna",
      product: "Produk",
      service: "Layanan",
      job: "Pekerjaan",
      review: "Ulasan",
      general: "Umum",
    };
    return types[type] || type;
  };

  if (loading && page === 1) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Riwayat Laporan</h1>
        <p className="mt-1 text-sm text-gray-500">
          Lihat dan kelola laporan yang pernah Anda buat
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Belum ada laporan
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Anda belum pernah membuat laporan
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Link
              key={report.id}
              href={`/dashboard/reports/${report.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusBadge(report.status)}
                    <span className="text-xs text-gray-500">
                      {getTargetTypeLabel(report.targetType)}
                    </span>
                  </div>
                  
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    {report.reason}
                  </h3>
                  
                  {report.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {report.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(report.createdAt), {
                        addSuffix: true,
                        locale: idLocale,
                      })}
                    </span>
                    {report._count && report._count.messages > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {report._count.messages} pesan
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  <div className="rounded-full bg-blue-50 p-2">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sebelumnya
          </button>
          <span className="text-sm text-gray-600">
            Halaman {page} dari {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Selanjutnya
          </button>
        </div>
      )}
    </div>
  );
}
