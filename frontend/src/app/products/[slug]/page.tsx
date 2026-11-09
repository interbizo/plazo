import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import { resolveImageUrl } from "@/lib/image-url";
import ProductDetailClient, {
  type ProductDetail,
} from "./product-detail-client";

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://plazo.id").replace(/\/$/, "");
const MAX_DESCRIPTION_LENGTH = 160;

/** Hapus tag HTML agar deskripsi aman dipakai di metadata/JSON-LD. */
function stripHtml(input?: string): string {
  return (input || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  return `${input.slice(0, max - 1).trimEnd()}…`;
}

/** Ubah path gambar menjadi URL absolut (untuk OG image & JSON-LD). */
function toAbsoluteImageUrl(url?: string | null): string | undefined {
  const resolved = resolveImageUrl(url || "");
  if (!resolved) return undefined;
  if (resolved.startsWith("http://") || resolved.startsWith("https://")) return resolved;
  return `${BASE_URL}${resolved.startsWith("/") ? "" : "/"}${resolved}`;
}

async function getProduct(slug: string): Promise<ProductDetail | null> {
  try {
    const payload = await serverApi.getProductBySlug(slug);
    const product = payload?.product;
    return (product as ProductDetail) || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: "Produk Tidak Ditemukan - Plazo",
      robots: { index: false, follow: false },
    };
  }

  const plainDescription = stripHtml(product.description);
  const description = plainDescription
    ? truncate(plainDescription, MAX_DESCRIPTION_LENGTH)
    : `Beli ${product.name} di Plazo Marketplace.`;
  const image = toAbsoluteImageUrl(product.thumbnail || product.images?.[0]);
  const url = `/products/${product.slug || slug}`;

  return {
    title: product.name,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      title: product.name,
      description,
      url,
      images: image ? [{ url: image, alt: product.name }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const images = product.images?.length ? product.images : [];
  const imageUrls = images
    .map((img) => toAbsoluteImageUrl(img))
    .filter((url): url is string => Boolean(url));

  const activeVariants = product.variants?.filter((variant) => variant.isActive) || [];
  const availableStock = product.hasVariants
    ? activeVariants.reduce((total, variant) => total + (variant.stock || 0), 0)
    : product.stock;

  const plainDescription = stripHtml(product.description);
  const productUrl = `${BASE_URL}/products/${product.slug || slug}`;
  const productRating = Number(product.averageRating ?? 0);
  const productTotalReviews = Number(product.totalReviews ?? 0);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: plainDescription || undefined,
    image: imageUrls.length > 0 ? imageUrls : undefined,
    sku: product.id,
    category: product.category?.name,
    brand: {
      "@type": "Brand",
      name: product.tenant?.name || "Plazo",
    },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "IDR",
      availability:
        availableStock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: productUrl,
    },
    aggregateRating:
      productTotalReviews > 0 && productRating > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: productRating,
            reviewCount: productTotalReviews,
          }
        : undefined,
  };

  const breadcrumbItems: Array<{ name: string; item: string }> = [
    { name: "Beranda", item: `${BASE_URL}/` },
    { name: "Produk", item: `${BASE_URL}/products` },
  ];
  if (product.category?.parent) {
    breadcrumbItems.push({
      name: product.category.parent.name,
      item: `${BASE_URL}/products?categorySlug=${product.category.parent.slug || product.category.parent.id}`,
    });
  }
  if (product.category) {
    breadcrumbItems.push({
      name: product.category.name,
      item: `${BASE_URL}/products?categorySlug=${product.category.slug || product.category.id}`,
    });
  }
  breadcrumbItems.push({ name: product.name, item: productUrl });

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: entry.item,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ProductDetailClient product={product} />
    </>
  );
}
