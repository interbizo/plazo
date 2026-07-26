"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buyerApi } from "@/services/buyer.service";
import { marketplaceApi } from "@/services/marketplace.service";
import { useAuthStore } from "@/stores/auth.store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";

interface CategoryItem {
  id: string;
  name: string;
}

interface ApiErrorResponse {
  response?: { data?: { message?: string } };
}

export default function CreateJobPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [loadingKyc, setLoadingKyc] = useState(true);
  const [form, setForm] = useState({
    title: "",
    description: "",
    budget: "",
    categoryId: "",
    tags: "",
    maxProposals: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catsRes, profileRes] = await Promise.all([
          marketplaceApi.getCategories("SERVICE").catch(() => ({ data: [] })),
          buyerApi.getProfile().catch(() => ({ data: null })),
        ]);
        const cats = Array.isArray(catsRes.data)
          ? catsRes.data
          : (catsRes.data as { data?: CategoryItem[] })?.data || [];
        setCategories(cats);

        // Get KYC status from profile or user store
        const profileData = profileRes.data?.data || profileRes.data;
        setKycStatus(profileData?.kycStatus || user?.kycStatus || "NOT_SUBMITTED");
      } catch {
        setKycStatus("NOT_SUBMITTED");
      } finally {
        setLoadingKyc(false);
      }
    };
    fetchData();
  }, [user]);

  const isKycApproved = kycStatus === "APPROVED";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isKycApproved) {
      toast.error("Anda harus menyelesaikan verifikasi KYC terlebih dahulu");
      return;
    }
    if (!form.title || !form.description || !form.budget) {
      toast.error("Judul, deskripsi, dan budget wajib diisi");
      return;
    }
    setIsSubmitting(true);
    try {
      await buyerApi.createJob({
        title: form.title,
        description: form.description,
        budget: Number(form.budget),
        categoryId: form.categoryId || undefined,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : undefined,
        maxProposals: form.maxProposals
          ? Number(form.maxProposals)
          : null,
      });
      toast.success("Job berhasil dibuat!");
      router.push("/dashboard/jobs");
    } catch (err: unknown) {
      toast.error(
        (err as ApiErrorResponse)?.response?.data?.message ||
          "Gagal membuat job",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Link
        href="/dashboard/jobs"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Link>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Posting Job Baru</h1>

      {/* KYC Warning */}
      {!loadingKyc && !isKycApproved && (
        <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-6 w-6 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-orange-900">
                Verifikasi KYC Diperlukan
              </h3>
              <p className="text-sm text-orange-700 mt-1">
                Untuk menjaga keamanan dan mencegah postingan palsu, Anda harus menyelesaikan verifikasi KYC terlebih dahulu sebelum dapat memposting lowongan pekerjaan.
              </p>
              <Link
                href="/dashboard/kyc"
                className="mt-3 inline-flex items-center gap-1 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
              >
                Verifikasi KYC Sekarang
              </Link>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        <Input
          label="Judul Job"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          disabled={!isKycApproved}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Deskripsi
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={6}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            required
            disabled={!isKycApproved}
          />
        </div>
        <Input
          label="Budget (Rp)"
          type="number"
          value={form.budget}
          onChange={(e) => setForm({ ...form, budget: e.target.value })}
          required
          disabled={!isKycApproved}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kategori
          </label>
          <select
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={!isKycApproved}
          >
            <option value="">Pilih kategori (opsional)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Tags (pisahkan koma)"
          value={form.tags}
          onChange={(e) => setForm({ ...form, tags: e.target.value })}
          placeholder="design, web, react"
          disabled={!isKycApproved}
        />
        <Input
          label="Batas Proposal"
          type="number"
          min="1"
          value={form.maxProposals}
          onChange={(e) => setForm({ ...form, maxProposals: e.target.value })}
          placeholder="Contoh: 10"
          helperText="Opsional. Setelah jumlah proposal tercapai, lowongan akan masuk status review."
          disabled={!isKycApproved}
        />
        <Button type="submit" isLoading={isSubmitting} disabled={!isKycApproved}>
          Posting Job
        </Button>
      </form>
    </div>
  );
}
