"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { SafeHtml } from "@/components/ui/safe-html";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface CmsPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function CmsPageView() {
  const params = useParams();
  const slug = params.slug as string;
  const [page, setPage] = useState<CmsPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        setIsLoading(true);
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const response = await fetch(`${baseUrl}/api/public/cms/pages/${slug}`);
        
        if (!response.ok) {
          throw new Error("Halaman tidak ditemukan");
        }
        
        const data = await response.json();
        setPage(data);
      } catch (err: any) {
        setError(err.message || "Gagal memuat halaman");
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchPage();
    }
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <p className="text-gray-600 mb-6">{error || "Halaman tidak ditemukan"}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Beranda
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{page.title}</h1>
          <p className="text-sm text-gray-500 mt-2">
            Terakhir diperbarui: {new Date(page.updatedAt).toLocaleDateString("id-ID", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
          <SafeHtml html={page.content} className="text-gray-700" />
        </div>
      </div>
    </div>
  );
}
