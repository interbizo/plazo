"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Image as ImageIcon, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { articleAdminApi } from "@/services/article.service";
import { uploadApi } from "@/services/upload.service";
import { getErrorMessage } from "@/lib/api";
import { resolveImageUrl } from "@/lib/image-url";
import type { Article, ArticleCategory, ArticleStatus } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CKEditor4 } from "@/components/ui/ckeditor4";
import { countWords } from "@/components/ui/word-counter";

const MIN_WORDS = 800;
const MAX_WORDS = 1600;

type ArticleFormState = {
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
};

type ArticleFormProps = {
  mode: "create" | "edit";
  articleId?: string;
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
};

function normalizeSlugInput(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-");
}

function slugify(value: string) {
  return normalizeSlugInput(value).replace(/^-+|-+$/g, "");
}

function toForm(article: Article): ArticleFormState {
  return {
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
  };
}

export function ArticleForm({ mode, articleId }: ArticleFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const draftKey = "plazo_draft_admin-article-create";
  const draftRestored = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [form, setForm] = useState<ArticleFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const wordCount = useMemo(() => countWords(form.content), [form.content]);
  const canPublish = wordCount >= MIN_WORDS && wordCount <= MAX_WORDS;
  const isOverLimit = wordCount > MAX_WORDS;

  useEffect(() => {
    if (isEdit || draftRestored.current) return;
    draftRestored.current = true;

    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<ArticleFormState>;
        if (
          Object.values(parsed).some(
            (value) => value !== "" && value !== null && value !== undefined,
          )
        ) {
          setForm((current) => ({ ...current, ...parsed }));
        }
      }
    } catch {
      localStorage.removeItem(draftKey);
    }
  }, [isEdit]);

  useEffect(() => {
    if (isEdit || !draftRestored.current) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      try {
        const hasData = Object.values(form).some(
          (value) =>
            value !== "" &&
            value !== null &&
            value !== undefined &&
            value !== "DRAFT",
        );

        if (hasData) {
          localStorage.setItem(draftKey, JSON.stringify(form));
        }
      } catch {}
    }, 2000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [form, isEdit]);

  useEffect(() => {
    const load = async () => {
      try {
        const categoriesRequest = articleAdminApi.getCategories();
        const articleRequest =
          isEdit && articleId
            ? articleAdminApi.getArticle(articleId)
            : Promise.resolve(null);

        const [categoriesRes, articleRes] = await Promise.all([
          categoriesRequest,
          articleRequest,
        ]);

        setCategories(categoriesRes.data || []);

        if (isEdit) {
          const article = articleRes?.data?.article;
          if (!article?.id) {
            toast.error("Artikel tidak ditemukan");
            router.push("/admin/articles");
            return;
          }

          setForm(toForm(article));
        }
      } catch (error) {
        toast.error(getErrorMessage(error));
        if (isEdit) {
          router.push("/admin/articles");
        }
      } finally {
        setIsLoading(false);
      }
    };

    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [articleId, isEdit, router]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {}
  };

  const handleTitleChange = (title: string) => {
    setForm((current) => {
      const shouldSyncSlug =
        !isEdit &&
        (!current.slug || current.slug === slugify(current.title));

      return {
        ...current,
        title,
        slug: shouldSyncSlug ? slugify(title) : current.slug,
      };
    });
  };

  const handleUploadThumbnail = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { data } = await uploadApi.uploadFile(file, "ARTICLE_THUMBNAIL");
      setForm((current) => ({
        ...current,
        thumbnail: data.file.url,
      }));
      toast.success("Thumbnail berhasil diupload");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.title.trim()) {
      toast.error("Judul artikel wajib diisi");
      return;
    }

    if (wordCount === 0) {
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

    setIsSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: slugify(form.slug) || undefined,
        excerpt: form.excerpt.trim() || null,
        content: form.content,
        thumbnail: form.thumbnail.trim() || null,
        youtubeUrl: form.youtubeUrl.trim() || null,
        categoryId: form.categoryId || null,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        status: form.status,
        metaTitle: form.metaTitle.trim() || null,
        metaDescription: form.metaDescription.trim() || null,
        metaKeywords: form.metaKeywords.trim() || null,
        ogImage: null,
      };

      if (isEdit && articleId) {
        await articleAdminApi.updateArticle(articleId, payload);
        toast.success("Artikel diperbarui");
      } else {
        await articleAdminApi.createArticle(payload);
        toast.success("Artikel dibuat");
      }

      clearDraft();
      router.push("/admin/articles");
    } catch (error) {
      toast.error(getErrorMessage(error));
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
      <div className="mb-6">
        <Link
          href="/admin/articles"
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Artikel
        </Link>
        <h1 className="text-xl font-bold text-gray-900">
          {isEdit ? "Edit Artikel" : "Tambah Artikel"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Draft bisa disimpan kapan saja. Publish wajib {MIN_WORDS}-{MAX_WORDS} kata.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-6xl space-y-5">
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-gray-900">Informasi Artikel</h2>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Judul"
                  value={form.title}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  placeholder="Judul artikel"
                  maxLength={180}
                  required
                />
                <Input
                  label="Slug URL"
                  value={form.slug}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      slug: normalizeSlugInput(event.target.value),
                    }))
                  }
                  placeholder="otomatis-dari-judul"
                  maxLength={220}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Ringkasan
                </label>
                <textarea
                  value={form.excerpt}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, excerpt: event.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  placeholder="Ringkasan singkat untuk listing dan meta fallback"
                />
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-gray-900">Konten Artikel</h2>
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
                key={articleId || "new-article"}
                value={form.content}
                onChange={(value) =>
                  setForm((current) => ({ ...current, content: value }))
                }
                placeholder="Tulis artikel 800 sampai 1600 kata..."
                minHeight="400px"
                preset="article"
              />
              <p className="text-xs text-gray-500">
                Gunakan input YouTube di panel kanan untuk embed video yang konsisten.
              </p>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-gray-900">Publikasi</h2>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as ArticleStatus,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Kategori
                </label>
                <select
                  value={form.categoryId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      categoryId: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tanpa kategori</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Tags"
                value={form.tags}
                onChange={(event) =>
                  setForm((current) => ({ ...current, tags: event.target.value }))
                }
                placeholder="seo, marketplace, umkm"
                helperText="Pisahkan tag dengan koma."
              />
            </div>

            <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-gray-900">Media</h2>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Thumbnail Artikel
                </label>
                {form.thumbnail ? (
                  <Image
                    src={resolveImageUrl(form.thumbnail)}
                    alt="Thumbnail artikel"
                    width={640}
                    height={360}
                    className="h-36 w-full rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-400">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                    <Upload className="h-4 w-4" />
                    {isUploading ? "Uploading..." : "Upload Thumbnail"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      disabled={isUploading}
                      onChange={handleUploadThumbnail}
                    />
                  </label>
                  {form.thumbnail && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() =>
                        setForm((current) => ({ ...current, thumbnail: "" }))
                      }
                    >
                      Hapus Thumbnail
                    </Button>
                  )}
                </div>
              </div>

              <Input
                label="URL YouTube"
                value={form.youtubeUrl}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    youtubeUrl: event.target.value,
                  }))
                }
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>

            <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-gray-900">SEO</h2>
              <Input
                label="Meta Title"
                value={form.metaTitle}
                maxLength={70}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    metaTitle: event.target.value,
                  }))
                }
                placeholder="Otomatis dari judul"
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Meta Description
                </label>
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
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  placeholder="Otomatis dari ringkasan"
                />
              </div>
              <Input
                label="Meta Keywords"
                value={form.metaKeywords}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    metaKeywords: event.target.value,
                  }))
                }
                placeholder="Otomatis dari tags"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" isLoading={isSubmitting} size="lg">
                {isEdit ? "Simpan Perubahan" : "Buat Artikel"}
              </Button>
              <button
                type="button"
                onClick={() => {
                  clearDraft();
                  router.push("/admin/articles");
                }}
                className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                Batal
              </button>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}
