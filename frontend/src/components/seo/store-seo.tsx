import Head from 'next/head';

interface StoreSEOProps {
  store: {
    name: string;
    subdomain: string;
    description?: string;
    tagline?: string;
    logo?: string;
    banner?: string;
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    ogImage?: string;
    address?: string;
    contactPhone?: string;
    contactWhatsapp?: string;
    isSeoActive?: boolean; // New field for SEO control
    isVerified?: boolean;
  };
  category?: string;
  city?: string;
  isActive?: boolean;
}

/**
 * Detect if current page is accessed via subdomain
 * Returns true if hostname is like: tokobudi.plazo.id
 * Returns false if hostname is like: plazo.id or localhost
 */
function isSubdomainAccess(): boolean {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'plazo.id';
  
  // Check if it's localhost or IP
  if (hostname === 'localhost' || hostname === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return false;
  }
  
  // Check if it's the main domain
  if (hostname === mainDomain) {
    return false;
  }
  
  // Check if it's a subdomain (has more parts than main domain)
  const hostParts = hostname.split('.');
  const mainParts = mainDomain.split('.');
  
  return hostParts.length > mainParts.length && hostname.endsWith(`.${mainDomain}`);
}

export function StoreSEO({ store, category, city, isActive = true }: StoreSEOProps) {
  const isSubdomain = isSubdomainAccess();
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'plazo.id';
  const mainDomainUrl = process.env.NEXT_PUBLIC_MAIN_DOMAIN_URL || `https://${baseDomain}`;
  
  // Generate dynamic title
  const title = store.metaTitle || 
    `${store.name}${category ? ` - ${category}` : ''}${city ? ` ${city}` : ''} | Plazo Marketplace`;

  // Generate dynamic description (max 160 chars)
  const description = store.metaDescription || 
    (store.description 
      ? store.description.substring(0, 155) + '...'
      : `${store.name} - ${store.tagline || 'UMKM Terpercaya'}. Hubungi kami sekarang!`
    );

  // For SEO, use the actual subdomain URL instead of /store/ path
  // This ensures search engines index the actual accessible URL
  const canonicalUrl = `https://${store.subdomain}.${baseDomain}`;

  // OG Image
  const ogImage = store.ogImage || store.banner || store.logo || `${mainDomainUrl}/default-og.png`;

  // SEO Control Logic:
  // Subdomain URLs are indexed if SEO is active and store is verified
  // This allows each store to have its own indexed domain
  let robotsContent = 'noindex, nofollow';
  
  if (isSubdomain && store.isSeoActive && store.isVerified && isActive) {
    robotsContent = 'index, follow, max-image-preview:large';
  }

  // Schema.org LocalBusiness
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: store.name,
    description: description,
    url: canonicalUrl,
    logo: store.logo,
    image: ogImage,
    ...(store.address && { address: store.address }),
    ...(store.contactPhone && { telephone: store.contactPhone }),
    ...(store.contactWhatsapp && { 
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: store.contactWhatsapp,
        contactType: 'Customer Service',
        availableLanguage: 'Indonesian'
      }
    }),
    isPartOf: {
      '@type': 'WebSite',
      name: 'Plazo Marketplace',
      url: mainDomainUrl,
      description: 'Direktori UMKM Indonesia'
    }
  };

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {store.metaKeywords && <meta name="keywords" content={store.metaKeywords} />}
      
      {/* Canonical - Point to subdomain URL */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Robots - Index subdomain if SEO active and verified */}
      <meta name="robots" content={robotsContent} />
      
      {/* Additional meta for non-indexed pages */}
      {robotsContent.includes('noindex') && (
        <>
          <meta name="googlebot" content="noindex, nofollow" />
          <meta name="bingbot" content="noindex, nofollow" />
        </>
      )}
      
      {/* Open Graph - Use canonical URL */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="Plazo Marketplace" />
      <meta property="og:locale" content="id_ID" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* Favicon */}
      <link rel="icon" type="image/png" href={store.logo || `${mainDomainUrl}/favicon.png`} />
      
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      
      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <meta name="seo-debug" content={`subdomain:${isSubdomain}, robots:${robotsContent}, canonical:${canonicalUrl}`} />
      )}
    </Head>
  );
}
