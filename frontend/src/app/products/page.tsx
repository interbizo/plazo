import type { Metadata } from "next";
import { serverApi } from "@/lib/server-api";
import { ProductsBrowseClient } from "./products-client";

// ============================================
// SEO METADATA (Server-side)
// ============================================

export const metadata: Metadata = {
  title: "Produk - Plazo Marketplace",
  description:
    "Temukan berbagai produk terbaik di Plazo Marketplace. Belanja aman dengan sistem escrow dan garansi pembeli.",
  openGraph: {
    title: "Produk - Plazo Marketplace",
    description:
      "Temukan berbagai produk terbaik di Plazo Marketplace. Belanja aman dengan sistem escrow dan garansi pembeli.",
    type: "website",
  },
};

// ============================================
// SERVER COMPONENT — fetches initial data for SEO
// ============================================

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    city?: string;
    category?: string;
    categorySlug?: string;
    sort?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}

export default async function BrowseProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page || "1");
  const search = params.search || "";
  const city = params.city || "";
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
      initialCategoryId={categoryId}
      initialCategorySlug={categorySlug}
      initialSortBy={sortBy}
      initialMinPrice={minPrice}
      initialMaxPrice={maxPrice}
      initialCity={city}
    />
  );
}
