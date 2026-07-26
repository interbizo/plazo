"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { buyerApi } from "@/services/buyer.service";
import { marketplaceApi } from "@/services/marketplace.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

interface CategoryItem {
  id: string;
  name: string;
}

interface ApiErrorResponse {
  response?: { data?: { message?: string } };
}

export default function EditJobPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    budget: "",
    categoryId: "",
    tags: "",
    maxProposals: "",
  });

  useEffect(() => {
    const fetch = async () => {
      try {
        const [jobRes, catRes] = await Promise.all([
          buyerApi.getJobDetail(jobId),
          marketplaceApi.getCategories("SERVICE"),
        ]);
        const job = jobRes.data;
        setForm({
          title: job.title || "",
          description: job.description || "",
          budget: String(job.budget || ""),
          categoryId: job.categoryId || "",
          tags: job.tags?.join(", ") || "",
          maxProposals: job.maxProposals ? String(job.maxProposals) : "",
        });
        const cats = Array.isArray(catRes.data)
          ? catRes.data
          : (catRes.data as { data?: CategoryItem[] })?.data || [];
        setCategories(cats);
      } catch {
        toast.error("Gagal memuat data pekerjaan");
        router.push("/dashboard/jobs");
      } finally {
        setIsLoading(false);
      }
    };
    if (jobId) fetch();
  }, [jobId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.budget) {
      toast.error("Judul, deskripsi, dan budget wajib diisi");
      return;
    }
    setIsSubmitting(true);
    try {
      await buyerApi.updateJob(jobId, {
        title: form.title,
        description: form.description,
        budget: Number(form.budget),
        categoryId: form.categoryId || undefined,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : undefined,
        maxProposals: form.maxProposals
          ? Number(form.maxProposals)
          : null,
      });
      toast.success("Job berhasil diperbarui!");
      router.push(`/dashboard/jobs/${jobId}`);
    } catch (err: unknown) {
      toast.error(
        (err as ApiErrorResponse)?.response?.data?.message ||
          "Gagal memperbarui job",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <Link
        href={`/dashboard/jobs/${jobId}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Link>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Edit Job</h1>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        <Input
          label="Judul Job"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Deskripsi
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={6}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            required
          />
        </div>
        <Input
          label="Budget (Rp)"
          type="number"
          value={form.budget}
          onChange={(e) => setForm({ ...form, budget: e.target.value })}
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kategori
          </label>
          <select
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
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
        />
        <Input
          label="Batas Proposal"
          type="number"
          min="1"
          value={form.maxProposals}
          onChange={(e) => setForm({ ...form, maxProposals: e.target.value })}
          placeholder="Contoh: 10"
          helperText="Opsional. Setelah jumlah proposal tercapai, lowongan akan otomatis masuk review."
        />
        <Button type="submit" isLoading={isSubmitting}>
          Simpan Perubahan
        </Button>
      </form>
    </div>
  );
}
