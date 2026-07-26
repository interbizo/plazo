"use client";

import { useEffect, useState } from "react";
import { buyerApi } from "@/services/buyer.service";
import { formatDate } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Avatar } from "@/components/ui/avatar";
import { Star } from "lucide-react";

interface ReviewItem {
  id: string;
  rating: number;
  comment?: string;
  giver?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  createdAt: string;
}

export default function BuyerReviewsPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchReviews = async () => {
      setIsLoading(true);
      try {
        const { data } = await buyerApi.getMyReviews({ limit: 20, page });
        setReviews(data.data || []);
        setTotalPages(data.pagination?.pages || 1);
      } catch {
        // Silently fallback to empty — user sees "no reviews" empty state
        setReviews([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReviews();
  }, [page]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Ulasan Saya</h1>

      {reviews.length === 0 ? (
        <EmptyState
          icon={<Star className="h-12 w-12 text-gray-300" />}
          title="Belum ada ulasan"
          description="Ulasan yang Anda berikan akan muncul di sini."
        />
      ) : (
        <>
          <div className="space-y-3">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <Avatar
                    src={review.giver?.avatar}
                    firstName={review.giver?.firstName}
                    lastName={review.giver?.lastName}
                    size="sm"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {review.giver?.firstName} {review.giver?.lastName}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="mt-1 text-sm text-gray-600">
                        {review.comment}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      {formatDate(review.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
