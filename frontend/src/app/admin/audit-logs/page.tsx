"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { adminApi } from "@/services/admin.service";
import { formatDate } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollText } from "lucide-react";

interface AuditLog {
  id: string;
  action?: string;
  entity?: string;
  resource?: string;
  description?: string;
  details?: string;
  user?: { firstName?: string; lastName?: string; email?: string };
  createdAt?: string;
}

function AuditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const page = Number(searchParams.get("page") || "1");

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const { data } = await adminApi.getAuditLogs({ page, limit: 30 });
        setLogs(data.data || []);
        setTotal(data.total || 0);
        setTotalPages(data.pages || 0);
      } catch {
        setLogs([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [page]);

  const updateURL = (params: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v);
      else sp.delete(k);
    });
    router.push(`/admin/audit-logs?${sp.toString()}`, { scroll: false });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500">{total} log</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="h-12 w-12 text-gray-300" />}
          title="Tidak ada audit log"
          description=""
        />
      ) : (
        <>
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-lg border border-gray-200 bg-white px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="info">{log.action}</Badge>
                      <span className="text-xs text-gray-500">
                        {log.entity || log.resource}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {log.description || log.details || "-"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {log.user?.firstName} {log.user?.lastName} (
                      {log.user?.email})
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 shrink-0">
                    {formatDate(log.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(p) => updateURL({ page: String(p) })}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminAuditLogsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      }
    >
      <AuditContent />
    </Suspense>
  );
}
