import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/utils";
import { getSubdomainLink } from "@/lib/domain";
import { Star, ShoppingBag, Store, TrendingUp, Award, Clock } from "lucide-react";
import { WishlistButton } from "@/components/shared/wishlist-button";
import { BoostBadge } from "@/components/shared/boost-badge";
import { OnlineStatusBadge } from "@/components/shared/online-status-badge";
import { VerifiedBadge } from "@/components/badges/verified-badge";

interface ProductCardProps {
  product: Product & {
    averageRating?: number;
    totalReviews?: number;
    totalSales?: number;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const tenantInfo = product.tenant as Product["tenant"] & {
    subdomain?: string;
    owner?: { lastActiveAt?: string };
  };
  const subdomain = tenantInfo?.subdomain;
  const availableStock =
    product.hasVariants && Array.isArray(product.variants)
      ? product.variants
          .filter((variant) => variant.isActive !== false)
          .reduce((total, variant) => total + (variant.stock || 0), 0)
      : product.stock;

  const storeUrl = subdomain ? getSubdomainLink(subdomain) : "#";
  const productUrl = product.slug ? `/products/${product.slug}` : "#";

  // If no subdomain, don't render the card (product should always have tenant)
  if (!subdomain) {
    console.warn(`Product ${product.id} has no subdomain`);
    return null;
  }

  // Calculate if product is new (created within last 7 days)
  const isNew = product.createdAt
    ? new Date().getTime() - new Date(product.createdAt).getTime() <
      7 * 24 * 60 * 60 * 1000
    : false;

  // Determine badge priority: Best Seller > High Rating > Low Stock > New
  const showBestSellerBadge = (product.totalSales ?? 0) >= 10;
  const showHighRatingBadge =
    !showBestSellerBadge && (product.averageRating ?? 0) >= 4.5;
  const showLowStockBadge =
    !showBestSellerBadge &&
    !showHighRatingBadge &&
    availableStock > 0 &&
    availableStock <= 5;
  const showNewBadge =
    !showBestSellerBadge &&
    !showHighRatingBadge &&
    !showLowStockBadge &&
    isNew;

  return (
    <div className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-lg">
      <a href={productUrl} className="block">
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          {product.thumbnail || product.images?.[0] ? (
            <Image
              src={product.thumbnail || product.images[0]}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ShoppingBag className="h-12 w-12 text-gray-300" />
            </div>
          )}
          {availableStock <= 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-900">
                Habis
              </span>
            </div>
          )}
          {/* Dynamic Badges - Top Left */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.isBoosted && (
              <BoostBadge
                isBoosted={product.isBoosted}
                boostedUntil={product.boostedUntil}
                size="sm"
              />
            )}
            {showBestSellerBadge && (
              <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-2 py-1 text-xs font-bold text-white shadow-md">
                <TrendingUp className="h-3 w-3" />
                Terlaris
              </span>
            )}
            {showHighRatingBadge && (
              <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-2 py-1 text-xs font-bold text-white shadow-md">
                <Award className="h-3 w-3" />
                Rating Tinggi
              </span>
            )}
            {showLowStockBadge && (
              <span className="flex items-center gap-1 rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white shadow-md">
                Stok Terbatas
              </span>
            )}
            {showNewBadge && (
              <span className="flex items-center gap-1 rounded-full bg-green-500 px-2 py-1 text-xs font-bold text-white shadow-md">
                <Clock className="h-3 w-3" />
                Baru
              </span>
            )}
          </div>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <WishlistButton productId={product.id} />
          </div>
        </div>
      </a>

      <div className="p-3">
        {subdomain ? (
          <a
            href={storeUrl}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors truncate"
            onClick={(e) => e.stopPropagation()}
          >
            <Store className="h-3 w-3 shrink-0" />
            <span className="truncate">{tenantInfo?.name || subdomain}</span>
            {tenantInfo?.isVerified && (
              <VerifiedBadge 
                isVerified={true}
                variant="compact"
                size="xs"
              />
            )}
          </a>
        ) : (
          <p className="text-xs text-gray-500 truncate">
            {tenantInfo?.name || "Toko"}
          </p>
        )}
        <a href={productUrl}>
          <h3 className="mt-0.5 text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
            {product.name}
          </h3>
        </a>
        <p className="mt-1.5 text-base font-bold text-blue-600">
          {formatPrice(product.price)}
        </p>
        {product.comparePrice && product.comparePrice > product.price && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(product.comparePrice)}
            </span>
            <span className="rounded bg-red-100 px-1 py-0.5 text-[10px] font-bold text-red-500">
              -{Math.round((1 - product.price / product.comparePrice) * 100)}%
            </span>
          </div>
        )}
        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          <span>{(product.averageRating ?? 0).toFixed(1)}</span>
          <span>({product.totalReviews ?? 0} ulasan)</span>
        </div>
        {/* Show sales count if available */}
        {(product.totalSales ?? 0) > 0 && (
          <div className="mt-1 text-xs text-gray-500">
            {product.totalSales} terjual
          </div>
        )}
        {product.category && (
          <span className="mt-1.5 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {product.category.name}
          </span>
        )}
      </div>
    </div>
  );
}
