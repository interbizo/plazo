"use client";

import { useEffect, useState, useCallback } from "react";
import { sellerApi } from "@/services/seller.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { CKEditor4 } from "@/components/ui/ckeditor4";
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ArrowLeft,
  Save,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StorePage {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  isPublished: boolean;
  sortOrder: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PageFormData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  isPublished: boolean;
  sortOrder: number;
  metaTitle: string;
  metaDescription: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const EMPTY_FORM: PageFormData = {
  title: "",
  slug: "",
  content: "",
  excerpt: "",
  isPublished: false,
  sortOrder: 0,
  metaTitle: "",
  metaDescription: "",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StorePagesCmsPage() {
  const [pages, setPages] = useState<StorePage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StorePage | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState<PageFormData>({ ...EMPTY_FORM });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // ---- Data fetching -------------------------------------------------------

  const fetchPages = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await sellerApi.getStorePages();
      const rawList = Array.isArray(data) ? data : data?.data ?? [];
      // Map CMSPage to StorePage, adding missing sortOrder
      const list: StorePage[] = rawList.map((page: any, index: number) => ({
        ...page,
        sortOrder: page.sortOrder ?? index
      }));
      setPages(list);
    } catch {
      toast.error("Gagal memuat halaman toko");
      setPages([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  // ---- Form helpers --------------------------------------------------------

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditing(null);
    setShowForm(false);
    setSlugManuallyEdited(false);
  };

  const handleTitleChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: slugManuallyEdited ? prev.slug : generateSlug(value),
    }));
  };

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    setForm((prev) => ({ ...prev, slug: generateSlug(value) }));
  };

  const startEdit = (page: StorePage) => {
    setForm({
      title: page.title,
      slug: page.slug,
      content: page.content || "",
      excerpt: page.excerpt || "",
      isPublished: page.isPublished,
      sortOrder: page.sortOrder ?? 0,
      metaTitle: page.metaTitle || "",
      metaDescription: page.metaDescription || "",
    });
    setSlugManuallyEdited(true);
    setEditing(page);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startCreate = () => {
    resetForm();
    setForm((prev) => ({
      ...prev,
      sortOrder: pages.length > 0 ? Math.max(...pages.map((p) => p.sortOrder ?? 0)) + 1 : 0,
    }));
    setShowForm(true);
  };

  // ---- CRUD ----------------------------------------------------------------

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Judul halaman wajib diisi");
      return;
    }
    if (!form.slug.trim()) {
      toast.error("Slug halaman wajib diisi");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        content: form.content,
        excerpt: form.excerpt || undefined,
        isPublished: form.isPublished,
        sortOrder: form.sortOrder,
        metaTitle: form.metaTitle || undefined,
        metaDescription: form.metaDescription || undefined,
      };

      if (editing) {
        await sellerApi.updateStorePage(editing.id, payload);
        toast.success("Halaman berhasil diperbarui");
      } else {
        await sellerApi.createStorePage(payload);
        toast.success("Halaman berhasil dibuat");
      }
      resetForm();
      fetchPages();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      toast.error(apiErr?.response?.data?.message || "Gagal menyimpan halaman");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (page: StorePage) => {
    if (!confirm(`Hapus halaman "${page.title}"? Tindakan ini tidak dapat dibatalkan.`)) return;

    setDeleting(page.id);
    try {
      await sellerApi.deleteStorePage(page.id);
      toast.success("Halaman berhasil dihapus");
      if (editing?.id === page.id) resetForm();
      fetchPages();
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      toast.error(apiErr?.response?.data?.message || "Gagal menghapus halaman");
    } finally {
      setDeleting(null);
    }
  };

  // ---- Render: loading state -----------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  // ---- Render: main --------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/seller/dashboard/store"
          className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke Pengaturan Toko
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Halaman Toko</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Kelola halaman kustom untuk toko Anda
            </p>
          </div>
          {!showForm && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
              onClick={startCreate}
            >
              <Plus className="h-4 w-4 mr-1" />
              Buat Halaman
            </Button>
          )}
        </div>
      </div>

      {/* Inline Form */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">
              {editing ? "Edit Halaman" : "Buat Halaman Baru"}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 max-w-2xl">
            {/* Title */}
            <Input
              label="Judul Halaman *"
              placeholder="Contoh: Tentang Kami, FAQ, Kebijakan Pengembalian"
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="focus:border-emerald-500 focus:ring-emerald-500"
            />

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug (URL) *
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 shrink-0">/page/</span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="tentang-kami"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Otomatis dibuat dari judul. Bisa diedit manual.
              </p>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Konten Halaman
              </label>
              <CKEditor4
                value={form.content}
                onChange={(value) => setForm({ ...form, content: value })}
                placeholder="Tulis konten halaman dengan format yang menarik..."
                minHeight="400px"
              />
              <p className="mt-1 text-xs text-gray-500">
                Gunakan editor untuk memformat teks dengan bold, list, heading, image, dll.
              </p>
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ringkasan{" "}
                <span className="font-normal text-gray-400">(opsional)</span>
              </label>
              <textarea
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                rows={2}
                placeholder="Ringkasan singkat halaman..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Published + Sort Order row */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) =>
                    setForm({ ...form, isPublished: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Publikasikan
                </span>
              </label>

              <div className="w-32">
                <Input
                  label="Urutan"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sortOrder: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* SEO Section */}
            <div className="border-t border-gray-100 pt-4 mt-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                SEO (Opsional)
              </p>
              <div className="space-y-3">
                <Input
                  label="Meta Title"
                  placeholder="Judul untuk mesin pencari"
                  value={form.metaTitle}
                  onChange={(e) =>
                    setForm({ ...form, metaTitle: e.target.value })
                  }
                  className="focus:border-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meta Description
                  </label>
                  <textarea
                    value={form.metaDescription}
                    onChange={(e) =>
                      setForm({ ...form, metaDescription: e.target.value })
                    }
                    rows={2}
                    placeholder="Deskripsi singkat untuk hasil pencarian..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
                isLoading={saving}
                onClick={handleSave}
              >
                <Save className="h-4 w-4 mr-1" />
                {editing ? "Simpan Perubahan" : "Buat Halaman"}
              </Button>
              <Button variant="ghost" onClick={resetForm} disabled={saving}>
                Batal
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pages List */}
      {pages.length === 0 && !showForm ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="Belum ada halaman"
          description="Buat halaman Tentang Toko, FAQ, atau Kebijakan untuk toko Anda"
          action={
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
              onClick={startCreate}
            >
              <Plus className="h-4 w-4 mr-1" />
              Buat Halaman Pertama
            </Button>
          }
        />
      ) : pages.length > 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <div className="col-span-4">Halaman</div>
            <div className="col-span-2">Slug</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-1 text-center">Urutan</div>
            <div className="col-span-3 text-right">Aksi</div>
          </div>

          {/* Table rows */}
          {pages
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
            .map((page) => (
              <div
                key={page.id}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center px-5 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors"
              >
                {/* Title */}
                <div className="sm:col-span-4 flex items-center gap-2.5 min-w-0">
                  <div className="shrink-0 rounded-lg bg-emerald-50 p-2">
                    <FileText className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {page.title}
                    </p>
                    {page.excerpt && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {page.excerpt}
                      </p>
                    )}
                  </div>
                </div>

                {/* Slug */}
                <div className="sm:col-span-2 min-w-0">
                  <span className="text-xs font-mono text-gray-500 truncate block">
                    /{page.slug}
                  </span>
                </div>

                {/* Status */}
                <div className="sm:col-span-2 flex sm:justify-center">
                  {page.isPublished ? (
                    <Badge variant="success">
                      <Eye className="h-3 w-3 mr-1" />
                      Published
                    </Badge>
                  ) : (
                    <Badge variant="default">
                      <EyeOff className="h-3 w-3 mr-1" />
                      Draft
                    </Badge>
                  )}
                </div>

                {/* Sort Order */}
                <div className="sm:col-span-1 text-center">
                  <span className="text-sm text-gray-600">
                    {page.sortOrder ?? 0}
                  </span>
                </div>

                {/* Actions */}
                <div className="sm:col-span-3 flex items-center justify-end gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(page)}
                    disabled={saving}
                  >
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(page)}
                    disabled={deleting === page.id}
                  >
                    {deleting === page.id ? (
                      <Spinner size="sm" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
        </div>
      ) : null}
    </div>
  );
}
