/**
 * Domain utilities for multi-tenant subdomain routing.
 *
 * Production: seller1.plazo.id (real subdomain)
 * Development: localhost:3000/store/seller1 (path-based fallback)
 */

const BASE_DOMAIN =
  process.env.NEXT_PUBLIC_BASE_DOMAIN?.split(",")[0]?.trim() ||
  "plazo.id";

const CONFIGURED_BASE_DOMAINS = (
  process.env.NEXT_PUBLIC_BASE_DOMAIN ||
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ||
  "plazo.id"
)
  .split(",")
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean)
  .sort((a, b) => b.length - a.length);

const RESERVED_SUBDOMAINS = new Set([
  "www",
  "api",
  "admin",
  "mail",
  "smtp",
  "ftp",
  "ns1",
  "ns2",
]);

function getRegisteredDomain(hostname: string): string {
  const parts = hostname.split(".").filter(Boolean);
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join(".");
}

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().split(":")[0].replace(/\.$/, "");
}

export function getSubdomainFromHostname(hostname: string): string | null {
  const normalized = normalizeHostname(hostname);

  if (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    /^\d+\.\d+\.\d+\.\d+$/.test(normalized)
  ) {
    return null;
  }

  const hostParts = normalized.split(".");

  for (const baseDomain of CONFIGURED_BASE_DOMAINS) {
    if (normalized === baseDomain) {
      return null;
    }

    if (!normalized.endsWith(`.${baseDomain}`)) {
      continue;
    }

    const subdomain = normalized.slice(0, -(baseDomain.length + 1));
    if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) {
      return null;
    }

    return subdomain;
  }

  if (hostParts.length < 3) {
    return null;
  }

  const subdomain = hostParts.slice(0, -2).join(".");
  if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) {
    return null;
  }

  return subdomain;
}

export function getCurrentSubdomain(): string | null {
  if (typeof window === "undefined") return null;
  return getSubdomainFromHostname(window.location.hostname);
}

/**
 * Check if we're running on localhost (development)
 */
function isLocalhost(): boolean {
  if (typeof window !== "undefined") {
    return (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    );
  }
  return BASE_DOMAIN.includes("localhost");
}

/**
 * Get the base domain
 */
export function getBaseDomain(): string {
  if (typeof window === "undefined") {
    return BASE_DOMAIN;
  }

  const hostname = window.location.hostname;
  const port = window.location.port;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return port ? `${hostname}:${port}` : hostname;
  }

  if (BASE_DOMAIN && hostname.endsWith(BASE_DOMAIN)) {
    return BASE_DOMAIN;
  }

  return getRegisteredDomain(hostname);
}

/**
 * Get the display URL for a subdomain (no protocol)
 * Used for showing the URL to users.
 *
 * Now uses subfolder approach: "/store/seller1" for both dev and production
 */
export function getSubdomainUrl(subdomain: string): string {
  return `/store/${subdomain}`;
}

/**
 * Get the full navigable link for a subdomain (with protocol).
 * Used for <a href="..."> to navigate to seller's store.
 *
 * Now uses subfolder approach for both dev and production
 */
export function getSubdomainLink(subdomain: string): string {
  const protocol =
    typeof window !== "undefined" ? window.location.protocol : "https:";
  const base =
    typeof window !== "undefined"
      ? window.location.host
      : `${getBaseDomain()}`;
  return `${protocol}//${base}/store/${subdomain}`;
}

/**
 * Get a product URL on the seller's store.
 *
 * Now uses subfolder: "/store/seller1/products/laptop-gaming"
 */
export function getStoreProductUrl(
  subdomain: string,
  slug: string,
): string {
  return `/store/${subdomain}/products/${slug}`;
}

/**
 * Get a service URL on the seller's store.
 *
 * Now uses subfolder: "/store/seller1/services/service-name"
 */
export function getStoreServiceUrl(
  subdomain: string,
  slug: string,
): string {
  return `/store/${subdomain}/services/${slug}`;
}

export function isCurrentSellerSubdomain(subdomain: string): boolean {
  if (typeof window === "undefined") return false;

  return getCurrentSubdomain() === subdomain.toLowerCase();
}

export function getStorefrontPath(subdomain: string, path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (isCurrentSellerSubdomain(subdomain)) {
    return normalizedPath;
  }

  return `/store/${subdomain}${normalizedPath === "/" ? "" : normalizedPath}`;
}
