"use client";

import { useCallback, useEffect, useState } from "react";
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
} from "lucide-react";
import toast from "react-hot-toast";
import { articleAdminApi } from "@/services/article.service";
import { getErrorMessage } from "@/lib/api";
import { resolveImageUrl } from "@/lib/image-url";
import type { Article, ArticleCategory } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog, Modal } from "@/components/ui/modal";

type ImportError = {
  row: number;
  title?: string;
  message: string;
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
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isDeletingArticle, setIsDeletingArticle] = useState(false);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryFormName, setCategoryFormName] = useState("");
  const [editingCategory, setEditingCategory] = useState<ArticleCategory | null>(null);
  const [articleDeleteTarget, setArticleDeleteTarget] = useState<Article | null>(null);
  const [categoryDeleteTarget, setCategoryDeleteTarget] =
    useState<ArticleCategory | null>(null);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const fetchData = useCallback(
    async (page = 1) => {
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
    },
    [searchInput, statusFilter],
  );

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  const refreshCategories = async () => {
    const { data } = await articleAdminApi.getCategories();
    setCategories(data || []);
  };

  const closeCategoryModal = () => {
    setCategoryModalOpen(false);
    setEditingCategory(null);
    setCategoryFormName("");
  };

  const openCreateCategoryModal = () => {
    setEditingCategory(null);
    setCategoryFormName("");
    setCategoryModalOpen(true);
  };

  const openEditCategoryModal = (category: ArticleCategory) => {
    setEditingCategory(category);
    setCategoryFormName(category.name);
    setCategoryModalOpen(true);
  };

  const handleDeleteArticle = async () => {
    if (!articleDeleteTarget) return;
    setIsDeletingArticle(true);
    try {
      await articleAdminApi.deleteArticle(articleDeleteTarget.id);
      toast.success("Artikel dihapus");
      setArticleDeleteTarget(null);
      fetchData(pagination.page);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsDeletingArticle(false);
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
      fetchData(pagination.page);
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

  const handleSaveCategory = async () => {
    const name = categoryFormName.trim();
    if (!name) {
      toast.error("Nama kategori wajib diisi");
      return;
    }

    setIsSavingCategory(true);
    try {
      if (editingCategory) {
        await articleAdminApi.updateCategory(editingCategory.id, {
          name,
          slug: slugify(name),
        });
        toast.success("Kategori diperbarui");
      } else {
        await articleAdminApi.createCategory({ name });
        toast.success("Kategori dibuat");
      }

      closeCategoryModal();
      await refreshCategories();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryDeleteTarget) return;
    setIsDeletingCategory(true);
    try {
      await articleAdminApi.deleteCategory(categoryDeleteTarget.id);
      await refreshCategories();
      fetchData(pagination.page);
      setCategoryDeleteTarget(null);
      toast.success("Kategori dihapus");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsDeletingCategory(false);
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
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
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
          <Link
            href="/admin/articles/create"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Tambah Artikel
          </Link>
        </div>
      </div>

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
                        <Link
                          href={`/admin/articles/${article.id}/edit`}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(article)}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        >
                          {article.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setArticleDeleteTarget(article)}
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
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Kategori Artikel
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Kelola kategori untuk halaman artikel.
                </p>
              </div>
              <Button size="sm" onClick={openCreateCategoryModal}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Tambah
              </Button>
            </div>
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-3 transition-colors hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {category.name}
                    </p>
                    <p className="truncate text-xs text-gray-500">/{category.slug}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => openEditCategoryModal(category)}
                      className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
                      aria-label={`Edit kategori ${category.name}`}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryDeleteTarget(category)}
                      className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                      aria-label={`Hapus kategori ${category.name}`}
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
                  <div
                    key={`${error.row}-${error.message}`}
                    className="text-xs text-amber-900"
                  >
                    Row {error.row}: {error.message}
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      <Modal
        isOpen={categoryModalOpen}
        onClose={() => {
          if (!isSavingCategory) closeCategoryModal();
        }}
        title={editingCategory ? "Edit Kategori Artikel" : "Tambah Kategori Artikel"}
        description="Kategori digunakan untuk mengelompokkan artikel di halaman publik."
        size="sm"
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSaveCategory();
          }}
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Nama kategori
            </span>
            <input
              value={categoryFormName}
              onChange={(event) => setCategoryFormName(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: Panduan Seller"
              autoFocus
            />
          </label>

          {categoryFormName.trim() && (
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
              Slug: /{slugify(categoryFormName)}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeCategoryModal}
              disabled={isSavingCategory}
            >
              Batal
            </Button>
            <Button
              type="submit"
              isLoading={isSavingCategory}
              disabled={!categoryFormName.trim()}
            >
              {editingCategory ? "Simpan Perubahan" : "Tambah Kategori"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(articleDeleteTarget)}
        onClose={() => {
          if (!isDeletingArticle) setArticleDeleteTarget(null);
        }}
        onConfirm={handleDeleteArticle}
        title="Hapus Artikel"
        message={`Hapus artikel "${articleDeleteTarget?.title || ""}"? Tindakan ini tidak bisa dibatalkan.`}
        confirmText="Hapus"
        cancelText="Batal"
        variant="danger"
        isLoading={isDeletingArticle}
      />

      <ConfirmDialog
        isOpen={Boolean(categoryDeleteTarget)}
        onClose={() => {
          if (!isDeletingCategory) setCategoryDeleteTarget(null);
        }}
        onConfirm={handleDeleteCategory}
        title="Hapus Kategori"
        message={`Hapus kategori "${categoryDeleteTarget?.name || ""}"? Artikel terkait akan menjadi tanpa kategori.`}
        confirmText="Hapus"
        cancelText="Batal"
        variant="danger"
        isLoading={isDeletingCategory}
      />
    </div>
  );
}
