import type { Metadata } from "next";
import { serverApi } from "@/lib/server-api";
import { ServicesBrowseClient } from "./services-client";

export const metadata: Metadata = {
  title: "Jasa & Layanan - Plazo Marketplace",
  description:
    "Temukan jasa dan layanan profesional di Plazo Marketplace. Desain, pengembangan, penulisan, dan banyak lagi.",
  openGraph: {
    title: "Jasa & Layanan - Plazo Marketplace",
    description: "Temukan jasa dan layanan profesional di Plazo Marketplace.",
    type: "website",
  },
};

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

export default async function BrowseServicesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page || "1");
  const search = params.search || "";
  const city = params.city || "";
  const categorySlug = params.categorySlug || "";
  const categoryId = categorySlug ? "" : params.category || "";
  const sortBy = params.sort || "newest";
  const minPrice = params.minPrice || "";
  const maxPrice = params.maxPrice || "";

  let initialServices: any = { data: [], pagination: { total: 0, pages: 0 } };
  let initialCategories: any[] = [];

  try {
    const [servicesRes, categoriesRes] = await Promise.all([
      serverApi.getServices({
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
      serverApi.getCategories("SERVICE"),
    ]);

    initialServices = servicesRes;
    initialCategories = Array.isArray(categoriesRes)
      ? categoriesRes
      : categoriesRes?.categories || [];
  } catch (error) {
    console.error("Failed to fetch initial services:", error);
  }

  return (
    <ServicesBrowseClient
      initialServices={initialServices.data || []}
      initialTotal={initialServices.pagination?.total || 0}
      initialTotalPages={initialServices.pagination?.pages || 0}
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
