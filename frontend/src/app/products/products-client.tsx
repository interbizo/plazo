"use client";

import { useEffect, useState, useCallback, startTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  marketplaceApi,
  type SortBy,
  type BrowseParams,
} from "@/services/marketplace.service";
import { getErrorMessage } from "@/lib/api";
import type { Product, Category } from "@/types";
import { ProductCard } from "@/components/shared/product-card";
import { SearchBar } from "@/components/shared/search-bar";
import { Pagination } from "@/components/shared/pagination";
import { HomeButton } from "@/components/shared/home-button";
import {
  FilterSidebar,
  MobileFilterButton,
} from "@/components/shared/filter-sidebar";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductGridSkeleton } from "@/components/ui/skeleton";
import { PageTitle } from "@/components/shared/page-title";
import { ShoppingBag, X } from "lucide-react";
import toast from "react-hot-toast";

interface ProductsBrowseClientProps {
  initialProducts: Product[];
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

export function ProductsBrowseClient({
  initialProducts,
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
}: ProductsBrowseClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State — initialized from server-fetched data
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories] = useState<Category[]>(initialCategories);
  const [total, setTotal] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [isLoading, setIsLoading] = useState(false);
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  // Filters from URL
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

  // Local search state for input
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
      router.push(`/products?${sp.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  // Re-fetch when URL params change (not comparing with initial state)
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const params: BrowseParams = { page, limit: 20, sortBy };
        if (search) params.search = search;
        if (city) params.city = city;
        if (resolvedCategorySlug) params.categorySlug = resolvedCategorySlug;
        else if (categoryId) params.categoryId = categoryId;
        if (minPrice) params.minPrice = Number(minPrice);
        if (maxPrice) params.maxPrice = Number(maxPrice);

        const { data } = await marketplaceApi.getProducts(params);
        startTransition(() => {
          setProducts(data.data);
          setTotal(data.pagination.total);
          setTotalPages(data.pagination.pages);
        });
      } catch (err) {
        console.error("Failed to fetch products:", getErrorMessage(err));
        toast.error("Gagal memuat produk. Silakan coba lagi.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
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
      <PageTitle title="Produk" />
      
      {/* Home Button */}
      <div className="mb-4">
        <HomeButton variant="minimal" />
      </div>
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Produk</h1>
        <p className="mt-1 text-sm text-gray-500">
          {total > 0
            ? `${total.toLocaleString("id-ID")} produk ditemukan`
            : "Cari produk terbaik"}
        </p>
      </div>

      {/* Search + Mobile Filter */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <SearchBar
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Cari produk..."
            onSubmit={() => updateURL({ search: searchInput, page: "1" })}
          />
        </div>
        <div className="flex gap-2 sm:w-72">
          <input
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder="Filter kota"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500"
          />
          <button
            onClick={() => updateURL({ city: cityInput, page: "1" })}
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
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
        {/* Desktop Sidebar */}
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
              router.push(`/products?${sp.toString()}`, { scroll: false });
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
              router.push("/products");
            }}
          />
        </div>

        {/* Mobile Filter Overlay */}
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
                  router.push(`/products?${sp.toString()}`, { scroll: false });
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
                  router.push("/products");
                  setShowMobileFilter(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Product Grid */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <ProductGridSkeleton count={12} />
          ) : products.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag className="h-12 w-12 text-gray-300" />}
              title="Tidak ada produk ditemukan"
              description="Coba ubah kata kunci atau filter pencarian Anda."
            />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
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
