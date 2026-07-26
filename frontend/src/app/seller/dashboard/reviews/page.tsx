"use client";

import { useEffect, useState } from "react";
import { sellerApi } from "@/services/seller.service";
import { formatDate } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { Pagination } from "@/components/shared/pagination";
import { Star, MessageSquare } from "lucide-react";
import Image from "next/image";

interface ReviewGiver {
  firstName: string;
  lastName: string;
  avatar?: string;
}

interface OrderInfo {
  id: string;
  title: string;
  orderItems?: Array<{
    product?: {
      id: string;
      name: string;
      images?: string[];
    };
  }>;
}

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  giver?: ReviewGiver;
  order?: OrderInfo;
  images?: string[];
  reply?: {
    id: string;
    message: string;
    createdAt: string;
  };
}

export default function SellerReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
  });

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, [page]);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const { data } = await sellerApi.getReviews({ page, limit: 20 });
      setReviews(data.data || []);
      setTotalPages(data.pagination?.pages || 0);
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await sellerApi.getReviewStats();
      setStats({
        averageRating: data.averageRating || 0,
        totalReviews: data.totalReviews || 0,
      });
    } catch (error) {
      console.error("Failed to fetch review stats:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ulasan dari Pembeli</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola ulasan dari pembeli untuk produk dan jasa Anda
        </p>
      </div>

      {/* Stats Cards */}
      {stats.totalReviews > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-yellow-50 to-white p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Star className="h-6 w-6 text-yellow-600 fill-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Rating Rata-rata</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.averageRating.toFixed(1)}
                  <span className="text-sm text-gray-500 font-normal ml-1">/ 5.0</span>
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-white p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Ulasan</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalReviews}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <EmptyState
          icon={<Star className="h-16 w-16 text-gray-300" />}
          title="Belum ada ulasan"
          description="Ulasan dari pembeli akan muncul di sini setelah mereka menyelesaikan pesanan."
        />
      ) : (
        <>
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="flex items-start gap-4">
                  <Avatar
                    src={review.giver?.avatar}
                    firstName={review.giver?.firstName}
                    lastName={review.giver?.lastName}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {review.giver?.firstName} {review.giver?.lastName}
                        </p>
                        {review.order && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {review.order.title}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-1 mb-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-200"
                          }`}
                        />
                      ))}
                      <span className="text-sm font-medium text-gray-700 ml-1">
                        {review.rating}.0
                      </span>
                    </div>

                    {/* Comment */}
                    {review.comment && (
                      <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                        {review.comment}
                      </p>
                    )}

                    {/* Images */}
                    {review.images && review.images.length > 0 && (
                      <div className="flex gap-2 mb-3">
                        {review.images.map((img, idx) => (
                          <div
                            key={idx}
                            className="relative h-20 w-20 rounded-lg overflow-hidden border border-gray-200"
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

                    {/* Product Info */}
                    {review.order?.orderItems?.[0]?.product && (
                      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg mb-3">
                        {review.order.orderItems[0].product.images?.[0] && (
                          <div className="relative h-10 w-10 rounded overflow-hidden bg-gray-200 shrink-0">
                            <Image
                              src={review.order.orderItems[0].product.images[0]}
                              alt={review.order.orderItems[0].product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <p className="text-xs text-gray-600 truncate">
                          {review.order.orderItems[0].product.name}
                        </p>
                      </div>
                    )}

                    {/* Reply */}
                    {review.reply && (
                      <div className="mt-3 pl-4 border-l-2 border-blue-200 bg-blue-50 p-3 rounded-r-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                          <span className="text-xs font-medium text-blue-900">
                            Balasan Anda
                          </span>
                          <span className="text-xs text-blue-600">
                            {formatDate(review.reply.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">
                          {review.reply.message}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
