"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { buyerApi } from "@/services/buyer.service";
import { formatPrice, formatDate, formatRelativeTime } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ArrowLeft,
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

interface JobDetail {
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

interface ProposalItem {
  id: string;
  message: string;
  bidPrice: number;
  status: string;
  seller?: { id: string; firstName: string; lastName: string; avatar?: string };
  createdAt: string;
}

interface ApiErrorResponse {
  response?: { data?: { message?: string } };
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<JobDetail | null>(null);
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [jobRes, propRes] = await Promise.all([
        buyerApi.getJobDetail(jobId),
        buyerApi.getJobProposals(jobId, { page: 1, limit: 50 }),
      ]);
      setJob(jobRes.data);
      setProposals(propRes.data?.data || []);
    } catch {
      toast.error("Gagal memuat detail pekerjaan");
      router.push("/dashboard/jobs");
    } finally {
      setIsLoading(false);
    }
  }, [jobId, router]);

  useEffect(() => {
    if (!jobId) return;
    const timer = window.setTimeout(() => {
      void fetchData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [jobId, fetchData]);

  const handleAccept = async (proposalId: string) => {
    setActionLoading(proposalId);
    try {
      await buyerApi.acceptProposal(proposalId);
      toast.success("Proposal diterima!");
      fetchData();
    } catch (err: unknown) {
      toast.error(
        (err as ApiErrorResponse)?.response?.data?.message ||
          "Gagal menerima proposal",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (proposalId: string) => {
    setActionLoading(proposalId);
    try {
      await buyerApi.rejectProposal(proposalId);
      toast.success("Proposal ditolak");
      fetchData();
    } catch (err: unknown) {
      toast.error(
        (err as ApiErrorResponse)?.response?.data?.message ||
          "Gagal menolak proposal",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    try {
      await buyerApi.deleteJob(jobId);
      toast.success("Job dihapus");
      router.push("/dashboard/jobs");
    } catch (err: unknown) {
      toast.error(
        (err as ApiErrorResponse)?.response?.data?.message ||
          "Gagal menghapus job",
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!job) return null;

  return (
    <div>
      <Link
        href="/dashboard/jobs"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium mb-2 ${
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
          <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
        </div>
        <div className="flex gap-2">
          {job.status === "OPEN" && (
            <>
              <Link href={`/dashboard/jobs/${jobId}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-1" /> Edit
                </Button>
              </Link>
              {confirmDelete ? (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5">
                  <span className="text-sm text-red-700">Hapus job ini?</span>
                  <Button variant="danger" size="sm" onClick={handleDelete}>
                    Konfirmasi
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Batal
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Deskripsi
            </h2>
            <p className="text-sm text-gray-600 whitespace-pre-line">
              {job.description}
            </p>
          </div>

          {/* Proposals */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              <Users className="inline h-4 w-4 mr-1" />
              Proposal ({proposals.length})
            </h2>
            {job.maxProposals ? (
              <p className="mb-4 text-sm text-gray-500">
                Batas proposal: {job._count?.proposals ?? proposals.length} / {job.maxProposals}
              </p>
            ) : null}
            {proposals.length === 0 ? (
              <EmptyState
                icon={<Users className="h-10 w-10 text-gray-300" />}
                title="Belum ada proposal"
                description="Tunggu freelancer mengirim proposal untuk job ini."
              />
            ) : (
              <div className="space-y-4">
                {proposals.map((p) => (
                  <div
                    key={p.id}
                    className="border border-gray-100 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={p.seller?.avatar}
                          firstName={p.seller?.firstName}
                          lastName={p.seller?.lastName}
                          size="sm"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {p.seller?.firstName} {p.seller?.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatRelativeTime(p.createdAt)}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-blue-600">
                        {formatPrice(p.bidPrice)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">
                      {p.message}
                    </p>
                    {p.status === "PENDING" && job.status === "OPEN" && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          isLoading={actionLoading === p.id}
                          onClick={() => handleAccept(p.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Terima
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          isLoading={actionLoading === p.id}
                          onClick={() => handleReject(p.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Tolak
                        </Button>
                      </div>
                    )}
                    {p.status !== "PENDING" && (
                      <span
                        className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.status === "ACCEPTED"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {p.status === "ACCEPTED" ? "Diterima" : "Ditolak"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Info</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Budget:</span>
                <span className="font-semibold">{formatPrice(job.budget)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Proposal:</span>
                <span className="font-semibold">
                  {job._count?.proposals ?? proposals.length}
                  {job.maxProposals ? ` / ${job.maxProposals}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Dibuat:</span>
                <span>{formatDate(job.createdAt)}</span>
              </div>
            </div>
          </div>
          {job.tags && job.tags.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-1">
                {job.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
