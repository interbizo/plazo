import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const FREE_PLANS = ['FREE'];

/**
 * Dynamic Sitemap for store subdomains
 * Only generates sitemap for PAID subscription plans with SEO active
 * FREE plan stores get an empty sitemap (no indexing)
 */
export async function GET(
  _request: Request,
  { params }: { params: { subdomain: string } }
) {
  const subdomain = params.subdomain;

  try {
    // Fetch store data to check subscription
    const storeRes = await fetch(`${API_URL}/api/public/store/${subdomain}`, {
      next: { revalidate: 1800 },
    }).catch(() => null);

    if (!storeRes || !storeRes.ok) {
      return emptyResponse();
    }

    const storeData = await storeRes.json();
    const store = storeData?.store;

    if (!store) {
      return emptyResponse();
    }

    // Check subscription — only paid plans get sitemap
    const plan = store.subscriptionPlan || 'FREE';
    if (FREE_PLANS.includes(plan)) {
      return emptyResponse();
    }

    // Check if SEO is active
    if (!store.isSeoActive) {
      return emptyResponse();
    }

    const baseUrl = `https://plazo.id/store/${subdomain}`;
    const now = new Date().toISOString();

    // Get products and services from store data
    const products: any[] = storeData.products || [];
    const services: any[] = storeData.services || [];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/products</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/services</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/portfolio</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;

    // Product pages
    for (const product of products) {
      if (!product.slug) continue;
      const lastmod = product.updatedAt || product.createdAt || now;
      xml += `  <url>
    <loc>${baseUrl}/products/${product.slug}</loc>
    <lastmod>${new Date(lastmod).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>`;
      if (product.thumbnail || product.images?.[0]) {
        xml += `
    <image:image>
      <image:loc>${escapeXml(product.thumbnail || product.images[0])}</image:loc>
      <image:title>${escapeXml(product.name)}</image:title>
    </image:image>`;
      }
      xml += `
  </url>
`;
    }

    // Service pages
    for (const service of services) {
      if (!service.slug) continue;
      const lastmod = service.updatedAt || service.createdAt || now;
      xml += `  <url>
    <loc>${baseUrl}/services/${service.slug}</loc>
    <lastmod>${new Date(lastmod).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>`;
      if (service.thumbnail || service.gallery?.[0]) {
        xml += `
    <image:image>
      <image:loc>${escapeXml(service.thumbnail || service.gallery[0])}</image:loc>
      <image:title>${escapeXml(service.name)}</image:title>
    </image:image>`;
      }
      xml += `
  </url>
`;
    }

    xml += `</urlset>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error(`Error generating sitemap for store ${subdomain}:`, error);
    return emptyResponse();
  }
}

function emptyResponse() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
