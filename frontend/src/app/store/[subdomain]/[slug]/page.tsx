"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, FileText, Store } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { SafeHtml } from "@/components/ui/safe-html";
import { StorefrontThemeProvider } from "@/components/storefront/theme-provider";
import { marketplaceApi } from "@/services/marketplace.service";
import { getStorefrontPath } from "@/lib/domain";
import type { Tenant } from "@/types";

interface StorePageData {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  updatedAt: string;
}

interface StorePageResponse {
  page: StorePageData;
  store: Tenant;
}

export default function StoreCmsPage() {
  const params = useParams();
  const subdomain = params.subdomain as string;
  const slug = params.slug as string;
  const [data, setData] = useState<StorePageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      setIsLoading(true);
      try {
        const response = await marketplaceApi.getStorePage(subdomain, slug);
        setData(response.data || null);
      } catch {
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (subdomain && slug) {
      fetchPage();
    }
  }, [subdomain, slug]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!data?.page || !data?.store) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <FileText className="mx-auto mb-4 h-14 w-14 text-gray-200" />
        <h1 className="text-xl font-bold text-gray-900">Halaman Tidak Ditemukan</h1>
        <p className="mt-2 text-sm text-gray-500">
          Halaman ini tidak tersedia di toko {subdomain}.
        </p>
      </div>
    );
  }

  const { page, store } = data;

  return (
    <StorefrontThemeProvider store={store}>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link
          href={getStorefrontPath(subdomain)}
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Toko
        </Link>

        <header className="mb-8 border-b border-gray-100 pb-6">
          <div className="mb-4 flex items-center gap-3">
            {store.logo ? (
              <Image
                src={store.logo}
                alt={store.name}
                width={40}
                height={40}
                className="h-10 w-10 object-cover"
                style={{ borderRadius: "var(--store-radius, 0.75rem)" }}
              />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center bg-gray-100"
                style={{ borderRadius: "var(--store-radius, 0.75rem)" }}
              >
                <Store className="h-5 w-5 text-gray-400" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">{store.name}</p>
              <p className="text-xs text-gray-500">@{store.subdomain}</p>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{page.title}</h1>
          {page.excerpt && (
            <p className="mt-3 text-sm leading-6 text-gray-500">{page.excerpt}</p>
          )}
        </header>

        <article className="text-gray-700">
          <SafeHtml html={page.content} />
        </article>
      </div>
    </StorefrontThemeProvider>
  );
}
