"use client";

import { useEffect, useState, useRef, useCallback, startTransition } from "react";
import { reviewApi } from "@/services/review.service";
import { chatApi } from "@/services/chat.service";
import { uploadApi } from "@/services/upload.service";
import { useAuthStore } from "@/stores/auth.store";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";
import { Star, Camera, X } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

const MAX_IMAGES = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (backend auto-compresses)

interface ReviewGiver {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

interface ReviewOrder {
  id: string;
  title: string;
}

interface ReviewItem {
  id: string;
  rating: number;
  comment?: string;
  images?: string[];
  giver?: ReviewGiver;
  order?: ReviewOrder;
  createdAt: string;
}

interface ReviewSummary {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
}

interface ReviewableTransaction {
  id: string;
  contextType?: string; // "product" or "service"
  contextId?: string; // ID of product or service
  contextTitle?: string;
  variantName?: string;
  packageTier?: string;
  packageTitle?: string;
  quantity?: number;
  price?: number;
  completedAt?: string;
}

interface ReviewSectionProps {
  sellerId?: string;
  productId?: string;
  serviceId?: string;
}

function safeNumber(value: number | null | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function normalizeReviewSummary(summary?: Partial<ReviewSummary> | null): ReviewSummary | null {
  if (!summary) return null;

  const distribution = summary.ratingDistribution || {};
  return {
    totalReviews: safeNumber(summary.totalReviews),
    averageRating: safeNumber(summary.averageRating),
    ratingDistribution: {
      1: safeNumber(distribution[1]),
      2: safeNumber(distribution[2]),
      3: safeNumber(distribution[3]),
      4: safeNumber(distribution[4]),
      5: safeNumber(distribution[5]),
    },
  };
}

function StarRating({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-gray-200 text-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

function StarInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={`h-7 w-7 transition-colors ${
              star <= (hover || value)
                ? "fill-yellow-400 text-yellow-400"
                : "fill-gray-200 text-gray-200"
            }`}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-sm font-medium text-gray-600">
          {value === 1
            ? "Buruk"
            : value === 2
              ? "Kurang"
              : value === 3
                ? "Cukup"
                : value === 4
                  ? "Bagus"
                  : "Sangat Bagus"}
        </span>
      )}
    </div>
  );
}

function RatingBar({
  star,
  count,
  total,
}: {
  star: number;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-3 text-right text-gray-600">{star}</span>
      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-yellow-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs text-gray-500">{count}</span>
    </div>
  );
}

