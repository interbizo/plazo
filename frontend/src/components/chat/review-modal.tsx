"use client";

import { useState, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Star, X, Image as ImageIcon, Upload } from "lucide-react";
import { reviewApi } from "@/services/review.service";
import { uploadApi } from "@/services/upload.service";
import toast from "react-hot-toast";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: {
    id: string;
    contextType: string;
    contextId: string;
    contextTitle: string;
  };
  onSuccess?: () => void;
}

export function ReviewModal({ isOpen, onClose, transaction, onSuccess }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Validasi jumlah foto (max 3)
    if (images.length + files.length > 3) {
      toast.error("Maksimal 3 foto");
      return;
    }

    // Validasi ukuran file (max 10MB per file - backend auto-compresses)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = files.filter(f => f.size > maxSize);
    if (oversizedFiles.length > 0) {
      toast.error(`Ukuran foto maksimal 10MB. File "${oversizedFiles[0].name}" terlalu besar (${(oversizedFiles[0].size / 1024 / 1024).toFixed(1)}MB)`);
      return;
    }

    // Validasi tipe file (hanya gambar)
    const invalidFiles = files.filter(f => !f.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      toast.error("Hanya file gambar yang diperbolehkan");
      return;
    }

    setUploadingImages(true);
    try {
      const uploadPromises = files.map(file => uploadApi.uploadFile(file, "ATTACHMENT"));
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.data.file.url);
      setImages(prev => [...prev, ...urls]);
      toast.success(`${files.length} foto berhasil diupload`);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "Gagal mengupload foto";
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message || errorMsg
      );
    } finally {
      setUploadingImages(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error("Silakan pilih rating");
      return;
    }

    setSubmitting(true);
    try {
      await reviewApi.createReview({
        chatTransactionId: transaction.id,
        rating,
        comment: comment.trim() || undefined,
        productId: transaction.contextType === "product" ? transaction.contextId : undefined,
        serviceId: transaction.contextType === "service" ? transaction.contextId : undefined,
        images: images.length > 0 ? images : undefined,
      });

      toast.success("Testimoni berhasil dikirim!");
      onSuccess?.();
      onClose();
      
      // Reset form
      setRating(0);
      setComment("");
      setImages([]);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "Gagal mengirim testimoni";
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message || errorMsg
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Berikan Testimoni">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {transaction.contextTitle}
          </label>
          <p className="text-xs text-gray-500">
            Bagaimana pengalaman Anda dengan {transaction.contextType === "product" ? "produk" : "jasa"} ini?
          </p>
        </div>

        {/* Rating Stars */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rating <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= (hoveredRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm text-gray-600 mt-2">
              {rating === 1 && "Sangat Buruk"}
              {rating === 2 && "Buruk"}
              {rating === 3 && "Cukup"}
              {rating === 4 && "Baik"}
              {rating === 5 && "Sangat Baik"}
            </p>
          )}
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ulasan (Opsional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ceritakan pengalaman Anda..."
            rows={4}
            maxLength={2000}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            {comment.length}/2000 karakter
          </p>
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Foto (Opsional)
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Maksimal 3 foto, masing-masing maksimal 300KB
          </p>

          {/* Image Preview */}
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {images.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Button */}
          {images.length < 3 && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImages || submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingImages ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                    <span className="text-sm text-gray-600">Mengupload...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Upload Foto ({images.length}/3)
                    </span>
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting || uploadingImages}
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={rating === 0 || submitting || uploadingImages}
            isLoading={submitting}
          >
            Kirim Testimoni
          </Button>
        </div>
      </form>
    </Modal>
  );
}
