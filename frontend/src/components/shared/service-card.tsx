import Image from "next/image";
import Link from "next/link";
import type { Service } from "@/types";
import { formatPrice } from "@/lib/utils";
import { getSubdomainLink } from "@/lib/domain";
import { Star, Briefcase, Store, TrendingUp, Award } from "lucide-react";
import { WishlistButton } from "@/components/shared/wishlist-button";
import { VerifiedBadge } from "@/components/badges/verified-badge";

interface ServiceCardProps {
  service: Service & {
    averageRating?: number;
    totalReviews?: number;
    totalSales?: number;
  };
}

export function ServiceCard({ service }: ServiceCardProps) {
  const tenantInfo = service.tenant as Service["tenant"] & {
    logo?: string;
    subdomain?: string;
    isVerified?: boolean;
  };
  const lowestPackage = service.packages?.[0];
  const subdomain = tenantInfo?.subdomain;

  const storeUrl = subdomain ? getSubdomainLink(subdomain) : "#";
  const serviceUrl = service.slug ? `/services/${service.slug}` : "#";

  // If no subdomain, don't render the card (service should always have tenant)
  if (!subdomain) {
    console.warn(`Service ${service.id} has no subdomain`);
    return null;
  }

  // Determine badge priority: Best Seller > High Rating
  const showBestSellerBadge = (service.totalSales ?? 0) >= 10;
  const showHighRatingBadge =
    !showBestSellerBadge && (service.averageRating ?? 0) >= 4.5;

  return (
    <div className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-lg">
      <a href={serviceUrl} className="block">
        <div className="relative aspect-video overflow-hidden bg-gray-100">
          {service.thumbnail || service.gallery?.[0] ? (
            <Image
              src={service.thumbnail || service.gallery[0]}
              alt={service.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Briefcase className="h-12 w-12 text-gray-300" />
            </div>
          )}
          {/* Dynamic Badges - Top Left */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
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
          </div>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <WishlistButton serviceId={service.id} />
          </div>
        </div>
      </a>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-1.5">
          {tenantInfo?.logo && (
            <Image
              src={tenantInfo.logo}
              alt={tenantInfo.name}
              width={20}
              height={20}
              className="rounded-full w-5 h-5"
            />
          )}
          {subdomain ? (
            <a
              href={storeUrl}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors truncate"
              onClick={(e) => e.stopPropagation()}
            >
              <Store className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {tenantInfo?.name || subdomain}
              </span>
              {tenantInfo?.isVerified && (
                <VerifiedBadge 
                  isVerified={true}
                  variant="compact"
                  size="xs"
                />
              )}
            </a>
          ) : (
            <span className="text-xs text-gray-500 truncate">
              {tenantInfo?.name || "Penyedia Jasa"}
            </span>
          )}
          {tenantInfo?.isVerified && (
            <span className="text-xs text-blue-500">✓</span>
          )}
        </div>

        <a href={serviceUrl}>
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
            {service.name}
          </h3>
        </a>

        <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-500">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          <span>{(service.averageRating ?? 0).toFixed(1)}</span>
          <span>({service.totalReviews ?? 0} ulasan)</span>
        </div>

        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-xs text-gray-500">Mulai</span>
          <span className="text-base font-bold text-blue-600">
            {formatPrice(lowestPackage?.price ?? service.basePrice)}
          </span>
        </div>
        {service.comparePrice && service.comparePrice > service.basePrice && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(service.comparePrice)}
            </span>
            <span className="rounded bg-red-100 px-1 py-0.5 text-[10px] font-bold text-red-500">
              -
              {Math.round(
                (1 - service.basePrice / service.comparePrice) * 100,
              )}
              %
            </span>
          </div>
        )}

        {/* Show sales count if available */}
        {(service.totalSales ?? 0) > 0 && (
          <div className="mt-1 text-xs text-gray-500">
            {service.totalSales} terjual
          </div>
        )}

        {service.category && (
          <span className="mt-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {service.category.name}
          </span>
        )}
      </div>
    </div>
  );
}
