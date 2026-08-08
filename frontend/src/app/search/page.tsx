import type { Metadata } from "next";
import { PackageSearch } from "lucide-react";
import { serverApi } from "@/lib/server-api";
import type { Product, Service, Job, Article } from "@/types";
import type { ForumPost } from "@/types/forum";
import { SearchResults } from "./search-results";

export const metadata: Metadata = {
  title: "Pencarian - Plazo Marketplace",
  description: "Cari produk, jasa, artikel, forum, dan project di Plazo Marketplace.",
  robots: "noindex",
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

const LIMIT_PER_CATEGORY = 10;

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const q = (params.q || "").trim();

  if (!q) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <PackageSearch className="mx-auto h-12 w-12 text-gray-300" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">Cari sesuatu</h1>
        <p className="mt-2 text-sm text-gray-500">
          Gunakan kolom pencarian di bagian atas untuk mencari produk, jasa, artikel, forum, dan
          project.
        </p>
      </div>
    );
  }

  const [products, services, articles, jobs, forum] = await Promise.allSettled([
    serverApi.getProducts({ search: q, limit: LIMIT_PER_CATEGORY }),
    serverApi.getServices({ search: q, limit: LIMIT_PER_CATEGORY }),
    serverApi.getArticles({ search: q, limit: LIMIT_PER_CATEGORY }),
    serverApi.getJobs({ search: q, limit: LIMIT_PER_CATEGORY }),
    serverApi.getForumPosts({ search: q, limit: LIMIT_PER_CATEGORY }),
  ]);

  const productData: Product[] = products.status === "fulfilled" ? products.value?.data || [] : [];
  const serviceData: Service[] = services.status === "fulfilled" ? services.value?.data || [] : [];
  const articleData: Article[] = articles.status === "fulfilled" ? articles.value?.data || [] : [];
  const jobData: Job[] = jobs.status === "fulfilled" ? jobs.value?.data || [] : [];
  const forumData: ForumPost[] = forum.status === "fulfilled" ? forum.value?.data || [] : [];

  const totalResults =
    productData.length +
    serviceData.length +
    articleData.length +
    jobData.length +
    forumData.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hasil pencarian untuk &quot;{q}&quot;</h1>
        <p className="mt-1 text-sm text-gray-500">
          {totalResults > 0
            ? `Menemukan ${totalResults} hasil di semua kategori.`
            : "Tidak ada hasil yang ditemukan."}
        </p>
      </div>

      {totalResults === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <PackageSearch className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 font-semibold text-gray-900">Tidak ada hasil ditemukan</h3>
          <p className="mt-1 text-sm text-gray-500">
            Coba gunakan kata kunci lain atau periksa kembali penulisan Anda.
          </p>
        </div>
      ) : (
        <SearchResults
          q={q}
          products={productData}
          services={serviceData}
          jobs={jobData}
          articles={articleData}
          forum={forumData}
        />
      )}
    </div>
  );
}
