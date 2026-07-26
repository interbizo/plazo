"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { marketplaceApi } from "@/services/marketplace.service";
import { Spinner } from "@/components/ui/spinner";
import { Briefcase, ExternalLink, ArrowLeft, ImageIcon } from "lucide-react";
import { getStorefrontPath } from "@/lib/domain";

interface PortfolioFile {
  url: string;
  name?: string;
}

export default function PortfolioPage() {
  const params = useParams();
  const subdomain = params.subdomain as string;
  const [storeName, setStoreName] = useState("");
  const [portfolioFiles, setPortfolioFiles] = useState<string[]>([]);
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data } = await marketplaceApi.getStorefront(subdomain);
        const store = data?.store;
        if (store) {
          setStoreName(store.name || subdomain);
          // Portfolio data from seller profile
          const sellerProfile = store.owner?.sellerProfile;
          if (sellerProfile) {
            setPortfolioFiles(
              Array.isArray(sellerProfile.portfolioFiles) ? sellerProfile.portfolioFiles : []
            );
            setPortfolioUrl(sellerProfile.portfolio || "");
          }
        }
      } catch {
        // Store not found
      } finally {
        setIsLoading(false);
      }
    };

    if (subdomain) fetchData();
  }, [subdomain]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link
          href={getStorefrontPath(subdomain)}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke {storeName || "Toko"}
        </Link>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Briefcase className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Portfolio</h1>
        </div>
        <p className="text-sm text-gray-500">
          Karya dan proyek dari {storeName}
        </p>
      </div>

      {/* Portfolio Content */}
      {portfolioFiles.length === 0 && !portfolioUrl ? (
        <div className="rounded-xl border border-gray-200 bg-white p-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <Briefcase className="h-8 w-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Portfolio Belum Ditambahkan
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Seller belum menambahkan portfolio. Silakan kembali lagi nanti atau hubungi seller untuk informasi lebih lanjut.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Portfolio URL */}
          {portfolioUrl && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Link Portfolio</h3>
              <a
                href={portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {portfolioUrl}
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          {/* Portfolio Files/Images */}
          {portfolioFiles.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Karya ({portfolioFiles.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {portfolioFiles.map((file, index) => (
                  <a
                    key={index}
                    href={file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
                  >
                    <Image
                      src={file}
                      alt={`Portfolio ${index + 1}`}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
