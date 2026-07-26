"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { adminApi } from "@/services/admin.service";
import { formatDate } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText, Trash2, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

interface Job {
  id: string;
  title?: string;
  status?: string;
  isPublished?: boolean;
  createdAt?: string;
  buyer?: { firstName?: string; lastName?: string };
  user?: { firstName?: string; lastName?: string };
}

function JobsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const page = Number(searchParams.get("page") || "1");
  const status = searchParams.get("status") || "";

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const { data } = await adminApi.getJobs({
        page,
        limit: 20,
        status: status || undefined,
      });
      setJobs(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.pages || 0);
    } catch {
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadJobs = async () => {
      setIsLoading(true);
      try {
        const { data } = await adminApi.getJobs({
          page,
          limit: 20,
          status: status || undefined,
        });
        setJobs(data.data || []);
        setTotal(data.total || 0);
        setTotalPages(data.pages || 0);
      } catch {
        setJobs([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadJobs();
  }, [page, status]);

  const updateURL = (params: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v);
      else sp.delete(k);
    });
    router.push(`/admin/jobs?${sp.toString()}`, { scroll: false });
  };

  const handleModerate = async (id: string, publish: boolean) => {
    try {
      await adminApi.moderateJob(id, { isPublished: publish });
      toast.success("Job diupdate");
      fetchJobs();
    } catch {
      toast.error("Gagal");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus job ini?")) return;
    try {
      await adminApi.deleteJob(id);
      toast.success("Job dihapus");
      fetchJobs();
    } catch {
      toast.error("Gagal menghapus");
    }
  };

  const STATUS_TABS = ["", "OPEN", "IN_REVIEW", "HIRED", "COMPLETED", "CANCELLED"];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Moderasi Jobs</h1>
        <p className="text-sm text-gray-500">{total} job posting</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => updateURL({ status: s, page: "1" })}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              status === s
                ? "bg-indigo-100 text-indigo-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s || "Semua"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12 text-gray-300" />}
          title="Tidak ada job"
          description=""
        />
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Job
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">
                      Published
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">
                      Tanggal
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.id} className="border-b border-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{j.title}</p>
                        <p className="text-xs text-gray-500">
                          {j.buyer?.firstName || j.user?.firstName}{" "}
                          {j.buyer?.lastName || j.user?.lastName}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={j.status === "OPEN" ? "success" : "info"}
                        >
                          {j.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={j.isPublished ? "success" : "warning"}>
                          {j.isPublished ? "Published" : "Hidden"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500">
                        {formatDate(j.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => handleModerate(j.id, !j.isPublished)}
                            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                            title={j.isPublished ? "Unpublish" : "Publish"}
                          >
                            {j.isPublished ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(j.id)}
                            className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

export default function AdminJobsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      }
    >
      <JobsContent />
    </Suspense>
  );
}
