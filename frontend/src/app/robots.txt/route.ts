import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Force dynamic rendering (this route depends on request headers)
export const dynamic = 'force-dynamic';

/**
 * Dynamic robots.txt — proxies to backend SeoService.
 */
export async function GET(request: Request) {
  try {
    const headersList = headers();
    const host = (headersList as any).get?.('host') || new URL(request.url).host || 'plazo.id';

    // Fetch dynamic robots.txt from backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiUrl}/robots.txt`, {
      headers: {
        'Host': host,
        'X-Forwarded-Host': host,
      },
      cache: 'no-store',
    });

    if (response.ok) {
      const robotsTxt = await response.text();
      return new NextResponse(robotsTxt, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      });
    }
  } catch (error) {
    console.error('[robots.txt] Failed to fetch from backend:', error);
  }

  // Fallback: allow main pages, block private
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://plazo.id';
  const fallback = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /seller/dashboard/
Disallow: /dashboard/
Disallow: /_next/

Sitemap: ${baseUrl}/sitemap.xml
`;

  return new NextResponse(fallback, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
