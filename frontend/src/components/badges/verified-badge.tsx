"use client";

import { ShieldCheck, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
  isVerified: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
  certificateUrl?: string | null;
  className?: string;
  variant?: "default" | "compact" | "full";
}

export function VerifiedBadge({
  isVerified,
  size = "md",
  showLabel = false,
  certificateUrl,
  variant = "default",
  className,
}: VerifiedBadgeProps) {
  if (!isVerified) return null;

  const sizeClasses = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const badgeSizeClasses = {
    xs: "px-1.5 py-0.5 text-[10px] gap-1",
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-sm gap-1.5",
    lg: "px-3 py-1.5 text-base gap-2",
  };

  // Compact variant - icon only for cards
  if (variant === "compact") {
    return (
      <div className="inline-flex" title="Terverifikasi KYC">
        <ShieldCheck className={cn(sizeClasses[size], "text-blue-600 fill-blue-100")} />
      </div>
    );
  }

  // Full variant - with certificate download
  if (variant === "full" && certificateUrl) {
    return (
      <div className={cn("inline-flex items-center gap-2", className)}>
        <div
          className={cn(
            "inline-flex items-center rounded-full bg-blue-100 text-blue-700 font-semibold",
            badgeSizeClasses[size]
          )}
        >
          <ShieldCheck className={sizeClasses[size]} />
          <span>Terverifikasi KYC</span>
        </div>
        <a
          href={certificateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline transition-colors"
          title="Download Sertifikat"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="h-3 w-3" />
          <span className="hidden sm:inline">Sertifikat</span>
        </a>
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full bg-blue-100 text-blue-700 font-semibold",
        badgeSizeClasses[size],
        className
      )}
      title="Terverifikasi KYC"
    >
      <ShieldCheck className={sizeClasses[size]} />
      {showLabel && <span>Terverifikasi</span>}
    </div>
  );
}

// Tooltip variant for hover info
export function VerifiedBadgeWithTooltip({
  isVerified,
  verifiedAt,
  size = "sm",
}: {
  isVerified: boolean;
  verifiedAt?: Date | string | null;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  if (!isVerified) return null;

  const formattedDate = verifiedAt
    ? new Date(verifiedAt).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="group relative inline-flex">
      <VerifiedBadge isVerified={isVerified} size={size} showLabel={false} variant="compact" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
          <div className="font-semibold">Terverifikasi KYC</div>
          {formattedDate && (
            <div className="text-gray-300 text-xs mt-0.5">
              Sejak {formattedDate}
            </div>
          )}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      </div>
    </div>
  );
}
