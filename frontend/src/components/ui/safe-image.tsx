"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";
import { ImageIcon } from "lucide-react";

interface SafeImageProps extends Omit<ImageProps, 'onError'> {
  fallbackSrc?: string;
  showPlaceholder?: boolean;
}

export function SafeImage({
  src,
  alt,
  fallbackSrc,
  showPlaceholder = true,
  ...props
}: SafeImageProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error) {
    if (fallbackSrc) {
      return (
        <Image
          {...props}
          src={fallbackSrc}
          alt={alt}
          onError={() => {
            // If fallback also fails, show placeholder
            setError(true);
          }}
        />
      );
    }

    if (showPlaceholder) {
      return (
        <div
          className="flex items-center justify-center bg-gray-100"
          style={{
            width: props.width || '100%',
            height: props.height || '100%',
            minHeight: '200px',
          }}
        >
          <div className="text-center text-gray-400">
            <ImageIcon className="w-12 h-12 mx-auto mb-2" />
            <p className="text-xs">Gambar tidak dapat dimuat</p>
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <>
      {loading && showPlaceholder && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse"
          style={{ zIndex: 1 }}
        >
          <div className="text-center text-gray-400">
            <div className="w-8 h-8 mx-auto mb-2 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-xs">Memuat gambar...</p>
          </div>
        </div>
      )}
      <Image
        {...props}
        src={src}
        alt={alt}
        onError={() => setError(true)}
        onLoad={() => setLoading(false)}
        style={{
          ...props.style,
          opacity: loading ? 0 : 1,
          transition: 'opacity 0.3s',
        }}
      />
    </>
  );
}
