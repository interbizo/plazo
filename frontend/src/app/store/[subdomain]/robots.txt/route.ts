import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

/**
 * Dynamic robots.txt for seller store subdomain.
 * Proxies to backend which checks subscription status.
 */
export async function GET() {
  try {
    const headersList = await headers();
    const host = headersList.get('host') || '';

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${apiUrl}/robots.txt`, {
      headers: {
        'Host': host,
        'X-Forwarded-Host': host,
      },
      next: { revalidate: 60 },
    });

    if (response.ok) {
      const robotsTxt = await response.text();
      return new NextResponse(robotsTxt, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      });
    }
  } catch (error) {
    console.error('[robots.txt] Failed to fetch from backend:', error);
  }

  // Fallback: disallow all (safe default for unverified stores)
  const fallback = `# Robots.txt (fallback - subscription not verified)
User-agent: *
Disallow: /
`;

  return new NextResponse(fallback, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
