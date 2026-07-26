"use client";

import { useState, useEffect, useCallback } from "react";
import { Heart } from "lucide-react";
import { buyerApi } from "@/services/buyer.service";
import { useAuthStore } from "@/stores/auth.store";
import toast from "react-hot-toast";

interface WishlistButtonProps {
  productId?: string;
  serviceId?: string;
  /** Pre-fetched wishlist status (avoids extra API call) */
  initialWished?: boolean;
  className?: string;
}

export function WishlistButton({
  productId,
  serviceId,
  initialWished,
  className = "",
}: WishlistButtonProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [isWished, setIsWished] = useState(initialWished ?? false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(initialWished !== undefined);

  // Check wishlist status on mount if not provided via prop
  useEffect(() => {
    // Skip if not authenticated or not a buyer
    if (!isAuthenticated || user?.role !== "BUYER") return;
    if (checked) return;
    if (!productId && !serviceId) return;

    let cancelled = false;
    const checkStatus = async () => {
      try {
        const { data } = await buyerApi.checkWishlist({ productId, serviceId });
        if (!cancelled) {
          setIsWished(data.isWished ?? data.isWishlisted ?? false);
          setChecked(true);
        }
      } catch {
        // Silently fail — button will default to "not wished"
        if (!cancelled) setChecked(true);
      }
    };
    checkStatus();
    return () => {
      cancelled = true;
    };
  }, [productId, serviceId, checked, isAuthenticated, user?.role]);

  const toggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (loading) return;

      setLoading(true);
      const wasWished = isWished;

      // Optimistic update
      setIsWished(!wasWished);

      try {
        if (wasWished) {
          await buyerApi.removeFromWishlist({ productId, serviceId });
          toast.success("Dihapus dari wishlist");
        } else {
          await buyerApi.addToWishlist({ productId, serviceId });
          toast.success("Ditambahkan ke wishlist");
        }
      } catch {
        // Revert on failure
        setIsWished(wasWished);
        toast.error("Gagal mengupdate wishlist");
      } finally {
        setLoading(false);
      }
    },
    [loading, isWished, productId, serviceId],
  );

  // Only show for authenticated buyers - moved to end after all hooks
  if (!isAuthenticated || user?.role !== "BUYER") return null;

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`rounded-full p-1.5 transition-colors ${
        isWished
          ? "bg-red-50 text-red-500 hover:bg-red-100"
          : "bg-white/80 text-gray-400 hover:text-red-500 hover:bg-white"
      } ${className}`}
      title={isWished ? "Hapus dari Wishlist" : "Tambah ke Wishlist"}
      aria-label={isWished ? "Hapus dari Wishlist" : "Tambah ke Wishlist"}
    >
      <Heart className={`h-4 w-4 ${isWished ? "fill-current" : ""}`} />
    </button>
  );
}
