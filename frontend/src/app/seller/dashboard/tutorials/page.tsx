"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Search,
  Filter,
  Eye,
  Star,
  ChevronRight,
  Video,
  ArrowLeft,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { YouTubeEmbed } from "@/components/tutorial/youtube-embed";
import { MarkdownRenderer } from "@/components/tutorial/markdown-renderer";
import { tutorialApi } from "@/services/tutorial.service";
import { resolveImageUrl } from "@/lib/image-url";
import toast from "react-hot-toast";

interface Tutorial {
  id: string;
  title: string;
  slug: string;
  description?: string;
  content: string;
  category: string;
  targetRole: string;
  thumbnail?: string;
  videoUrl?: string;
  isFeatured: boolean;
  viewCount: number;
  createdAt: string;
}

const CATEGORIES = [
  { value: "", label: "Semua Kategori" },
  { value: "GETTING_STARTED", label: "Memulai" },
  { value: "SELLER_GUIDE", label: "Panduan Seller" },
  { value: "FEATURES", label: "Fitur Platform" },
  { value: "PAYMENT", label: "Pembayaran" },
  { value: "SHIPPING", label: "Pengiriman" },
  { value: "TROUBLESHOOTING", label: "Troubleshooting" },
  { value: "FAQ", label: "FAQ" },
  { value: "OTHER", label: "Lainnya" },
];

export default function SellerTutorialsPage() {
  const router = useRouter();
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [featuredTutorials, setFeaturedTutorials] = useState<Tutorial[]>([]);
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchFeaturedTutorials();
    fetchTutorials();
  }, []);

  useEffect(() => {
    if (!selectedTutorial) {
      fetchTutorials();
    }
  }, [searchQuery, filterCategory, currentPage]);

  const fetchFeaturedTutorials = async () => {
    try {
      const { data } = await tutorialApi.getFeaturedTutorials("SELLER");
      setFeaturedTutorials(data.tutorials || []);
    } catch (error) {
      console.error("Error fetching featured tutorials:", error);
    }
  };

  const fetchTutorials = async () => {
    setIsLoading(true);
    try {
      const { data } = await tutorialApi.getTutorials({
        page: currentPage,
        limit: 12,
        category: filterCategory || undefined,
        targetRole: "SELLER",
        search: searchQuery || undefined,
      });
      setTutorials(data.data || []);
      setTotalPages(data.pages || 1);
    } catch (error) {
      console.error("Error fetching tutorials:", error);
      toast.error("Gagal memuat tutorial");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewTutorial = async (slug: string) => {
    setIsLoadingDetail(true);
    try {
      const { data } = await tutorialApi.getTutorialBySlug(slug);
      setSelectedTutorial(data.tutorial);
    } catch (error) {
      console.error("Error fetching tutorial detail:", error);
      toast.error("Gagal memuat detail tutorial");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleBack = () => {
    setSelectedTutorial(null);
  };

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find((c) => c.value === value)?.label || value;
  };

  // Detail View
  if (selectedTutorial) {
    return (
      <div className="max-w-4xl mx-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali ke Daftar Tutorial
        </Button>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {selectedTutorial.thumbnail && (
            <div className="relative w-full h-64 bg-gradient-to-br from-blue-100 to-indigo-100">
              <img
                src={resolveImageUrl(selectedTutorial.thumbnail)}
                alt={selectedTutorial.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Hide image and show fallback on error
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div 
                className="absolute inset-0 items-center justify-center hidden"
                style={{ display: 'none' }}
              >
                <BookOpen className="h-16 w-16 text-blue-600" />
              </div>
            </div>
          )}

          <div className="p-8">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline">
                {getCategoryLabel(selectedTutorial.category)}
              </Badge>
              {selectedTutorial.isFeatured && (
                <Badge variant="warning">
                  <Star className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              )}
              <div className="flex items-center gap-1 text-sm text-gray-500 ml-auto">
                <Eye className="h-4 w-4" />
                {selectedTutorial.viewCount} views
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {selectedTutorial.title}
            </h1>

            {selectedTutorial.description && (
              <p className="text-lg text-gray-600 mb-6">
                {selectedTutorial.description}
              </p>
            )}

            {selectedTutorial.videoUrl && (
              <div className="mb-8">
                <YouTubeEmbed
                  url={selectedTutorial.videoUrl}
                  title={selectedTutorial.title}
                />
              </div>
            )}

            <div className="border-t border-gray-200 pt-8">
              <MarkdownRenderer content={selectedTutorial.content} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tutorial & Panduan</h1>
        <p className="text-gray-600 mt-1">
          Pelajari cara menggunakan platform untuk mengembangkan bisnis Anda
        </p>
      </div>

      {/* Featured Tutorials */}
      {featuredTutorials.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Tutorial Unggulan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredTutorials.slice(0, 3).map((tutorial) => (
              <div
                key={tutorial.id}
                onClick={() => handleViewTutorial(tutorial.slug)}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all border border-blue-100"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {tutorial.title}
                    </h3>
                    {tutorial.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {tutorial.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari tutorial..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tutorial Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : tutorials.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Tidak ada tutorial ditemukan
          </h3>
          <p className="text-gray-600">
            {searchQuery || filterCategory
              ? "Coba ubah filter atau kata kunci pencarian"
              : "Tutorial akan segera ditambahkan"}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tutorials.map((tutorial) => (
              <div
                key={tutorial.id}
                onClick={() => handleViewTutorial(tutorial.slug)}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
              >
                {tutorial.thumbnail ? (
                  <div className="relative w-full h-48 bg-gradient-to-br from-blue-100 to-indigo-100 overflow-hidden">
                    <img
                      src={resolveImageUrl(tutorial.thumbnail)}
                      alt={tutorial.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        // Hide image and show fallback on error
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div 
                      className="absolute inset-0 items-center justify-center hidden"
                      style={{ display: 'none' }}
                    >
                      <BookOpen className="h-12 w-12 text-blue-600" />
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-blue-600" />
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-xs">
                      {getCategoryLabel(tutorial.category)}
                    </Badge>
                    {tutorial.videoUrl && (
                      <Badge variant="outline" className="text-xs">
                        <Video className="h-3 w-3 mr-1" />
                        Video
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {tutorial.title}
                  </h3>

                  {tutorial.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                      {tutorial.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {tutorial.viewCount}
                    </div>
                    <div className="flex items-center gap-1 text-blue-600 group-hover:gap-2 transition-all">
                      Baca Selengkapnya
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {isLoadingDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Spinner />
        </div>
      )}
    </div>
  );
}
