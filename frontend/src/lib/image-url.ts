/**
 * Resolve image URL to a full accessible URL.
 * 
 * Handles multiple formats:
 * - Full URL: "https://api.plazo.id/uploads/images/xxx.webp" → as-is
 * - Relative path: "/uploads/images/xxx.webp" → prepend API base URL
 * - Localhost URL: "http://localhost:3001/uploads/..." → replace with API base URL in production
 * - Empty/null → returns fallback or empty string
 * 
 * This ensures images always load correctly regardless of environment.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const S3_PUBLIC_URL = process.env.NEXT_PUBLIC_S3_PUBLIC_URL?.replace(/\/$/, "") || "";

export function resolveImageUrl(url: string | null | undefined, fallback?: string): string {
  if (!url) return fallback || "";

  // Already a valid production URL — return as-is
  if (url.startsWith("https://") && !url.includes("localhost")) {
    return url;
  }

  // S3 mode: relative path /uploads/... → strip prefix, arahkan ke bucket public URL
  if (S3_PUBLIC_URL) {
    if (url.startsWith("/uploads/")) {
      return `${S3_PUBLIC_URL}/${url.replace(/^\/uploads\//, "")}`;
    }
  }

  // Relative path (starts with /uploads/) — prepend API URL
  if (url.startsWith("/uploads/")) {
    return `${API_URL}${url}`;
  }

  // Localhost URL in production — replace base with actual API URL
  if (url.includes("localhost:3001") || url.includes("127.0.0.1:3001")) {
    const path = url.replace(/^https?:\/\/(localhost|127\.0\.0\.1):3001/, "");
    return `${API_URL}${path}`;
  }

  // Any other http URL (might be from old data) — try to fix
  if (url.startsWith("http://") && !url.includes("localhost")) {
    // Convert http to https for production URLs
    return url.replace("http://", "https://");
  }

  // Return as-is (could be external URL like Cloudinary, Imgur, etc.)
  return url;
}
