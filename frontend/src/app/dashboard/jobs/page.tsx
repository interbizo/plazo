"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { buyerApi } from "@/services/buyer.service";
import { formatPrice, formatRelativeTime } from "@/lib/utils";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { FileText, Users, Clock, DollarSign, Search } from "lucide-react";

interface JobItem {
  id: string;
  title: string;
  description: string;
  budget: number;
  status: string;
  maxProposals?: number | null;
  tags?: string[];
  _count?: { proposals: number };
  createdAt: string;
}

function JobsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const page = Number(searchParams.get("page") || "1");
  const status = searchParams.get("status") || "";

  useEffect(() => {
    const fetchJobs = async () => {
      setIsLoading(true);
      try {
        const { data } = await buyerApi.getMyJobs({
          page,
          limit: 10,
          status: status || undefined,
          search: search || undefined,
        });
        setJobs(data.data || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(data.pagination?.pages || 0);
      } catch {
        // Silently fallback to empty — user sees "no jobs" empty state
        setJobs([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchJobs();
  }, [page, status, search]);

  const updateURL = (params: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v);
      else sp.delete(k);
    });
    router.push(`/dashboard/jobs?${sp.toString()}`, { scroll: false });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pekerjaan Saya</h1>
          <p className="text-sm text-gray-500">
            {total > 0
              ? `${total} pekerjaan`
              : "Kelola pekerjaan yang Anda posting"}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/jobs/create"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + Posting Job
          </Link>
          <Link
            href="/jobs"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 self-center"
          >
            Browse Jobs
          </Link>
        </div>
      </div>

      {/* Search & Status Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari pekerjaan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["", "OPEN", "IN_REVIEW", "HIRED", "COMPLETED"].map((s) => (
            <button
              key={s}
              onClick={() => updateURL({ status: s, page: "1" })}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                status === s
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === ""
                ? "Semua"
                : s === "OPEN"
                  ? "Terbuka"
                  : s === "IN_REVIEW"
                    ? "Dalam Review"
                    : s === "HIRED"
                      ? "Dipekerjakan"
                      : "Selesai"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12 text-gray-300" />}
          title="Belum ada pekerjaan"
          description="Anda belum memposting pekerjaan apapun."
        />
      ) : (
        <>
          <div className="space-y-3">
            {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/dashboard/jobs/${job.id}`}
                  className="block rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium mb-1 ${
                          job.status === "OPEN"
                            ? "bg-green-100 text-green-700"
                            : job.status === "IN_REVIEW"
                              ? "bg-yellow-100 text-yellow-700"
                              : job.status === "HIRED"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {job.status === "OPEN"
                          ? "Terbuka"
                          : job.status === "IN_REVIEW"
                            ? "Dalam Review"
                            : job.status === "HIRED"
                              ? "Dipekerjakan"
                              : job.status}
                      </span>
                      <h3 className="text-sm font-semibold text-gray-900">
                        {job.title}
                      </h3>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatPrice(job.budget)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {job._count?.proposals ?? 0}
                          {job.maxProposals ? ` / ${job.maxProposals}` : ""} proposal
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(job.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
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

export default function BuyerJobsPage() {
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
