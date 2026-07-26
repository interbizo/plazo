import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";

interface AvatarProps {
  src?: string | null;
  firstName?: string;
  lastName?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Avatar({
  src,
  firstName,
  lastName,
  size = "md",
  className,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  
  const sizes = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-lg",
  };

  const imgSizes = { xs: 24, sm: 32, md: 40, lg: 48, xl: 64 };

  // Show initials if no src, empty src, or image failed to load
  if (!src || imageError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600",
          sizes[size],
          className,
        )}
      >
        {getInitials(firstName, lastName)}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full",
        sizes[size],
        className,
      )}
    >
      <Image
        src={src}
        alt={`${firstName || ""} ${lastName || ""}`}
        width={imgSizes[size]}
        height={imgSizes[size]}
        className="h-full w-full object-cover"
        onError={() => setImageError(true)}
        unoptimized={src.startsWith("data:")}
      />
    </div>
  );
}
