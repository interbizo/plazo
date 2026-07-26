/**
 * SEO Configuration for Subdomain System
 * Prevents duplicate content and spam detection
 */

export const SEO_CONFIG = {
  // Main domain
  MAIN_DOMAIN: process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'plazo.id',
  
  // Minimum content requirements (Anti-Thin Content)
  MIN_DESCRIPTION_LENGTH: 300, // characters
  MIN_PRODUCT_DESCRIPTION: 50, // words per product
  MIN_PRODUCTS_REQUIRED: 1,
  
  // Meta tag limits
  MAX_TITLE_LENGTH: 60,
  MAX_DESCRIPTION_LENGTH: 160,
  
  // Sitemap configuration
  SITEMAP_URLS_PER_FILE: 5000,
  SITEMAP_CACHE_HOURS: 24,
  
  // Backlink configuration
  FOOTER_BACKLINK_TEXT: 'Direktori UMKM Indonesia by EHF Creative',
  CATEGORY_LINK_TEXT: 'Lihat {category} Lainnya',
};

/**
 * Generate dynamic title tag for subdomain
 * Format: [Business Name] - [Main Keyword] [City] | Plazo.id
 */
export function generateSubdomainTitle(
  businessName: string,
  mainKeyword: string,
  city: string
): string {
  const title = `${businessName} - ${mainKeyword} ${city} | EHF Creative`;
  return title.substring(0, SEO_CONFIG.MAX_TITLE_LENGTH);
}

/**
 * Generate unique meta description from seller description
 * Takes first 155 chars + CTA
 */
export function generateMetaDescription(description: string, businessName: string): string {
  const cleanDesc = description.replace(/<[^>]*>/g, '').trim();
  const truncated = cleanDesc.substring(0, 155);
  return `${truncated} Hubungi ${businessName} via WhatsApp sekarang.`;
}

/**
 * Generate canonical URL for subdomain
 */
export function generateCanonicalUrl(subdomain: string): string {
  return `https://${subdomain}.${SEO_CONFIG.MAIN_DOMAIN}/`;
}

/**
 * Check if store has minimum content requirements
 */
export function validateMinimumContent(store: {
  description?: string;
  products?: Array<{ name: string; description: string }>;
  address?: string;
  city?: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check description length
  if (!store.description || store.description.length < SEO_CONFIG.MIN_DESCRIPTION_LENGTH) {
    errors.push(`Deskripsi usaha minimal ${SEO_CONFIG.MIN_DESCRIPTION_LENGTH} karakter`);
  }

  // Check products
  if (!store.products || store.products.length < SEO_CONFIG.MIN_PRODUCTS_REQUIRED) {
    errors.push(`Minimal ${SEO_CONFIG.MIN_PRODUCTS_REQUIRED} produk/jasa harus ditambahkan`);
  }

  // Check address
  if (!store.city || !store.address) {
    errors.push('Alamat lengkap (kota & kecamatan) wajib diisi');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Extract main keyword from category or description
 */
export function extractMainKeyword(category: string, description: string): string {
  // Use category as primary keyword
  if (category) return category;
  
  // Fallback: extract first 3 meaningful words from description
  const words = description
    .replace(/<[^>]*>/g, '')
    .split(' ')
    .filter(w => w.length > 3)
    .slice(0, 3);
  
  return words.join(' ');
}
