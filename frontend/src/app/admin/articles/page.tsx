"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Edit,
  Eye,
  FileUp,
  Image as ImageIcon,
  Newspaper,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { articleAdminApi } from "@/services/article.service";
import { uploadApi } from "@/services/upload.service";
import { getErrorMessage } from "@/lib/api";
import { resolveImageUrl } from "@/lib/image-url";
import type { Article, ArticleCategory, ArticleStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { CKEditor4 } from "@/components/ui/ckeditor4";
import { countWords } from "@/components/ui/word-counter";

const MIN_WORDS = 800;
const MAX_WORDS = 1600;

type ArticleFormState = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  thumbnail: string;
  youtubeUrl: string;
  categoryId: string;
  tags: string;
  status: ArticleStatus;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogImage: string;
};

type ImportError = {
  row: number;
  title?: string;
  message: string;
};

const emptyForm: ArticleFormState = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  thumbnail: "",
  youtubeUrl: "",
  categoryId: "",
  tags: "",
  status: "DRAFT",
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  ogImage: "",
};

function statusVariant(status: string) {
  if (status === "PUBLISHED") return "success" as const;
  if (status === "ARCHIVED") return "secondary" as const;
  return "warning" as const;
}

function statusLabel(status: string) {
  if (status === "PUBLISHED") return "Published";
  if (status === "ARCHIVED") return "Archived";
  return "Draft";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ArticleFormState>(emptyForm);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const wordCount = useMemo(() => countWords(form.content), [form.content]);
  const canPublish = wordCount >= MIN_WORDS && wordCount <= MAX_WORDS;
  const isOverLimit = wordCount > MAX_WORDS;

  const fetchData = useCallback(async (page = pagination.page) => {
    setIsLoading(true);
    try {
      const [articlesRes, categoriesRes] = await Promise.all([
        articleAdminApi.getArticles({
          page,
          limit: 12,
          ...(searchInput.trim() && { search: searchInput.trim() }),
          ...(statusFilter && { status: statusFilter }),
        }),
        articleAdminApi.getCategories(),
      ]);

      const articlePayload = articlesRes.data;
      setArticles(articlePayload.data || []);
      setPagination({
        page: articlePayload.pagination?.page || page,
        pages: articlePayload.pagination?.pages || 1,
        total: articlePayload.pagination?.total || 0,
      });
      setCategories(categoriesRes.data || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, searchInput, statusFilter]);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  const resetForm = () => {
    setForm(emptyForm);
    setShowForm(false);
  };

  const startCreate = () => {
    setForm(emptyForm);
    setShowForm(true);
  };

  const startEdit = (article: Article) => {
    setForm({
      id: article.id,
      title: article.title || "",
      slug: article.slug || "",
      excerpt: article.excerpt || "",
      content: article.content || "",
      thumbnail: article.thumbnail || "",
      youtubeUrl: article.youtubeUrl || "",
      categoryId: article.categoryId || "",
      tags: (article.tags || []).join(", "),
      status: article.status || "DRAFT",
      metaTitle: article.metaTitle || "",
      metaDescription: article.metaDescription || "",
      metaKeywords: article.metaKeywords || "",
      ogImage: article.ogImage || "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Judul artikel wajib diisi");
      return;
    }
    if (!form.content.trim()) {
      toast.error("Konten artikel wajib diisi");
      return;
    }
    if (isOverLimit) {
      toast.error(`Artikel maksimal ${MAX_WORDS} kata`);
      return;
    }
    if (form.status === "PUBLISHED" && !canPublish) {
      toast.error(`Artikel publish wajib ${MIN_WORDS}-${MAX_WORDS} kata`);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: form.title,
        slug: form.slug || undefined,
        excerpt: form.excerpt || undefined,
        content: form.content,
        thumbnail: form.thumbnail || undefined,
        youtubeUrl: form.youtubeUrl || undefined,
        categoryId: form.categoryId || undefined,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        status: form.status,
        metaTitle: form.metaTitle || undefined,
        metaDescription: form.metaDescription || undefined,
        metaKeywords: form.metaKeywords || undefined,
        ogImage: form.ogImage || undefined,
      };

      if (form.id) {
        await articleAdminApi.updateArticle(form.id, payload);
        toast.success("Artikel diperbarui");
      } else {
        await articleAdminApi.createArticle(payload);
        toast.success("Artikel dibuat");
      }

      resetForm();
      fetchData(1);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadThumbnail = async (file?: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const { data } = await uploadApi.uploadFile(file, "ARTICLE_THUMBNAIL");
      setForm((current) => ({
        ...current,
        thumbnail: data.file.url,
        ogImage: current.ogImage || data.file.url,
      }));
      toast.success("Thumbnail diupload");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus artikel ini?")) return;
    try {
      await articleAdminApi.deleteArticle(id);
      toast.success("Artikel dihapus");
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleTogglePublish = async (article: Article) => {
    try {
      if (article.status === "PUBLISHED") {
        await articleAdminApi.unpublishArticle(article.id);
        toast.success("Artikel dipindah ke draft");
      } else {
        await articleAdminApi.publishArticle(article.id);
        toast.success("Artikel dipublish");
      }
      fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleImportCsv = async (file?: File) => {
    if (!file) return;
    setIsImporting(true);
    setImportErrors([]);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await articleAdminApi.importArticlesCsv(formData);
      setImportErrors(data.errors || []);
      toast.success(`${data.importedArticles?.length || 0} artikel berhasil diimport`);
      fetchData(1);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsImporting(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      toast.error("Nama kategori wajib diisi");
      return;
    }
    try {
      await articleAdminApi.createCategory({ name: categoryName });
      setCategoryName("");
      const { data } = await articleAdminApi.getCategories();
      setCategories(data || []);
      toast.success("Kategori dibuat");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleEditCategory = async (category: ArticleCategory) => {
    const name = prompt("Nama kategori", category.name);
    if (!name?.trim()) return;
    try {
      await articleAdminApi.updateCategory(category.id, {
        name,
        slug: slugify(name),
      });
      const { data } = await articleAdminApi.getCategories();
      setCategories(data || []);
      toast.success("Kategori diperbarui");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDeleteCategory = async (category: ArticleCategory) => {
    if (!confirm(`Hapus kategori "${category.name}"? Artikel terkait akan jadi tanpa kategori.`)) {
      return;
    }
    try {
      await articleAdminApi.deleteCategory(category.id);
      const { data } = await articleAdminApi.getCategories();
      setCategories(data || []);
      fetchData();
      toast.success("Kategori dihapus");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Artikel</h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola artikel, kategori, SEO, thumbnail, dan import CSV.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <FileUp className="h-4 w-4" />
            {isImporting ? "Importing..." : "Import CSV"}
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => handleImportCsv(event.target.files?.[0])}
              disabled={isImporting}
            />
          </label>
          <Button size="sm" onClick={startCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Tambah Artikel
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {form.id ? "Edit Artikel" : "Tambah Artikel"}
              </h2>
              <p className="text-xs text-gray-500">
                Draft bisa disimpan kapan saja. Publish wajib {MIN_WORDS}-{MAX_WORDS} kata.
              </p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">
                    Judul
                  </span>
                  <input
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                        slug: current.id || current.slug ? current.slug : slugify(event.target.value),
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="Judul artikel"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">
                    Slug URL
                  </span>
                  <input
                    value={form.slug}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        slug: slugify(event.target.value),
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="otomatis dari judul"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Ringkasan
                </span>
                <textarea
                  value={form.excerpt}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, excerpt: event.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="Ringkasan singkat untuk listing dan meta fallback"
                />
              </label>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-700">Konten</span>
                  <span
                    className={`text-xs font-medium ${
                      isOverLimit
                        ? "text-red-600"
                        : wordCount < MIN_WORDS
                          ? "text-amber-600"
                          : "text-green-700"
                    }`}
                  >
                    {wordCount.toLocaleString("id-ID")} kata
                  </span>
                </div>
                <CKEditor4
                  key={form.id || "new-article"}
                  value={form.content}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, content: value }))
                  }
                  placeholder="Tulis artikel 800 sampai 1600 kata..."
                  minHeight="460px"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Gunakan input YouTube di panel kanan untuk embed video yang konsisten.
                </p>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Publikasi</h3>
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">
                      Status
                    </span>
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          status: event.target.value as ArticleStatus,
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">
                      Kategori
                    </span>
                    <select
                      value={form.categoryId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          categoryId: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="">Tanpa kategori</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">
                      Tags
                    </span>
                    <input
                      value={form.tags}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, tags: event.target.value }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      placeholder="seo, marketplace, umkm"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Media</h3>
                <div className="space-y-3">
                  {form.thumbnail ? (
                    <Image
                      src={resolveImageUrl(form.thumbnail)}
                      alt="Thumbnail artikel"
                      width={640}
                      height={360}
                      className="h-40 w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-400">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <Upload className="h-4 w-4" />
                    {isUploading ? "Uploading..." : "Upload Thumbnail"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) =>
                        handleUploadThumbnail(event.target.files?.[0])
                      }
                      disabled={isUploading}
                    />
                  </label>
                  <input
                    value={form.thumbnail}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        thumbnail: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs outline-none focus:border-blue-500"
                    placeholder="URL thumbnail"
                  />
                  <input
                    value={form.youtubeUrl}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        youtubeUrl: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="URL YouTube"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">SEO</h3>
                <div className="space-y-3">
                  <input
                    value={form.metaTitle}
                    maxLength={70}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        metaTitle: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="Meta title"
                  />
                  <textarea
                    value={form.metaDescription}
                    maxLength={180}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        metaDescription: event.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="Meta description"
                  />
                  <input
                    value={form.metaKeywords}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        metaKeywords: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="Meta keywords"
                  />
                  <input
                    value={form.ogImage}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        ogImage: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    placeholder="OG image"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  className="flex-1"
                  onClick={handleSave}
                  isLoading={isSaving}
                >
                  Simpan
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Batal
                </Button>
              </div>
            </aside>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-gray-300 px-3 py-2">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") fetchData(1);
                  }}
                  className="min-w-0 flex-1 text-sm outline-none"
                  placeholder="Cari artikel..."
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none"
                >
                  <option value="">Semua status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
                <Button variant="outline" onClick={() => fetchData(1)}>
                  Terapkan
                </Button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : articles.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<Newspaper className="h-12 w-12 text-gray-300" />}
                title="Belum ada artikel"
                description="Buat artikel pertama atau import dari CSV."
              />
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {articles.map((article) => (
                <article key={article.id} className="p-4">
                  <div className="flex flex-col gap-4 md:flex-row">
                    <div className="h-24 w-full shrink-0 overflow-hidden rounded-lg bg-gray-100 md:w-36">
                      {article.thumbnail ? (
                        <Image
                          src={resolveImageUrl(article.thumbnail)}
                          alt={article.title}
                          width={288}
                          height={192}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant={statusVariant(article.status)}>
                          {statusLabel(article.status)}
                        </Badge>
                        {article.category && (
                          <Badge variant="info">{article.category.name}</Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {article.wordCount} kata
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900">{article.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                        {article.excerpt || "Tanpa ringkasan"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {article.status === "PUBLISHED" && (
                          <Link
                            href={`/articles/${article.slug}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Lihat
                          </Link>
                        )}
                        <button
                          onClick={() => startEdit(article)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleTogglePublish(article)}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        >
                          {article.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                        </button>
                        <button
                          onClick={() => handleDelete(article.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 p-4 text-sm text-gray-600">
              <span>
                Page {pagination.page} dari {pagination.pages} ({pagination.total} artikel)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchData(pagination.page - 1)}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => fetchData(pagination.page + 1)}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              Kategori Artikel
            </h2>
            <div className="mb-3 flex gap-2">
              <input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="Nama kategori"
              />
              <Button size="sm" onClick={handleCreateCategory}>
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {category.name}
                    </p>
                    <p className="text-xs text-gray-500">/{category.slug}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category)}
                      className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-sm text-gray-500">Belum ada kategori.</p>
              )}
            </div>
          </section>

          {importErrors.length > 0 && (
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h2 className="mb-3 text-sm font-semibold text-amber-900">
                Error Import CSV
              </h2>
              <div className="space-y-2">
                {importErrors.slice(0, 8).map((error) => (
                  <div key={`${error.row}-${error.message}`} className="text-xs text-amber-900">
                    Row {error.row}: {error.message}
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
