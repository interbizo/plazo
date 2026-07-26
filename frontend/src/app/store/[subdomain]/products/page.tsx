"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { marketplaceApi } from "@/services/marketplace.service";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/utils";
import { Pagination } from "@/components/shared/pagination";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft } from "lucide-react";
import { StorefrontThemeProvider } from "@/components/storefront/theme-provider";
import { useStorefront } from "@/hooks/use-storefront";
import { getStorefrontPath } from "@/lib/domain";

function ProductsContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const subdomain = params.subdomain as string;
  const page = Number(searchParams.get("page") || "1");
  const [products, setProducts] = useState<Product[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { storeData } = useStorefront(subdomain);

  useEffect(() => {
    const fetchProducts = () => {
      setIsLoading(true);
      marketplaceApi
        .getStoreProducts(subdomain, { page, limit: 12 })
        .then(({ data }) => {
          setProducts(data.data || []);
          setTotalPages(data.pagination?.pages || 0);
        })
        .catch(() => setProducts([]))
        .finally(() => setIsLoading(false));
    };
    fetchProducts();
  }, [page, subdomain]);

  const store = storeData?.store;

  return (
    <StorefrontThemeProvider store={store || null}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Link
          href={getStorefrontPath(subdomain)}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Toko
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mb-6">
          Produk — {subdomain}
        </h1>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : products.length === 0 ? (
          <p className="text-sm text-gray-400">Belum ada produk</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p: Product) => (
                <Link
                  key={p.id}
                  href={getStorefrontPath(subdomain, `/products/${p.slug || p.id}`)}
                  className="p-4 hover:shadow-md transition-shadow"
                  style={{ 
                    borderRadius: 'var(--store-radius, 0.75rem)',
                    border: '1px solid rgb(229 231 235)',
                    backgroundColor: 'white'
                  }}
                >
                  {p.images?.[0] && (
                    <div className="relative w-full h-32 mb-3">
                      <Image
                        src={p.images[0]}
                        alt={p.name}
                        fill
                        className="object-cover"
                        style={{ borderRadius: 'calc(var(--store-radius, 0.75rem) * 0.75)' }}
                      />
                    </div>
                  )}
                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {p.name}
                  </h3>
                  <p className="text-sm font-bold mt-1" style={{ color: store?.themeColor || 'rgb(37 99 235)' }}>
                    {formatPrice(p.price)}
                  </p>
                </Link>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={(p) =>
                    router.push(`${getStorefrontPath(subdomain, "/products")}?page=${p}`, {
                      scroll: false,
                    })
                  }
                />
              </div>
            )}
          </>
        )}
      </div>
    </StorefrontThemeProvider>
  );
}

export default function StoreProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
