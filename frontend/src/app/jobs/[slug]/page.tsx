"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { marketplaceApi } from "@/services/marketplace.service";
import { sellerApi } from "@/services/seller.service";
import { useAuthStore } from "@/stores/auth.store";
import type { Job } from "@/types";
import { formatPrice, formatDate, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Avatar } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Users,
  Clock,
  FileText,
  Send,
} from "lucide-react";
import toast from "react-hot-toast";

interface JobDetail extends Job {
  tenant?: {
    id: string;
    name: string;
    subdomain: string;
    ownerId: string;
    subscriptionPlan?: string;
    sellerTier?: string;
  };
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { isAuthenticated, user } = useAuthStore();

  const [job, setJob] = useState<JobDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalData, setProposalData] = useState({
    bidPrice: "",
    message: "",
  });
  const [submittingProposal, setSubmittingProposal] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      setIsLoading(true);
      try {
        const { data } = await marketplaceApi.getJobBySlug(slug);
        const raw = data as Record<string, unknown>;
        const jobData = (raw?.job || data) as JobDetail;
        if (!jobData) {
          router.push("/jobs");
          return;
        }
        setJob(jobData);
      } catch {
        router.push("/jobs");
      } finally {
        setIsLoading(false);
      }
    };
    if (slug) fetchJob();
  }, [slug, router]);

  const handleApply = () => {
    if (!isAuthenticated) {
      toast.error("Silakan login terlebih dahulu");
      router.push("/login");
      return;
    }
    if (user?.role !== "SELLER") {
      toast.error("Hanya penjual yang bisa mengirim proposal");
      return;
    }
    setShowProposalForm(true);
  };

  const handleSubmitProposal = async () => {
    if (!proposalData.bidPrice || !proposalData.message) {
      toast.error("Harga dan pesan wajib diisi");
      return;
    }
    
    if (!job || !job.id) {
      toast.error("Job tidak ditemukan. Silakan refresh halaman.");
      return;
    }

    // Validate job status
    if (job.status !== "OPEN" && job.status !== "IN_REVIEW") {
      toast.error("Job ini tidak menerima proposal");
      return;
    }

    // Validate deadline
    if (job.deadline && new Date(job.deadline) < new Date()) {
      toast.error("Deadline job sudah lewat");
      return;
    }

    setSubmittingProposal(true);
    try {
      await sellerApi.createProposal({
        jobId: job.id,
        bidPrice: Number(proposalData.bidPrice),
        message: proposalData.message,
      });
      toast.success("Proposal berhasil dikirim!");
      setShowProposalForm(false);
      setProposalData({ bidPrice: "", message: "" });
      
      // Refresh job data
      const { data } = await marketplaceApi.getJobBySlug(slug);
      const raw = data as Record<string, unknown>;
      const jobData = (raw?.job || data) as JobDetail;
      if (jobData) {
        setJob(jobData);
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      const errorMessage = apiErr?.response?.data?.message || "Gagal mengirim proposal";
      toast.error(errorMessage);
      console.error("Submit proposal error:", err);
    } finally {
      setSubmittingProposal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!job) return null;

  const statusLabel =
    job.status === "OPEN"
      ? "Terbuka"
      : job.status === "IN_REVIEW"
        ? "Dalam Review"
        : job.status === "HIRED"
          ? "Dipekerjakan"
          : job.status;
  const statusColor =
    job.status === "OPEN"
      ? "bg-green-100 text-green-700"
      : job.status === "IN_REVIEW"
        ? "bg-yellow-100 text-yellow-700"
        : job.status === "HIRED"
          ? "bg-blue-100 text-blue-700"
          : "bg-gray-100 text-gray-600";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link
          href="/jobs"
          className="hover:text-blue-600 flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Pekerjaan
        </Link>
        <span>/</span>
        <span className="text-gray-900 truncate">{job.title}</span>
      </nav>

      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}
            >
              {statusLabel}
            </span>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">
              {job.title}
            </h1>
          </div>
        </div>

        {/* Meta info */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <DollarSign className="h-3.5 w-3.5" />
              Budget
            </div>
            <p className="text-lg font-bold text-blue-600">
              {formatPrice(job.budget)}
            </p>
          </div>
          {job.deadline && (
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                <Calendar className="h-3.5 w-3.5" />
                Deadline
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {formatDate(job.deadline)}
              </p>
            </div>
          )}
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <Users className="h-3.5 w-3.5" />
              Proposal
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {job._count?.proposals ?? 0}
              {job.maxProposals ? ` / ${job.maxProposals}` : ""} proposal
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <Clock className="h-3.5 w-3.5" />
              Diposting
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {formatRelativeTime(job.createdAt)}
            </p>
          </div>
        </div>

        {/* Client */}
        {job.buyer && (
          <div className="mt-5 flex items-center gap-3 rounded-lg border border-gray-100 p-3">
            <Avatar
              src={job.buyer.avatar}
              firstName={job.buyer.firstName}
              lastName={job.buyer.lastName}
              size="sm"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {job.buyer.firstName} {job.buyer.lastName}
              </p>
              <p className="text-xs text-gray-500">Klien</p>
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
          <FileText className="h-5 w-5 text-gray-400" />
          Deskripsi Pekerjaan
        </h2>
        <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-line">
          {job.description}
        </div>
      </div>

      {/* Skills */}
      {job.skills?.length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Skill yang Dibutuhkan
          </h2>
          <div className="flex flex-wrap gap-2">
            {job.skills.map((skill: string) => (
              <span
                key={skill}
                className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Apply CTA */}
      {job.status === "OPEN" && !showProposalForm && (
        <div className="mt-6 rounded-xl border-2 border-blue-100 bg-blue-50 p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Tertarik dengan proyek ini?
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Kirim proposal Anda untuk memperkenalkan penawaran dan pengalaman kerja Anda ke klien.
          </p>
          {job.maxProposals ? (
            <p className="mt-2 text-xs text-gray-500">
              Kuota proposal: {job._count?.proposals ?? 0} / {job.maxProposals}
            </p>
          ) : null}
          <Button onClick={handleApply} size="lg" className="mt-4">
            <Send className="mr-2 h-4 w-4" />
            Kirim Proposal
          </Button>
        </div>
      )}

      {/* Proposal Form */}
      {showProposalForm && (
        <div className="mt-6 rounded-xl border-2 border-blue-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Kirim Proposal
          </h3>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harga Penawaran (Rp)
              </label>
              <input
                type="number"
                value={proposalData.bidPrice}
                onChange={(e) =>
                  setProposalData({ ...proposalData, bidPrice: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="Masukkan harga penawaran"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pesan
              </label>
              <textarea
                value={proposalData.message}
                onChange={(e) =>
                  setProposalData({ ...proposalData, message: e.target.value })
                }
                rows={5}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="Jelaskan mengapa Anda cocok untuk proyek ini..."
                required
              />
            </div>
            <div className="flex gap-2">
              <Button
                isLoading={submittingProposal}
                onClick={handleSubmitProposal}
              >
                <Send className="h-4 w-4 mr-1" /> Kirim
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowProposalForm(false)}
              >
                Batal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
