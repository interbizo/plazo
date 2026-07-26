"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { buyerApi } from "@/services/buyer.service";
import { getErrorMessage } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Heart, Trash2, ShoppingBag, Briefcase } from "lucide-react";
import toast from "react-hot-toast";

interface WishlistItem {
  id: string;
  product?: {
    id: string;
    name: string;
    slug: string;
    price: number;
    thumbnail?: string;
    images?: string[];
    tenant?: { name: string; subdomain: string };
  };
  service?: {
    id: string;
    name: string;
    slug?: string;
    basePrice: number;
    thumbnail?: string;
    tenant?: { name: string; subdomain: string };
  };
  createdAt: string;
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const fetchWishlist = async () => {
    try {
      const { data } = await buyerApi.getWishlist({ limit: 50 });
      setItems(data.data || data || []);
    } catch {
      // Silently fallback to empty — user sees "wishlist empty" empty state
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemove = async (id: string) => {
    setRemovingIds((prev) => new Set(prev).add(id));
    try {
      await buyerApi.removeFromWishlistById(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Dihapus dari wishlist");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Heart className="h-12 w-12" />}
        title="Wishlist Kosong"
        description="Simpan produk atau layanan favorit Anda ke wishlist"
      />
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">
        Wishlist ({items.length})
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const product = item.product;
          const service = item.service;
          const name = product?.name || service?.name || "Item";
          const price = product?.price || service?.basePrice || 0;
          const image =
            product?.thumbnail || product?.images?.[0] || service?.thumbnail;
          const href = product
            ? `/products/${product.slug}`
            : service?.slug
              ? `/services/${service.slug}`
              : "#";
          const storeName =
            product?.tenant?.name || service?.tenant?.name || "";

          return (
            <div
              key={item.id}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md"
            >
              <Link href={href} className="block">
                <div className="relative aspect-video overflow-hidden bg-gray-100">
                  {image ? (
                    <Image
                      src={image}
                      alt={name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      {product ? (
                        <ShoppingBag className="h-10 w-10 text-gray-300" />
                      ) : (
                        <Briefcase className="h-10 w-10 text-gray-300" />
                      )}
                    </div>
                  )}
                </div>
              </Link>
              <div className="p-4">
                {storeName && (
                  <p className="text-xs text-gray-500 mb-1 truncate">
                    {storeName}
                  </p>
                )}
                <Link href={href}>
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 hover:text-blue-600">
                    {name}
                  </h3>
                </Link>
                <p className="mt-1 text-sm font-bold text-blue-600">
                  {formatPrice(price)}
                </p>
                <button
                  onClick={() => handleRemove(item.id)}
                  disabled={removingIds.has(item.id)}
                  className="mt-3 flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {removingIds.has(item.id) ? "Menghapus..." : "Hapus"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
