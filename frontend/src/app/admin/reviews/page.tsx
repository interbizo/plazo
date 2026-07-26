"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { adminApi } from "@/services/admin.service";
import { formatDate } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Star, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface Review {
  id: string;
  rating?: number;
  comment?: string;
  createdAt?: string;
  reviewer?: { firstName?: string; lastName?: string };
  product?: { name?: string };
  service?: { name?: string };
  order?: { title?: string };
}

function ReviewsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const page = Number(searchParams.get("page") || "1");

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const { data } = await adminApi.getReviews({ page, limit: 20 });
      setReviews(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.pages || 0);
    } catch {
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadReviews = async () => {
      setIsLoading(true);
      try {
        const { data } = await adminApi.getReviews({ page, limit: 20 });
        setReviews(data.data || []);
        setTotal(data.total || 0);
        setTotalPages(data.pages || 0);
      } catch {
        setReviews([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadReviews();
  }, [page]);

  const updateURL = (params: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v);
      else sp.delete(k);
    });
    router.push(`/admin/reviews?${sp.toString()}`, { scroll: false });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus review ini?")) return;
    try {
      await adminApi.deleteReview(id, "Dihapus oleh admin");
      toast.success("Review dihapus");
      fetchReviews();
    } catch {
      toast.error("Gagal menghapus");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Moderasi Review</h1>
        <p className="text-sm text-gray-500">{total} review</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={<Star className="h-12 w-12 text-gray-300" />}
          title="Tidak ada review"
          description=""
        />
      ) : (
        <>
          <div className="space-y-3">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3.5 w-3.5 ${s <= (r.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-gray-700">
                        {r.rating}/5
                      </span>
                    </div>
                    <p className="text-sm text-gray-800">{r.comment || "-"}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {r.reviewer?.firstName} {r.reviewer?.lastName} •{" "}
                      {r.product?.name ||
                        r.service?.name ||
                        r.order?.title ||
                        "-"}{" "}
                      • {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                    title="Hapus review"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(p) => updateURL({ page: String(p) })}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminReviewsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      }
    >
      <ReviewsContent />
    </Suspense>
  );
}
