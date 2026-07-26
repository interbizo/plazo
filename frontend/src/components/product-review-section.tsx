"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/utils";
import { Star } from "lucide-react";
import Image from "next/image";

interface ReviewGiver {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

interface ReviewItem {
  id: string;
  rating: number;
  comment?: string;
  images?: string[];
  giver?: ReviewGiver;
  createdAt: string;
  reply?: {
    id: string;
    message: string;
    seller: {
      firstName: string;
      lastName: string;
    };
  };
}

interface ReviewSummary {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
}

interface ReviewSectionProps {
  productId?: string;
  serviceId?: string;
  type: "product" | "service";
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-gray-200 text-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

export function ReviewSection({ productId, serviceId, type }: ReviewSectionProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);

  useEffect(() => {
    fetchReviews();
  }, [productId, serviceId, filterRating]);

  const fetchReviews = async () => {
    if (!productId && !serviceId) return;

    setIsLoading(true);
    try {
      const endpoint = type === "product" 
        ? `/api/reviews/product/${productId}`
        : `/api/reviews/service/${serviceId}`;
      
      const params = new URLSearchParams();
      params.append("limit", "10");
      if (filterRating) params.append("rating", filterRating.toString());

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}${endpoint}?${params}`
      );

      if (response.ok) {
        const data = await response.json();
        setReviews(data.data || []);
        setSummary(data.summary || null);
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mt-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!summary || summary.totalReviews === 0) {
    return (
      <div className="mt-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Ulasan</h2>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <Star className="h-12 w-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">Belum ada ulasan untuk {type === "product" ? "produk" : "jasa"} ini</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-12">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Ulasan Pembeli</h2>

      {/* Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="text-center">
            <p className="text-4xl font-bold text-gray-900">
              {summary.averageRating.toFixed(1)}
            </p>
            <div className="flex items-center gap-0.5 mt-1 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= Math.round(summary.averageRating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-200"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {summary.totalReviews} ulasan
            </p>
          </div>

          <div className="flex-1 w-full space-y-1.5">
            {[5, 4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                onClick={() => setFilterRating(filterRating === rating ? null : rating)}
                className={`w-full flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors ${
                  filterRating === rating ? "bg-yellow-50" : ""
                }`}
              >
                <span className="text-xs text-gray-500 w-3">{rating}</span>
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-yellow-400"
                    style={{
                      width: `${
                        summary.totalReviews > 0
                          ? ((summary.ratingDistribution[rating] || 0) /
                              summary.totalReviews) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-6 text-right">
                  {summary.ratingDistribution[rating] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Info */}
      {filterRating && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Menampilkan ulasan dengan rating {filterRating} bintang
          </span>
          <button
            onClick={() => setFilterRating(null)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Hapus filter
          </button>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <div className="flex items-start gap-3">
              <Avatar
                src={review.giver?.avatar}
                firstName={review.giver?.firstName}
                lastName={review.giver?.lastName}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {review.giver?.firstName} {review.giver?.lastName}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatRelativeTime(review.createdAt)}
                  </span>
                </div>
                <StarRating rating={review.rating} />
                {review.comment && (
                  <p className="mt-2 text-sm text-gray-600">{review.comment}</p>
                )}
                {review.images && review.images.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {review.images.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative h-20 w-20 rounded-lg overflow-hidden"
                      >
                        <Image
                          src={img}
                          alt={`Review ${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
                {review.reply && (
                  <div className="mt-3 pl-4 border-l-2 border-blue-200 bg-blue-50 p-3 rounded-r-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-blue-900">
                        Balasan dari {review.reply.seller.firstName}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{review.reply.message}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {reviews.length === 0 && filterRating && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-gray-500">
            Tidak ada ulasan dengan rating {filterRating} bintang
          </p>
        </div>
      )}
    </div>
  );
}
