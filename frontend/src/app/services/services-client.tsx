"use client";

import { useEffect, useState, useCallback, startTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  marketplaceApi,
  type SortBy,
  type BrowseParams,
} from "@/services/marketplace.service";
import { getErrorMessage } from "@/lib/api";
import type { Service, Category } from "@/types";
import { ServiceCard } from "@/components/shared/service-card";
import { SearchBar } from "@/components/shared/search-bar";
import { Pagination } from "@/components/shared/pagination";
import { HomeButton } from "@/components/shared/home-button";
import {
  FilterSidebar,
  MobileFilterButton,
} from "@/components/shared/filter-sidebar";
import { EmptyState } from "@/components/ui/empty-state";
import { ServiceGridSkeleton } from "@/components/ui/skeleton";
import { Briefcase, X } from "lucide-react";
import { PageTitle } from "@/components/shared/page-title";
import toast from "react-hot-toast";

interface ServicesBrowseClientProps {
  initialServices: Service[];
  initialTotal: number;
  initialTotalPages: number;
  initialCategories: Category[];
  initialPage: number;
  initialSearch: string;
  initialCategoryId: string;
  initialCategorySlug: string;
  initialSortBy: string;
  initialMinPrice: string;
  initialMaxPrice: string;
  initialCity: string;
}

