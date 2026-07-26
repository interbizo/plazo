"use client";

import { useEffect, useState } from "react";
import { sellerApi } from "@/services/seller.service";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/shared/page-title";
import { resolveImageUrl } from "@/lib/image-url";
import {
  Lightbulb,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Crown,
  Lock,
} from "lucide-react";
import Link from "next/link";

// ============================================
// TYPES
// ============================================

interface RecommendedTool {
  id: string;
  title: string;
  description?: string;
  type: ToolType;
  fileUrl?: string;
  fileName?: string;
  redirectUrl?: string;
  thumbnail?: string;
  isActive: boolean;
  sortOrder: number;
}

type ToolType = "EBOOK_PDF" | "APPLICATION" | "WEBSITE" | "TOOLS_ONLINE";

const TOOL_TYPE_LABELS: Record<ToolType, string> = {
  EBOOK_PDF: "Ebook / PDF",
  APPLICATION: "Aplikasi",
  WEBSITE: "Website",
  TOOLS_ONLINE: "Tools Online",
};

const TOOL_TYPE_COLORS: Record<ToolType, string> = {
  EBOOK_PDF: "bg-red-100 text-red-700",
  APPLICATION: "bg-blue-100 text-blue-700",
  WEBSITE: "bg-green-100 text-green-700",
  TOOLS_ONLINE: "bg-purple-100 text-purple-700",
};

// ============================================
// PAGE
// ============================================

export default function SellerToolsPage() {
  const [tools, setTools] = useState<RecommendedTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const { data } = await sellerApi.getRecommendedTools();
        const list = Array.isArray(data) ? data : data.data || data.tools || [];
        setTools(list);
        setAccessDenied(false);
      } catch (err: any) {
        if (err?.response?.status === 403) {
          setAccessDenied(true);
        }
        setTools([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTools();
  }, []);

  // ---- Loading ----
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  // ---- Access Denied / Upgrade Prompt ----
  if (accessDenied) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
        <PageTitle title="Tools Rekomendasi" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 mb-6">
            <Lock className="h-10 w-10 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Fitur Premium
          </h2>
          <p className="text-gray-500 max-w-md mb-6">
            Tools rekomendasi hanya tersedia untuk seller dengan paket Premium.
            Upgrade sekarang untuk mengakses ebook, aplikasi, dan tools eksklusif
            yang akan membantu mengembangkan bisnis Anda.
          </p>
          <Link href="/seller/dashboard/subscription">
            <Button>
              <Crown className="h-4 w-4 mr-2" />
              Upgrade ke Premium
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ---- Main Content ----
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
      <PageTitle title="Tools Rekomendasi" />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Tools Rekomendasi
        </h1>
        <p className="text-gray-600">
          Kumpulan tools, ebook, dan aplikasi pilihan untuk membantu
          mengembangkan bisnis Anda
        </p>
      </div>

      {/* Tools Grid */}
      {tools.length === 0 ? (
        <EmptyState
          icon={<Lightbulb className="h-16 w-16 text-gray-300" />}
          title="Belum ada tools tersedia"
          description="Tools rekomendasi akan segera ditambahkan oleh admin"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow flex flex-col"
            >
              {/* Thumbnail */}
              <div className="h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
                {tool.thumbnail ? (
                  <img
                    src={resolveImageUrl(tool.thumbnail)}
                    alt={tool.title}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (
                        e.target as HTMLImageElement
                      ).parentElement!.classList.add(
                        "flex",
                        "items-center",
                        "justify-center",
                      );
                      const fallback = document.createElement("div");
                      fallback.innerHTML =
                        '<svg class="h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                      (e.target as HTMLImageElement).parentElement!.appendChild(
                        fallback,
                      );
                    }}
                  />
                ) : (
                  <ImageIcon className="h-12 w-12 text-gray-300" />
                )}
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col">
                {/* Type Badge */}
                <div className="mb-2">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      TOOL_TYPE_COLORS[tool.type] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {TOOL_TYPE_LABELS[tool.type] || tool.type}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  {tool.title}
                </h3>

                {/* Description */}
                {tool.description && (
                  <p className="text-sm text-gray-500 mb-4 line-clamp-3 flex-1">
                    {tool.description}
                  </p>
                )}
                {!tool.description && <div className="flex-1" />}

                {/* Action Button */}
                <div className="mt-auto pt-3">
                  {tool.type === "EBOOK_PDF" ? (
                    <a
                      href={tool.fileUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                        tool.fileUrl
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                      onClick={(e) => {
                        if (!tool.fileUrl) e.preventDefault();
                      }}
                    >
                      <Download className="h-4 w-4" />
                      Download {tool.fileName || "File"}
                    </a>
                  ) : (
                    <a
                      href={tool.redirectUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                        tool.redirectUrl
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                      onClick={(e) => {
                        if (!tool.redirectUrl) e.preventDefault();
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Buka Tools
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
