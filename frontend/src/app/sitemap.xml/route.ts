import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://plazo.id';

/**
 * Dynamic Sitemap for main domain (plazo.id)
 * Includes: static pages + all published products + all published services + jobs + articles
 * Only products/services from ACTIVE tenants with publishToMarketplace=true
 */
export async function GET() {
  try {
    const [productsRes, servicesRes, jobsRes, articlesRes] = await Promise.all([
      fetch(`${API_URL}/api/public/products?limit=500&sortBy=newest`, {
        next: { revalidate: 3600 },
      }).catch(() => null),
      fetch(`${API_URL}/api/public/services?limit=500&sortBy=newest`, {
        next: { revalidate: 3600 },
      }).catch(() => null),
      fetch(`${API_URL}/api/public/jobs?limit=200&status=OPEN`, {
        next: { revalidate: 3600 },
      }).catch(() => null),
      fetch(`${API_URL}/api/public/articles?limit=500`, {
        next: { revalidate: 3600 },
      }).catch(() => null),
    ]);

    let products: any[] = [];
    let services: any[] = [];
    let jobs: any[] = [];
    let articles: any[] = [];

    if (productsRes?.ok) {
      const data = await productsRes.json();
      products = data?.data || [];
    }
    if (servicesRes?.ok) {
      const data = await servicesRes.json();
      services = data?.data || [];
    }
    if (jobsRes?.ok) {
      const data = await jobsRes.json();
      jobs = data?.data || [];
    }
    if (articlesRes?.ok) {
      const data = await articlesRes.json();
      articles = data?.data || [];
    }

    const now = new Date().toISOString();
    const urls: string[] = [];

    // Static pages
    urls.push(buildUrl(`${BASE_URL}`, now, 'daily', '1.0'));
    urls.push(buildUrl(`${BASE_URL}/products`, now, 'hourly', '0.9'));
    urls.push(buildUrl(`${BASE_URL}/services`, now, 'hourly', '0.9'));
    urls.push(buildUrl(`${BASE_URL}/jobs`, now, 'hourly', '0.8'));
    urls.push(buildUrl(`${BASE_URL}/articles`, now, 'daily', '0.8'));
    urls.push(buildUrl(`${BASE_URL}/register`, now, 'monthly', '0.6'));
    urls.push(buildUrl(`${BASE_URL}/login`, now, 'monthly', '0.5'));

    // Product detail pages
    for (const product of products) {
      if (!product.slug) continue;
      const lastmod = safeDate(product.updatedAt || product.createdAt);
      const imageUrl = product.thumbnail || product.images?.[0];
      urls.push(buildUrl(
        `${BASE_URL}/products/${encodeURIComponent(product.slug)}`,
        lastmod,
        'weekly',
        '0.8',
        imageUrl ? { loc: ensureAbsoluteUrl(imageUrl), title: product.name } : undefined,
      ));
    }

    // Service detail pages
    for (const service of services) {
      if (!service.slug) continue;
      const lastmod = safeDate(service.updatedAt || service.createdAt);
      const imageUrl = service.thumbnail || service.gallery?.[0];
      urls.push(buildUrl(
        `${BASE_URL}/services/${encodeURIComponent(service.slug)}`,
        lastmod,
        'weekly',
        '0.8',
        imageUrl ? { loc: ensureAbsoluteUrl(imageUrl), title: service.name } : undefined,
      ));
    }

    // Job pages
    for (const job of jobs) {
      if (!job.slug) continue;
      const lastmod = safeDate(job.updatedAt || job.createdAt);
      urls.push(buildUrl(
        `${BASE_URL}/jobs/${encodeURIComponent(job.slug)}`,
        lastmod,
        'daily',
        '0.7',
      ));
    }

    // Article pages
    for (const article of articles) {
      if (!article.slug) continue;
      const lastmod = safeDate(article.updatedAt || article.publishedAt || article.createdAt);
      const imageUrl = article.thumbnail || article.ogImage;
      urls.push(buildUrl(
        `${BASE_URL}/articles/${encodeURIComponent(article.slug)}`,
        lastmod,
        'weekly',
        '0.7',
        imageUrl ? { loc: ensureAbsoluteUrl(imageUrl), title: article.title } : undefined,
      ));
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>${BASE_URL}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n</urlset>`;
    return new NextResponse(fallback, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }
}

function buildUrl(
  loc: string,
  lastmod: string,
  changefreq: string,
  priority: string,
  image?: { loc: string; title: string },
): string {
  let entry = `<url>\n<loc>${escapeXml(loc)}</loc>\n<lastmod>${lastmod}</lastmod>\n<changefreq>${changefreq}</changefreq>\n<priority>${priority}</priority>`;
  if (image) {
    entry += `\n<image:image>\n<image:loc>${escapeXml(image.loc)}</image:loc>\n<image:title>${escapeXml(image.title)}</image:title>\n</image:image>`;
  }
  entry += '\n</url>';
  return entry;
}

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function safeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return new Date().toISOString();
  try {
    return new Date(dateStr).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function ensureAbsoluteUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Relative URL — prepend API URL for uploaded files
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.plazo.id';
  return `${apiUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}
