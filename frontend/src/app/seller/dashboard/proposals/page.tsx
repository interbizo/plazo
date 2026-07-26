"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sellerApi } from "@/services/seller.service";
import { formatPrice, formatRelativeTime } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/badge";
import { Pagination } from "@/components/shared/pagination";
import { FileText } from "lucide-react";

interface ProposalBuyer {
  firstName: string;
  lastName: string;
}

interface ProposalJob {
  title?: string;
  budget?: number;
  buyer?: ProposalBuyer;
}

interface Proposal {
  id: string;
  message?: string;
  bidPrice: number;
  status: string;
  createdAt: string;
  job?: ProposalJob;
  [key: string]: unknown;
}

interface ProposalStats {
  total: number;
  pending: number;
  accepted: number;
  acceptRate: number;
  [key: string]: unknown;
}

function ProposalsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState<ProposalStats | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const page = Number(searchParams.get("page") || "1");
  const status = searchParams.get("status") || "";

  useEffect(() => {
    const fetchProposals = async () => {
      setIsLoading(true);
      try {
        const [propRes, statsRes] = await Promise.allSettled([
          sellerApi.getProposals({
            page,
            limit: 10,
            status: status || undefined,
          }),
          sellerApi.getProposalStats(),
        ]);
        
        if (propRes.status === "fulfilled") {
          setProposals(propRes.value.data.data || []);
          setTotal(propRes.value.data.total || 0);
          setTotalPages(propRes.value.data.pages || 0);
        }
        if (statsRes.status === "fulfilled") {
          setStats(statsRes.value.data);
        }
      } catch {
        setProposals([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProposals();
  }, [page, status]);

  const updateURL = (params: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v);
      else sp.delete(k);
    });
    router.push(`/seller/dashboard/proposals?${sp.toString()}`, {
      scroll: false,
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Proposal Saya</h1>
        <p className="text-sm text-gray-500">{total} proposal</p>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total", value: stats.total },
            { label: "Pending", value: stats.pending },
            { label: "Diterima", value: stats.accepted },
            { label: "Tingkat Penerimaan", value: `${stats.acceptRate}%` },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-gray-200 bg-white p-3 text-center"
            >
              <p className="text-lg font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Status Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { value: "", label: "Semua" },
          { value: "PENDING", label: "Pending" },
          { value: "ACCEPTED", label: "Diterima" },
          { value: "REJECTED", label: "Ditolak" },
        ].map((s) => (
          <button
            key={s.value}
            onClick={() => updateURL({ status: s.value, page: "1" })}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              status === s.value
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : proposals.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12 text-gray-300" />}
          title="Belum ada proposal"
          description="Proposal yang Anda kirim akan muncul di sini."
        />
      ) : (
        <>
          <div className="space-y-3">
            {proposals.map((p: Proposal) => (
              <div
                key={p.id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {p.job?.title || "—"}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Anggaran: {formatPrice(p.job?.budget || 0)} •{" "}
                      {p.job?.buyer?.firstName} {p.job?.buyer?.lastName}
                    </p>
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {p.message}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                      <span>
                        Bid: <strong>{formatPrice(p.bidPrice)}</strong>
                      </span>
                      <span>{formatRelativeTime(p.createdAt)}</span>
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
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

export default function SellerProposalsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      }
    >
      <ProposalsContent />
    </Suspense>
  );
}
