import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { serverApi } from "@/lib/server-api";
import { resolveImageUrl } from "@/lib/image-url";
import { ArticleViewTracker } from "@/components/articles/article-view-tracker";
import { SafeHtml } from "@/components/ui/safe-html";
import type { Article } from "@/types";

interface ArticleDetailPageProps {
  params: Promise<{ slug: string }>;
}

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

async function getArticle(slug: string) {
  try {
    return await serverApi.getArticleBySlug(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: ArticleDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const payload = await getArticle(slug);
  const article: Article | undefined = payload?.article;

  if (!article) {
    return {
      title: "Artikel Tidak Ditemukan - Plazo",
    };
  }

  const title = article.metaTitle || article.title;
  const description =
    article.metaDescription ||
    article.excerpt ||
    "Baca artikel lengkap di Plazo.";
  const keywords = article.metaKeywords || article.tags?.join(", ");
  const image = article.ogImage || article.thumbnail;
  const url = `/articles/${article.slug}`;

  return {
    title,
    description,
    keywords: keywords || undefined,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      publishedTime: article.publishedAt || article.createdAt,
      modifiedTime: article.updatedAt,
      images: image ? [{ url: resolveImageUrl(image), alt: article.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [resolveImageUrl(image)] : [],
    },
  };
}

export default async function ArticleDetailPage({ params }: ArticleDetailPageProps) {
  const { slug } = await params;

  try {
    const flags = await serverApi.getPublicFlags();
    if (flags["module.article"] === "false") {
      notFound();
    }
  } catch {
    // Fail-open: if flags endpoint is unreachable, continue rendering.
  }

  const payload = await getArticle(slug);

  if (!payload?.article) {
    notFound();
  }

  const article: Article = payload.article;
  const related: Article[] = payload.related || [];
  const thumbnail = article.thumbnail ? resolveImageUrl(article.thumbnail) : "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.metaDescription || article.excerpt,
    image: thumbnail ? [thumbnail] : undefined,
    datePublished: article.publishedAt || article.createdAt,
    dateModified: article.updatedAt,
    author: {
      "@type": "Organization",
      name: "Plazo",
    },
    publisher: {
      "@type": "Organization",
      name: "Plazo Marketplace",
    },
    mainEntityOfPage: `/articles/${article.slug}`,
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article>
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
            <Link
              href="/articles"
              className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Artikel
            </Link>

            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              {article.category && (
                <Link
                  href={`/articles?category=${article.category.slug}`}
                  className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                >
                  {article.category.name}
                </Link>
              )}
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                {formatDate(article.publishedAt || article.createdAt)}
              </span>
              <ArticleViewTracker
                articleId={article.id}
                initialViewCount={article.viewCount}
              />
            </div>

            <h1 className="text-3xl font-bold leading-tight text-gray-900 sm:text-4xl">
              {article.title}
            </h1>
            {article.excerpt && (
              <p className="mt-4 text-base leading-7 text-gray-600">
                {article.excerpt}
              </p>
            )}
          </div>
        </header>

        {thumbnail && (
          <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 lg:px-8">
            <Image
              src={thumbnail}
              alt={article.title}
              width={1200}
              height={675}
              className="aspect-[16/9] w-full rounded-lg object-cover"
            />
          </div>
        )}

        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {article.youtubeUrl && (
            <div className="mb-8 overflow-hidden rounded-lg bg-black">
              <iframe
                src={article.youtubeUrl}
                title={article.title}
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-white p-5 sm:p-8">
            <SafeHtml html={article.content || ""} className="text-gray-700" />
          </div>

          {article.tags?.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/articles?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </div>
      </article>

      {related.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 pb-12 sm:px-6 lg:px-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Artikel Terkait
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((item) => (
              <Link
                key={item.id}
                href={`/articles/${item.slug}`}
                className="rounded-lg border border-gray-200 bg-white p-3 hover:border-blue-200 hover:shadow-sm"
              >
                {item.thumbnail && (
                  <Image
                    src={resolveImageUrl(item.thumbnail)}
                    alt={item.title}
                    width={360}
                    height={203}
                    className="mb-3 aspect-[16/9] w-full rounded-md object-cover"
                  />
                )}
                <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">
                  {item.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-600">
                  {item.excerpt || "Baca artikel lengkap di Plazo."}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  {formatDate(item.publishedAt || item.createdAt)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
