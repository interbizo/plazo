/**
 * Image optimization helpers for lazy loading support.
 * Provides thumbnail URL generation and image metadata
 * that the frontend can use for lazy loading strategies.
 */
export class ImageHelper {
  /**
   * Generate thumbnail URL variant from original URL.
   * Works with common CDN/storage patterns by appending size suffix.
   */
  static getThumbnailUrl(
    originalUrl: string,
    width: number = 200,
    height: number = 200,
  ): string {
    if (!originalUrl) return "";

    // If URL already contains size parameters, return as-is
    if (originalUrl.includes("?w=") || originalUrl.includes("&w=")) {
      return originalUrl;
    }

    // For common CDN patterns, append resize parameters
    const separator = originalUrl.includes("?") ? "&" : "?";
    return `${originalUrl}${separator}w=${width}&h=${height}&fit=cover`;
  }

  /**
   * Generate a tiny base64 placeholder for blur-up lazy loading.
   * Returns a 1x1 transparent pixel as default placeholder.
   */
  static getPlaceholder(): string {
    return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  }

  /**
   * Generate srcset attribute values for responsive images
   */
  static getSrcSet(
    originalUrl: string,
    widths: number[] = [320, 640, 960, 1280],
  ): string {
    if (!originalUrl) return "";

    return widths
      .map((w) => {
        const separator = originalUrl.includes("?") ? "&" : "?";
        return `${originalUrl}${separator}w=${w} ${w}w`;
      })
      .join(", ");
  }

  /**
   * Process product/service images for API response with lazy loading metadata
   */
  static processImagesForLazyLoad(images: string[]): Array<{
    original: string;
    thumbnail: string;
    placeholder: string;
    srcSet: string;
  }> {
    return images.map((img) => ({
      original: img,
      thumbnail: ImageHelper.getThumbnailUrl(img, 300, 300),
      placeholder: ImageHelper.getPlaceholder(),
      srcSet: ImageHelper.getSrcSet(img),
    }));
  }

  /**
   * Validate image URL (basic check)
   */
  static isValidImageUrl(url: string): boolean {
    if (!url) return false;
    const imageExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".svg",
      ".avif",
    ];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some((ext) => lowerUrl.includes(ext));
  }
}
