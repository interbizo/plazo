import type { Metadata } from "next";
import { serverApi } from "@/lib/server-api";
import { ProductsBrowseClient } from "./products-client";

// ============================================
// SEO METADATA (Server-side)
// ============================================

const CATALOG_DESCRIPTION =
  "Temukan berbagai produk terbaik di Plazo Marketplace. Belanja aman dengan sistem escrow dan garansi pembeli.";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    city?: string;
    province?: string;
    category?: string;
    categorySlug?: string;
    sort?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}

/**
 * Canonical mengarah ke URL kategori/katalog bersih, sedangkan kombinasi
 * filter/sort/pencarian (konten tipis & duplikat) diberi `noindex, follow`
 * agar crawler tetap dapat mengikuti tautan produk di dalamnya.
 */
export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const categorySlug = params.categorySlug || "";
  const categoryId = categorySlug ? "" : params.category || "";
  const hasCategory = Boolean(categorySlug || categoryId);
  const page = Number(params.page || "1");

  const isThinVariation = Boolean(
    params.search ||
      params.sort ||
      params.minPrice ||
      params.maxPrice ||
      params.city ||
      params.province,
  );

  let canonical = hasCategory
    ? `/products?categorySlug=${categorySlug || categoryId}`
    : "/products";
  if (!isThinVariation && page > 1) {
    canonical += `${canonical.includes("?") ? "&" : "?"}page=${page}`;
  }

  return {
    title: "Produk - Plazo Marketplace",
    description: CATALOG_DESCRIPTION,
    alternates: {
      canonical,
    },
    robots: isThinVariation
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      title: "Produk - Plazo Marketplace",
      description: CATALOG_DESCRIPTION,
      type: "website",
      url: canonical,
    },
  };
}

// ============================================
// SERVER COMPONENT — fetches initial data for SEO
// ============================================

export default async function BrowseProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page || "1");
  const search = params.search || "";
  const city = params.city || "";
  const province = params.province || "";
  const categorySlug = params.categorySlug || "";
  const categoryId = categorySlug ? "" : params.category || "";
  const sortBy = params.sort || "newest";
  const minPrice = params.minPrice || "";
  const maxPrice = params.maxPrice || "";

  // Fetch initial data on the server for SEO
  let initialProducts: any = { data: [], pagination: { total: 0, pages: 0 } };
  let initialCategories: any[] = [];

  try {
    const [productsRes, categoriesRes] = await Promise.all([
      serverApi.getProducts({
        page,
        limit: 20,
        sortBy,
        ...(search && { search }),
        ...(city && { city }),
        ...(province && { province }),
        ...(categoryId && { categoryId }),
        ...(categorySlug && { categorySlug }),
        ...(minPrice && { minPrice: Number(minPrice) }),
        ...(maxPrice && { maxPrice: Number(maxPrice) }),
      }),
      serverApi.getCategories("PRODUCT"),
    ]);

    initialProducts = productsRes;
    initialCategories = Array.isArray(categoriesRes)
      ? categoriesRes
      : categoriesRes?.categories || [];
  } catch (error) {
    // Fallback to empty — client will retry
    console.error("Failed to fetch initial products:", error);
  }

  return (
    <ProductsBrowseClient
      initialProducts={initialProducts.data || []}
      initialTotal={initialProducts.pagination?.total || 0}
      initialTotalPages={initialProducts.pagination?.pages || 0}
      initialCategories={initialCategories}
      initialPage={page}
      initialSearch={search}
      initialMinPrice={minPrice}
      initialMaxPrice={maxPrice}
    />
  );
}
