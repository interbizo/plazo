import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, CalendarDays, Search } from "lucide-react";
import { serverApi } from "@/lib/server-api";
import { resolveImageUrl } from "@/lib/image-url";
import type { Article, ArticleCategory } from "@/types";

export const metadata: Metadata = {
  title: "Artikel - Plazo Marketplace",
  description:
    "Baca artikel terbaru seputar marketplace, UMKM digital, produk, jasa, dan pertumbuhan bisnis online di Plazo.",
  alternates: {
    canonical: "/articles",
  },
  openGraph: {
    title: "Artikel - Plazo Marketplace",
    description:
      "Artikel terbaru seputar marketplace, UMKM digital, produk, jasa, dan pertumbuhan bisnis online.",
    type: "website",
    url: "/articles",
  },
};

interface ArticlesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    category?: string;
    tag?: string;
  }>;
}

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildHref(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
  if (value !== undefined && value !== "") sp.set(key, String(value));
  });
  const qs = sp.toString();
  return `/articles${qs ? `?${qs}` : ""}`;
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const params = await searchParams;
  const page = Number(params.page || "1");
  const search = params.search || "";
  const categorySlug = params.category || "";
  const tag = params.tag || "";

  let articlesPayload: any = { data: [], pagination: { total: 0, pages: 0 } };
  let categories: ArticleCategory[] = [];

  try {
    const [articlesRes, categoriesRes] = await Promise.all([
      serverApi.getArticles({
        page,
        limit: 12,
        ...(search && { search }),
        ...(categorySlug && { categorySlug }),
        ...(tag && { tag }),
      }),
      serverApi.getArticleCategories(),
    ]);
    articlesPayload = articlesRes;
    categories = categoriesRes || [];
  } catch (error) {
    console.error("Failed to fetch articles:", error);
  }

  const articles: Article[] = articlesPayload.data || [];
  const pagination = articlesPayload.pagination || { page, pages: 1, total: 0 };
  const selectedCategory = categories.find((category) => category.slug === categorySlug);

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Artikel Plazo
            </p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              Artikel dan Insight Bisnis
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Panduan praktis untuk seller, buyer, UMKM, dan pengguna Plazo.
            </p>
          </div>

          <form action="/articles" className="mt-6 flex max-w-2xl gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                name="search"
                defaultValue={search}
                placeholder="Cari artikel..."
                className="min-w-0 flex-1 text-sm outline-none"
              />
            </div>
            {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
            {tag && <input type="hidden" name="tag" value={tag} />}
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Cari
            </button>
          </form>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:px-8">
        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedCategory ? selectedCategory.name : "Artikel Terbaru"}
              </h2>
              <p className="text-sm text-gray-500">
                {pagination.total?.toLocaleString("id-ID") || 0} artikel ditemukan
              </p>
            </div>
            {(search || categorySlug || tag) && (
              <Link
                href="/articles"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Reset Filter
              </Link>
            )}
          </div>

          {articles.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white py-16 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-base font-semibold text-gray-900">
                Artikel belum ditemukan
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Coba ubah kata kunci atau kategori pencarian.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.slug}`}
                  className="group overflow-hidden rounded-lg border border-gray-200 bg-white transition hover:border-blue-200 hover:shadow-sm"
                >
                  <div className="aspect-[16/9] bg-gray-100">
                    {article.thumbnail ? (
                      <Image
                        src={resolveImageUrl(article.thumbnail)}
                        alt={article.title}
                        width={640}
                        height={360}
                        className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-300">
                        <BookOpen className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      {article.category && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
                          {article.category.name}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(article.publishedAt || article.createdAt)}
                      </span>
                      <span>{article.readingTimeMinutes} menit baca</span>
                    </div>
                    <h3 className="line-clamp-2 text-base font-semibold text-gray-900 group-hover:text-blue-700">
                      {article.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">
                      {article.excerpt || "Baca artikel lengkap di Plazo."}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <Link
                href={buildHref({
                  page: Math.max(1, page - 1),
                  search,
                  category: categorySlug,
                  tag,
                })}
                className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                  page <= 1
                    ? "pointer-events-none border-gray-200 text-gray-300"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Sebelumnya
              </Link>
              <span className="text-sm text-gray-500">
                Page {pagination.page} dari {pagination.pages}
              </span>
              <Link
                href={buildHref({
                  page: Math.min(pagination.pages, page + 1),
                  search,
                  category: categorySlug,
                  tag,
                })}
                className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                  page >= pagination.pages
                    ? "pointer-events-none border-gray-200 text-gray-300"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Berikutnya
              </Link>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Kategori</h2>
            <div className="space-y-1">
              <Link
                href={buildHref({ search, tag })}
                className={`block rounded-lg px-3 py-2 text-sm ${
                  !categorySlug
                    ? "bg-blue-50 font-medium text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Semua Artikel
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={buildHref({ search, category: category.slug, tag })}
                  className={`block rounded-lg px-3 py-2 text-sm ${
                    categorySlug === category.slug
                      ? "bg-blue-50 font-medium text-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