export function ServicesBrowseClient({
  initialServices,
  initialTotal,
  initialTotalPages,
  initialCategories,
  initialPage,
  initialSearch,
  initialCategoryId,
  initialCategorySlug,
  initialSortBy,
  initialMinPrice,
  initialMaxPrice,
  initialCity,
}: ServicesBrowseClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [services, setServices] = useState<Service[]>(initialServices);
  const [categories] = useState<Category[]>(initialCategories);
  const [total, setTotal] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [isLoading, setIsLoading] = useState(false);
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  const page = Number(searchParams.get("page") || String(initialPage));
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("category") || "";
  const categorySlug = searchParams.get("categorySlug") || "";
  const sortBy = (searchParams.get("sort") as SortBy) || "newest";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const city = searchParams.get("city") || "";

  // Convert categorySlug to categoryId for filter sidebar
  const selectedCategoryId =
    categoryId ||
    (categorySlug
      ? categories.find((c) => c.slug === categorySlug)?.id || ""
      : "");
  const resolvedCategorySlug =
    categorySlug ||
    (categoryId ? categories.find((c) => c.id === categoryId)?.slug || "" : "");

  const [searchInput, setSearchInput] = useState(search || initialSearch);
  const [localMinPrice, setLocalMinPrice] = useState(
    minPrice || initialMinPrice,
  );
  const [localMaxPrice, setLocalMaxPrice] = useState(
    maxPrice || initialMaxPrice,
  );
  const [cityInput, setCityInput] = useState(city || initialCity);

  const updateURL = useCallback(
    (params: Record<string, string>) => {
      const sp = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([k, v]) => {
        if (v) sp.set(k, v);
        else sp.delete(k);
      });
      if (params.page === undefined && !("page" in params)) sp.set("page", "1");
      router.push(`/services?${sp.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  // Re-fetch when URL params change (not comparing with initial state)
  useEffect(() => {
    const fetchServices = async () => {
      setIsLoading(true);
      try {
        const params: BrowseParams = { page, limit: 20, sortBy };
        if (search) params.search = search;
        if (city) params.city = city;
        if (resolvedCategorySlug) params.categorySlug = resolvedCategorySlug;
        else if (categoryId) params.categoryId = categoryId;
        if (minPrice) params.minPrice = Number(minPrice);
        if (maxPrice) params.maxPrice = Number(maxPrice);

        const { data } = await marketplaceApi.getServices(params);
        startTransition(() => {
          setServices(data.data);
          setTotal(data.pagination.total);
          setTotalPages(data.pagination.pages);
        });
      } catch (err) {
        console.error("Failed to fetch services:", getErrorMessage(err));
        toast.error("Gagal memuat jasa. Silakan coba lagi.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchServices();
  }, [
    page,
    search,
    categoryId,
    categorySlug,
    sortBy,
    minPrice,
    maxPrice,
    city,
    resolvedCategorySlug,
  ]);

  const activeFilterCount =
    (selectedCategoryId ? 1 : 0) +
    (minPrice || maxPrice ? 1 : 0) +
    (city ? 1 : 0) +
    (sortBy !== "newest" ? 1 : 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <PageTitle title="Jasa & Layanan" />
      
      {/* Home Button */}
      <div className="mb-4">
        <HomeButton variant="minimal" />
      </div>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Jasa & Layanan</h1>
        <p className="mt-1 text-sm text-gray-500">
          {total > 0
            ? `${total.toLocaleString("id-ID")} jasa ditemukan`
            : "Temukan jasa profesional"}
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <SearchBar
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Cari jasa atau layanan..."
            onSubmit={() => updateURL({ search: searchInput, page: "1" })}
          />
        </div>
        <div className="flex gap-2 sm:w-72">
          <input
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder="Filter kota"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-purple-500"
          />
          <button
            onClick={() => updateURL({ city: cityInput, page: "1" })}
            className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
          >
            Terapkan
          </button>
        </div>
        <MobileFilterButton
          count={activeFilterCount}
          onClick={() => setShowMobileFilter(true)}
        />
      </div>

      <div className="flex gap-8">
        <div className="hidden lg:block w-56 shrink-0">
          <FilterSidebar
            categories={categories}
            selectedCategory={selectedCategoryId}
            onCategoryChange={(id) => {
              const selected = categories.find((cat) => cat.id === id);
              const slug = selected?.slug || "";
              const sp = new URLSearchParams(searchParams.toString());
              sp.delete("category");
              if (slug) sp.set("categorySlug", slug);
              else sp.delete("categorySlug");
              sp.set("page", "1");
              router.push(`/services?${sp.toString()}`, { scroll: false });
            }}
            sortBy={sortBy}
            onSortChange={(s) => updateURL({ sort: s, page: "1" })}
            minPrice={localMinPrice}
            maxPrice={localMaxPrice}
            onMinPriceChange={setLocalMinPrice}
            onMaxPriceChange={setLocalMaxPrice}
            onApplyPrice={() =>
              updateURL({
                minPrice: localMinPrice,
                maxPrice: localMaxPrice,
                page: "1",
              })
            }
            onReset={() => {
              setSearchInput("");
              setLocalMinPrice("");
              setLocalMaxPrice("");
              setCityInput("");
              router.push("/services");
            }}
            priceLabel="Range Harga"
          />
        </div>

        {showMobileFilter && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setShowMobileFilter(false)}
            />
            <div className="absolute right-0 top-0 h-full w-80 max-w-full overflow-y-auto bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Filter</h2>
                <button onClick={() => setShowMobileFilter(false)}>
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <FilterSidebar
                categories={categories}
                selectedCategory={selectedCategoryId}
                onCategoryChange={(id) => {
                  const selected = categories.find((cat) => cat.id === id);
                  const slug = selected?.slug || "";
                  const sp = new URLSearchParams(searchParams.toString());
                  sp.delete("category");
                  if (slug) sp.set("categorySlug", slug);
                  else sp.delete("categorySlug");
                  sp.set("page", "1");
                  router.push(`/services?${sp.toString()}`, { scroll: false });
                  setShowMobileFilter(false);
                }}
                sortBy={sortBy}
                onSortChange={(s) => {
                  updateURL({ sort: s, page: "1" });
                  setShowMobileFilter(false);
                }}
                minPrice={localMinPrice}
                maxPrice={localMaxPrice}
                onMinPriceChange={setLocalMinPrice}
                onMaxPriceChange={setLocalMaxPrice}
                onApplyPrice={() => {
                  updateURL({
                    minPrice: localMinPrice,
                    maxPrice: localMaxPrice,
                    page: "1",
                  });
                  setShowMobileFilter(false);
                }}
                onReset={() => {
                  setSearchInput("");
                  setLocalMinPrice("");
                  setLocalMaxPrice("");
                  setCityInput("");
                  router.push("/services");
                  setShowMobileFilter(false);
                }}
                priceLabel="Range Harga"
              />
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0">
          {isLoading ? (
            <ServiceGridSkeleton count={9} />
          ) : services.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="h-12 w-12 text-gray-300" />}
              title="Tidak ada jasa ditemukan"
              description="Coba ubah kata kunci atau filter pencarian Anda."
            />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {services.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
              <div className="mt-8">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={(p) => updateURL({ page: String(p) })}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