function ReviewImageUpload({
  images,
  onAdd,
  onRemove,
}: {
  images: { file: File; preview: string }[];
  onAdd: (files: FileList) => void;
  onRemove: (index: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">
        Foto (maks {MAX_IMAGES} foto, maks 10MB per foto)
      </p>
      <div className="flex gap-2 flex-wrap">
        {images.map((img, i) => (
          <div
            key={i}
            className="relative h-20 w-20 rounded-lg overflow-hidden border border-gray-200"
          >
            <Image
              src={img.preview}
              alt=""
              fill
              className="object-cover"
              sizes="80px"
            />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5"
            >
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="h-20 w-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
          >
            <Camera className="h-5 w-5" />
            <span className="text-[10px] mt-0.5">Tambah</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onAdd(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function ReviewSection({ sellerId, productId, serviceId }: ReviewSectionProps) {
  const { user, isAuthenticated } = useAuthStore();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Review form state
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewImages, setReviewImages] = useState<
    { file: File; preview: string }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterMedia, setFilterMedia] = useState(false);

  const fetchReviews = useCallback(async (p: number = 1) => {
    setLoading(true);
    try {
      // Prioritize specific item (product/service) over seller
      const { data } = serviceId 
        ? await reviewApi.getServiceReviews(serviceId, {
            page: p,
            limit: 5,
            ...(filterRating ? { rating: filterRating } : {}),
            ...(filterMedia ? { hasImages: true } : {}),
          })
        : productId
        ? await reviewApi.getProductReviews(productId, {
            page: p,
            limit: 5,
            ...(filterRating ? { rating: filterRating } : {}),
            ...(filterMedia ? { hasImages: true } : {}),
          })
        : await reviewApi.getSellerReviews(sellerId!, {
            page: p,
            limit: 5,
            ...(filterRating ? { rating: filterRating } : {}),
            ...(filterMedia ? { hasImages: true } : {}),
          });
      setReviews(Array.isArray(data.data) ? data.data : []);
      setSummary(normalizeReviewSummary(data.summary));
      setTotalPages(Math.max(1, safeNumber(data.pagination?.pages) || 1));
    } catch {
      setReviews([]);
      setSummary(null);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [sellerId, productId, serviceId, filterRating, filterMedia]);

  useEffect(() => {
    if (sellerId || productId || serviceId) startTransition(() => { fetchReviews(page); });
  }, [sellerId, productId, serviceId, page, filterRating, filterMedia, fetchReviews]);

  const handleAddImages = (files: FileList) => {
    const remaining = MAX_IMAGES - reviewImages.length;
    const fileArray = Array.from(files).slice(0, remaining);

    for (const file of fileArray) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(
          `File "${file.name}" terlalu besar. Maksimal 10MB per foto.`,
        );
        continue;
      }
      if (!file.type.startsWith("image/")) {
        toast.error(`File "${file.name}" bukan gambar.`);
        continue;
      }
      setReviewImages((prev) => [
        ...prev,
        { file, preview: URL.createObjectURL(file) },
      ]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setReviewImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmitReview = async (chatTransactionId: string) => {
    if (rating === 0) {
      toast.error("Pilih rating terlebih dahulu");
      return;
    }

    setSubmitting(true);
    try {
      // Validation
      if (!rating || rating < 1 || rating > 5) {
        toast.error("Rating harus antara 1-5 bintang");
        setSubmitting(false);
        return;
      }

      // Upload images first
      let imageUrls: string[] = [];
      if (reviewImages.length > 0) {
        const files = reviewImages.map((img) => img.file);
        const { data } = await uploadApi.uploadMultiple(files);
        // Backend returns { files: [...] } not { urls: [...] }
        imageUrls = data.files.map(f => f.url);
      }

      const reviewData = {
        chatTransactionId,
        productId,
        serviceId,
        rating: Number(rating),
        comment: comment.trim() || undefined,
        images: imageUrls.length > 0 ? imageUrls : undefined,
      };

      console.log("Submitting review:", reviewData);

      await reviewApi.createReview(reviewData);

      toast.success("Review berhasil dikirim!");
      setShowForm(false);
      setRating(0);
      setComment("");
      reviewImages.forEach((image) => URL.revokeObjectURL(image.preview));
      setReviewImages([]);
      setPage(1);
      fetchReviews(1);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; error?: string } } };
      console.error("Review submission error:", axiosErr);
      const errorMessage = axiosErr?.response?.data?.message || axiosErr?.response?.data?.error || "Gagal mengirim review";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <div className="mt-8 border-t pt-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Ulasan Pembeli
      </h2>

      {/* Summary */}
      {summary && summary.totalReviews > 0 && (
        <div className="flex flex-col sm:flex-row gap-6 mb-8 p-4 rounded-xl bg-gray-50">
          {/* Average */}
          <div className="flex flex-col items-center justify-center sm:min-w-35">
            <span className="text-4xl font-bold text-gray-900">
              {summary.averageRating}
            </span>
            <StarRating rating={Math.round(summary.averageRating)} size="md" />
            <span className="text-sm text-gray-500 mt-1">
              {summary.totalReviews} ulasan
            </span>
          </div>
          {/* Distribution */}
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => (
              <RatingBar
                key={star}
                star={star}
                count={summary.ratingDistribution?.[star] || 0}
                total={summary.totalReviews}
              />
            ))}
          </div>
        </div>
      )}

      {/* Rating & Media Filters */}
      {summary && summary.totalReviews > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => { setFilterRating(null); setFilterMedia(false); setPage(1); }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
              !filterRating && !filterMedia
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
            }`}
          >
            Semua
          </button>
          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => { setFilterRating(filterRating === star ? null : star); setFilterMedia(false); setPage(1); }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors flex items-center gap-1 ${
                filterRating === star
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
              }`}
            >
              <Star className="h-3.5 w-3.5" />
              {star}
              {summary.ratingDistribution?.[star] > 0 && (
                <span className="text-xs opacity-75">({summary.ratingDistribution[star]})</span>
              )}
            </button>
          ))}
          <button
            onClick={() => { setFilterMedia(!filterMedia); setFilterRating(null); setPage(1); }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors flex items-center gap-1 ${
              filterMedia
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            Dengan Media
          </button>
        </div>
      )}

      {/* Review Form (for buyers who can write a review) */}
      {isAuthenticated &&
        user?.role === "BUYER" &&
        (sellerId || productId || serviceId) && (
        <WriteReviewSection
          sellerId={sellerId}
          productId={productId}
          serviceId={serviceId}
          showForm={showForm}
          setShowForm={setShowForm}
          rating={rating}
          setRating={setRating}
          comment={comment}
          setComment={setComment}
          reviewImages={reviewImages}
          onAddImages={handleAddImages}
          onRemoveImage={handleRemoveImage}
          submitting={submitting}
          onSubmit={handleSubmitReview}
        />
      )}

      {/* Review List */}
      {reviews.length === 0 ? (
        <div className="text-center py-8">
          <Star className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            {filterRating || filterMedia
              ? "Tidak ada ulasan yang sesuai filter"
              : "Belum ada ulasan untuk item ini"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-xl border border-gray-100 p-4"
            >
              <div className="flex items-start gap-3">
                <Avatar
                  src={review.giver?.avatar}
                  firstName={review.giver?.firstName || "?"}
                  lastName={review.giver?.lastName || ""}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {review.giver?.firstName} {review.giver?.lastName}
                    </p>
                    <span className="text-xs text-gray-400">
                      {formatRelativeTime(review.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StarRating rating={review.rating} />
                    {review.order?.title && (
                      <span className="text-xs text-gray-400 truncate">
                        &middot; {review.order.title}
                      </span>
                    )}
                  </div>
                  {review.comment && (
                    <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">
                      {review.comment}
                    </p>
                  )}
                  {/* Review Images */}
                  {(review.images?.length ?? 0) > 0 && (
                    <div className="mt-3 flex gap-2">
                      {review.images!.map((img: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => setSelectedImage(img)}
                          className="relative h-16 w-16 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity"
                        >
                          <Image
                            src={img}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Sebelumnya
              </Button>
              <span className="text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Selanjutnya
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-lg max-h-[80vh]">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-3 -right-3 bg-white rounded-full p-1.5 shadow-lg z-10"
            >
              <X className="h-4 w-4 text-gray-700" />
            </button>
            <Image
              src={selectedImage}
              alt="Review"
              width={600}
              height={600}
              className="rounded-xl object-contain max-h-[80vh]"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Write Review Section - Fetches buyer's completed (unreviewed) ChatTransactions
 */
function WriteReviewSection({
  productId,
  serviceId,
  showForm,
  setShowForm,
  rating,
  setRating,
  comment,
  setComment,
  reviewImages,
  onAddImages,
  onRemoveImage,
  submitting,
  onSubmit,
}: {
  sellerId?: string;
  productId?: string;
  serviceId?: string;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  rating: number;
  setRating: (v: number) => void;
  comment: string;
  setComment: (v: string) => void;
  reviewImages: { file: File; preview: string }[];
  onAddImages: (files: FileList) => void;
  onRemoveImage: (index: number) => void;
  submitting: boolean;
  onSubmit: (chatTransactionId: string) => void;
}) {
  const [reviewableTransactions, setReviewableTransactions] = useState<ReviewableTransaction[]>([]);
  const [selectedTransactionId, setSelectedTransactionId] = useState("");
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  useEffect(() => {
    const fetchReviewableTransactions = async () => {
      setLoadingTransactions(true);
      try {
        const { data: res } = await chatApi.getCompletedTransactions();
        const transactions: ReviewableTransaction[] = res?.data || res || [];

        // Filter transactions matching the current product or service
        const matched = transactions.filter((tx: ReviewableTransaction) => {
          if (productId) return tx.contextType === "product" && tx.contextId === productId;
          if (serviceId) return tx.contextType === "service" && tx.contextId === serviceId;
          return false;
        });

        setReviewableTransactions(matched);
        if (matched.length > 0) {
          setSelectedTransactionId(matched[0].id);
        }
      } catch {
        // silent
      } finally {
        setLoadingTransactions(false);
      }
    };

    if (showForm) fetchReviewableTransactions();
  }, [showForm, productId, serviceId]);

  if (!showForm) {
    return (
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
          <Star className="h-4 w-4 mr-1.5" />
          Tulis Ulasan
        </Button>
      </div>
    );
  }

  if (loadingTransactions) {
    return (
      <div className="mb-6 rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          <span className="ml-2 text-sm text-gray-500">
            Memeriksa transaksi...
          </span>
        </div>
      </div>
    );
  }

  if (reviewableTransactions.length === 0) {
    return (
      <div className="mb-6 rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-500 text-center">
          Belum ada transaksi selesai untuk item ini. Transaksi harus ditandai selesai oleh seller sebelum Anda bisa memberikan ulasan.
        </p>
        <div className="flex justify-center mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowForm(false)}
          >
            Tutup
          </Button>
        </div>
      </div>
    );
  }

  const selectedTx = reviewableTransactions.find(tx => tx.id === selectedTransactionId);

  return (
    <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/30 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Tulis Ulasan</h3>
        <button
          onClick={() => setShowForm(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Transaction selector */}
      {reviewableTransactions.length > 1 && (
        <div className="mb-4">
          <label className="text-xs text-gray-600 block mb-1">
            Pilih transaksi
          </label>
          <select
            value={selectedTransactionId}
            onChange={(e) => setSelectedTransactionId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            {reviewableTransactions.map((tx) => (
              <option key={tx.id} value={tx.id}>
                {tx.contextTitle || "Transaksi"}{tx.variantName ? ` — ${tx.variantName}` : ""}{tx.packageTitle ? ` — ${tx.packageTitle}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Selected transaction info */}
      {selectedTx && (
        <div className="mb-4 rounded-lg bg-white border border-gray-100 p-3">
          <p className="text-sm font-medium text-gray-900">{selectedTx.contextTitle || "Transaksi"}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {selectedTx.variantName && `Varian: ${selectedTx.variantName} · `}
            {selectedTx.packageTitle && `Paket: ${selectedTx.packageTitle} · `}
            {selectedTx.quantity && `Qty: ${selectedTx.quantity} · `}
            {selectedTx.price != null && `Rp ${selectedTx.price.toLocaleString("id-ID")}`}
          </p>
          {selectedTx.completedAt && (
            <p className="text-xs text-gray-400 mt-1">
              Selesai: {new Date(selectedTx.completedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
        </div>
      )}

      {/* Rating */}
      <div className="mb-4">
        <label className="text-xs text-gray-600 block mb-1.5">Rating *</label>
        <StarInput value={rating} onChange={setRating} />
      </div>

      {/* Comment */}
      <div className="mb-4">
        <label className="text-xs text-gray-600 block mb-1.5">
          Komentar (opsional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tulis pengalaman Anda..."
          rows={3}
          maxLength={1000}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
        />
        <p className="text-[10px] text-gray-400 text-right">
          {comment.length}/1000
        </p>
      </div>

      {/* Image Upload */}
      <div className="mb-4">
        <ReviewImageUpload
          images={reviewImages}
          onAdd={onAddImages}
          onRemove={onRemoveImage}
        />
      </div>

      {/* Submit */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowForm(false)}
          disabled={submitting}
        >
          Batal
        </Button>
        <Button
          size="sm"
          onClick={() => onSubmit(selectedTransactionId)}
          isLoading={submitting}
          disabled={rating === 0}
        >
          Kirim Ulasan
        </Button>
      </div>
    </div>
  );
}
