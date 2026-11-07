import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ROOT = 'plazo.id';
const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'admin', 'mail']);
const MAIN_ROBOTS_TXT = `# Robots.txt for Main Marketplace Platform
# Status: PLATFORM — Public Indexing Enabled

User-agent: *
Allow: /
Allow: /products
Allow: /services
Allow: /jobs
Allow: /register
Allow: /login
Disallow: /api/
Disallow: /admin/
Disallow: /_next/
Disallow: /seller/dashboard/
Disallow: /buyer/dashboard/
Disallow: /dashboard/
Disallow: /cart
Disallow: /checkout

Sitemap: https://${ROOT}/sitemap.xml
`;
const DISALLOW_ROBOTS_TXT = `User-agent: *
Disallow: /
`;

function normalizeHost(host: string | null): string {
  return (host ?? '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
}

function createRobotsResponse(content: string): NextResponse {
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}

function isMainDomain(hostname: string): boolean {
  return hostname === ROOT || hostname === `www.${ROOT}`;
}

function getTenantSubdomain(hostname: string): string | undefined {
  const suffix = `.${ROOT}`;
  if (!hostname.endsWith(suffix)) {
    return undefined;
  }

  const subdomain = hostname.slice(0, -suffix.length);
  if (!subdomain || subdomain.includes('.') || RESERVED_SUBDOMAINS.has(subdomain)) {
    return undefined;
  }

  return subdomain;
}

export async function GET(request: Request) {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const hostHeader = forwardedHost || request.headers.get('host');
  const host = (hostHeader ?? '').split(',')[0].trim().toLowerCase();
  const hostname = normalizeHost(host);

  if (isMainDomain(hostname)) {
    return createRobotsResponse(MAIN_ROBOTS_TXT);
  }

  if (!getTenantSubdomain(hostname)) {
    return createRobotsResponse(DISALLOW_ROBOTS_TXT);
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  try {
    const response = await fetch(`${apiUrl}/robots.txt`, {
      headers: {
        Host: host,
        'X-Forwarded-Host': host,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`[robots.txt] Backend returned status ${response.status}`);
      return createRobotsResponse(DISALLOW_ROBOTS_TXT);
    }

    return createRobotsResponse(await response.text());
  } catch (error) {
    console.error('[robots.txt] Failed to fetch from backend:', error);
    return createRobotsResponse(DISALLOW_ROBOTS_TXT);
  }
}
