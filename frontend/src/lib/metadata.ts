import { Metadata } from "next";
import { headers } from "next/headers";
import { getSubdomainFromHostname } from "./domain";

interface TenantMetadata {
  name: string;
  description?: string;
  logo?: string;
  banner?: string;
  favicon?: string;
  metaTitle?: string;
  metaDescription?: string;
  subdomain: string;
}

/**
 * Fetch tenant data from backend for metadata generation
 */
async function fetchTenantData(subdomain: string): Promise<TenantMetadata | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/api/public/store/${subdomain}`, {
      next: { revalidate: 60 }, // Cache for 1 minute (balance between freshness and performance)
    });

    if (!response.ok) {
      return null;
    }

    const text = await response.text();
    if (!text || text.trim() === '') {
      console.error("Empty response from tenant API");
      return null;
    }

    try {
      const data = JSON.parse(text);
      return data?.store || null;
    } catch (parseError) {
      console.error("Failed to parse tenant metadata JSON:", parseError);
      return null;
    }
  } catch (error) {
    console.error("Failed to fetch tenant metadata:", error);
    return null;
  }
}

/**
 * Generate dynamic metadata based on subdomain
 * Use this in layout.tsx or page.tsx with generateMetadata()
 */
export async function generateDynamicMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const subdomain = getSubdomainFromHostname(host);

  // Main domain - use default metadata with full SEO
  if (!subdomain) {
    return {
      title: {
        default: "Plazo — Marketplace SaaS Platform Indonesia",
        template: "%s | Plazo Marketplace",
      },
      description:
        "Platform marketplace all-in-one untuk produk, jasa, dan freelance Indonesia. Jual beli online, cari freelancer, dan kelola toko digital Anda.",
      keywords: [
        "marketplace indonesia",
        "freelance indonesia",
        "jual beli online",
        "jasa online",
        "toko online",
        "UMKM digital",
        "marketplace SaaS",
      ],
      icons: {
        icon: "/favicon.ico",
      },
      metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://plazo.id"),
      alternates: {
        canonical: "/",
      },
      openGraph: {
        type: "website",
        locale: "id_ID",
        siteName: "Plazo Marketplace",
        title: "Plazo — Marketplace SaaS Platform Indonesia",
        description:
          "Platform marketplace all-in-one untuk produk, jasa, dan freelance Indonesia.",
        url: "/",
      },
      twitter: {
        card: "summary_large_image",
        title: "Plazo — Marketplace SaaS Platform Indonesia",
        description:
          "Platform marketplace all-in-one untuk produk, jasa, dan freelance Indonesia.",
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
          "max-video-preview": -1,
        },
      },
      verification: {
        google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || undefined,
      },
    };
  }

  // Seller subdomain - fetch tenant data
  const tenant = await fetchTenantData(subdomain);

  if (!tenant) {
    // Fallback if tenant not found
    return {
      title: "Store Not Found",
      description: "The requested store could not be found.",
      icons: {
        icon: "/favicon.ico",
      },
    };
  }

  const title = tenant.metaTitle || `${tenant.name} - Toko Online`;
  const description =
    tenant.metaDescription ||
    tenant.description ||
    `Belanja produk dan jasa dari ${tenant.name}. Toko online terpercaya di Plazo Marketplace.`;
  const ogImage = tenant.banner || tenant.logo || "/og-image.png";
  const faviconUrl = tenant.favicon || tenant.logo || "/favicon.ico";
  const canonicalUrl = `https://${subdomain}.${process.env.NEXT_PUBLIC_BASE_DOMAIN || "plazo.id"}`;

  return {
    title: {
      default: title,
      template: `%s | ${tenant.name}`,
    },
    description,
    keywords: [tenant.name, "toko online", "marketplace", subdomain, "belanja online"],
    icons: {
      icon: faviconUrl,
      shortcut: faviconUrl,
      apple: faviconUrl,
    },
    metadataBase: new URL(canonicalUrl),
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      locale: "id_ID",
      siteName: tenant.name,
      title,
      description,
      url: canonicalUrl,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: tenant.name }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

/**
 * Get current tenant data (client-side)
 */
export function getCurrentSubdomainFromWindow(): string | null {
  if (typeof window === "undefined") return null;
  return getSubdomainFromHostname(window.location.hostname);
}
