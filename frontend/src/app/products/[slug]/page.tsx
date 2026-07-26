"use client";

import { useEffect, useState, startTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { marketplaceApi } from "@/services/marketplace.service";
import { chatApi } from "@/services/chat.service";
import { getSubdomainLink, getSubdomainUrl } from "@/lib/domain";
import { useAuthStore } from "@/stores/auth.store";
import { formatPrice, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SafeHtml } from "@/components/ui/safe-html";
import { HomeButton } from "@/components/shared/home-button";
import { ShareButton } from "@/components/shared/share-button";
import {
  Star,
  Store,
  ArrowLeft,
  Package,
  Tag,
  ShoppingBag,
  CheckCircle,
  Zap,
  MessageCircle,
  MessageSquare,
  Phone,
} from "lucide-react";
import { ReviewSection } from "@/components/review-section";
import toast from "react-hot-toast";

interface ProductTenant {
  id: string;
  name: string;
  subdomain: string;
  logo?: string;
  isVerified?: boolean;
  contactWhatsapp?: string;
  subscriptionPlan?: string;
  owner?: {
    id: string;
    sellerProfile?: {
      averageRating?: number | null;
      totalReviews?: number | null;
    };
  };
}

interface VariantOption {
  optionName: string;
  optionValue: string;
}

interface ProductVariant {
  id: string;
  name: string;
  sku?: string;
  price?: number;
  stock: number;
  isActive: boolean;
  options: VariantOption[];
}

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  comparePrice?: number;
  stock: number;
  images: string[];
  thumbnail?: string;
  tags?: string[];
  category?: { 
    id: string; 
    name: string; 
    slug?: string;
    parentId?: string | null;
    parent?: {
      id: string;
      name: string;
      slug?: string;
    } | null;
  };
  tenant?: ProductTenant;
  createdAt: string;
  productType?: "PHYSICAL" | "DIGITAL";
  isDigital?: boolean;
  hasVariants?: boolean;
  variants?: ProductVariant[];
  averageRating?: number;
  totalReviews?: number;
  totalSales?: number;
  digitalDeliveryMethod?: string;
  accessInstructions?: string;
  downloadLimit?: number;
  downloadExpiry?: number;
  viewCount?: number;
}

function formatVariantLabel(variant: ProductVariant | null) {
  if (!variant) return "";
  const options = variant.options?.map((option) => option.optionValue).join(", ");
  return options ? `${variant.name} (${options})` : variant.name;
}

function safeNumber(value: number | null | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { isAuthenticated, user } = useAuthStore();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        const { data } = await marketplaceApi.getProductBySlug(slug);
        const productData = "product" in data ? data.product : data;
        if (!productData) {
          router.push("/products");
          return;
        }

        startTransition(() => {
          setProduct(productData as ProductDetail);
        });

        // Track view (fire-and-forget, non-blocking)
        marketplaceApi.trackProductView((productData as ProductDetail).id).catch(() => {});
      } catch (error) {
        console.error("Failed to fetch product:", error);
        toast.error("Produk tidak ditemukan");
        router.push("/products");
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) fetchProduct();
  }, [slug, router]);

  const handleContactSeller = async () => {
    if (!product?.tenant?.owner?.id || !product?.tenant?.id) {
      toast.error("Data toko belum lengkap");
      return;
    }
    if (!isAuthenticated) {
      toast.error("Silakan login terlebih dahulu");
      router.push(`/login?returnUrl=/products/${slug}`);
      return;
    }
    if (user?.id === product.tenant.owner.id) {
      toast.error("Anda tidak bisa menghubungi toko milik sendiri");
      return;
    }

    try {
      const variantLabel = formatVariantLabel(selectedVariant);
      const currentPrice = selectedVariant?.price || product.price;
      const { data } = await chatApi.openRoom({
        tenantId: product.tenant.id,
        targetUserId: product.tenant.owner.id,
        productId: product.id,
        itemTitle: product.name,
        variantName: variantLabel || undefined,
        quantity: quantity,
        price: currentPrice,
      });
      const roomId = data?.room?.id;
      if (!roomId) {
        throw new Error("Room tidak ditemukan");
      }
      router.push(
        `${user?.role === "SELLER" ? "/seller/dashboard/chat" : "/dashboard/chat"}?room=${roomId}`,
      );
    } catch {
      toast.error("Gagal membuka chat");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!product) return null;

  const images = product.images?.length > 0 ? product.images : [];
  const tenant = product.tenant;
  const productRating = safeNumber(product.averageRating);
  const productTotalReviews = safeNumber(product.totalReviews);
  const sellerRating = safeNumber(tenant?.owner?.sellerProfile?.averageRating);
  const sellerTotalReviews = safeNumber(tenant?.owner?.sellerProfile?.totalReviews);
  const activeVariants = product.variants?.filter((variant) => variant.isActive) || [];
  const availableStock = product.hasVariants
    ? activeVariants.reduce((total, variant) => total + (variant.stock || 0), 0)
    : product.stock;
  const selectedVariantLabel = formatVariantLabel(selectedVariant);
  const canShowWhatsapp =
    !!tenant?.contactWhatsapp &&
    !!tenant.subscriptionPlan &&
    tenant.subscriptionPlan !== "FREE";
  const whatsappHref = canShowWhatsapp
    ? `https://wa.me/${String(tenant.contactWhatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(
        `Halo, saya ingin beli produk "${product.name}".${selectedVariantLabel ? `\nVariant: ${selectedVariantLabel}` : ""}\nJumlah: ${quantity}`,
      )}`
    : "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Home Button */}
      <div className="mb-4">
        <HomeButton variant="minimal" />
      </div>
      
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/products" className="flex items-center gap-1 hover:text-blue-600">
          <ArrowLeft className="h-3.5 w-3.5" />
          Produk
        </Link>
        {product.category && (
          <>
            {/* Show parent category if exists */}
            {product.category.parent && (
              <>
                <span>/</span>
                <Link
                  href={`/products?categorySlug=${product.category.parent.slug || product.category.parent.id}`}
                  className="hover:text-blue-600"
                >
                  {product.category.parent.name}
                </Link>
              </>
            )}
            {/* Show current category (could be parent or subcategory) */}
            <span>/</span>
            <Link
              href={`/products?categorySlug=${product.category.slug || product.category.id}`}
              className="hover:text-blue-600"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="truncate text-gray-900">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
            {images.length > 0 ? (
              <Image
                src={images[selectedImage]}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <ShoppingBag className="h-20 w-20 text-gray-300" />
              </div>
            )}
            {availableStock <= 0 && (
              <div className="absolute left-3 top-3 rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white">
                Stok Habis
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {images.map((img, index) => (
                <button
                  key={img + index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                    index === selectedImage ? "border-blue-500" : "border-gray-200"
                  }`}
                >
                  <Image src={img} alt="" fill className="object-cover" sizes="64px" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {product.category && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {product.category.parent && (
                <>
                  <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                    {product.category.parent.name}
                  </span>
                  <span className="text-gray-400">›</span>
                </>
              )}
              <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                {product.category.name}
              </span>
            </div>
          )}

          <h1 className="text-2xl font-bold leading-tight text-gray-900">{product.name}</h1>

          {tenant && (
            <Link
              href={getSubdomainLink(tenant.subdomain)}
              className="mt-3 flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
            >
              {tenant.logo ? (
                <Image src={tenant.logo} alt={tenant.name} width={24} height={24} className="rounded-full" />
              ) : (
                <Store className="h-5 w-5 text-gray-400" />
              )}
              <span className="font-medium">{tenant.name}</span>
              {tenant.isVerified && <CheckCircle className="h-3.5 w-3.5 text-blue-500" />}
            </Link>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              {productTotalReviews > 0 ? (
                <>
                  <span className="font-medium">{productRating.toFixed(1)}</span>
                  <span>({productTotalReviews} ulasan)</span>
                </>
              ) : (
                <span>Belum ada ulasan</span>
              )}
            </span>
            {(product.totalSales ?? 0) > 0 && <span>{product.totalSales} terjual</span>}
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {product.viewCount ?? 0} dilihat
            </span>
          </div>

          <div className="mt-4">
            <p className="text-3xl font-bold text-blue-600">
              {formatPrice(selectedVariant?.price || product.price)}
            </p>
            {!product.hasVariants &&
              product.comparePrice &&
              product.comparePrice > product.price && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm text-gray-400 line-through">
                    {formatPrice(product.comparePrice)}
                  </span>
                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-500">
                    -{Math.round((1 - product.price / product.comparePrice) * 100)}%
                  </span>
                </div>
              )}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button variant="outline" size="lg" onClick={handleContactSeller} className="w-full">
              <MessageCircle className="mr-2 h-4 w-4" />
              Hubungi Penjual
            </Button>
            {canShowWhatsapp && (
              <a href={whatsappHref} target="_blank" rel="noreferrer">
                  <Button size="lg" className="w-full bg-green-600 hover:bg-green-700">
                    <Phone className="mr-2 h-4 w-4" />
                  Beli via WhatsApp
                  </Button>
                </a>
              )}
          </div>

          {/* Share Button */}
          <div className="mt-3">
            <ShareButton
              url={typeof window !== "undefined" ? window.location.href : ""}
              title={product.name}
              description={product.description?.substring(0, 160) || ""}
              image={product.thumbnail || product.images?.[0] || ""}
              variant="default"
            />
          </div>

          {product.isDigital && (
            <div className="mt-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                <Zap className="h-3 w-3" />
                Produk Digital
              </span>
            </div>
          )}

          {product.isDigital && product.digitalDeliveryMethod && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-blue-900">Metode Pengiriman Digital</h3>
              <p className="text-sm text-blue-700">{product.digitalDeliveryMethod}</p>
              {product.downloadLimit && (
                <p className="mt-1 text-xs text-blue-600">Download limit: {product.downloadLimit}x</p>
              )}
              {product.downloadExpiry && (
                <p className="text-xs text-blue-600">Berlaku: {product.downloadExpiry} hari</p>
              )}
              {product.accessInstructions && (
                <p className="mt-2 text-xs text-blue-600">{product.accessInstructions}</p>
              )}
            </div>
          )}

          {product.hasVariants && activeVariants.length > 0 && (
            <div className="mt-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Pilih Variant</h3>
              <div className="grid grid-cols-2 gap-2">
                {activeVariants.map((variant) => {
                  const isSelected = selectedVariant?.id === variant.id;
                  const isOutOfStock = variant.stock <= 0;

                  return (
                    <button
                      key={variant.id}
                      onClick={() => !isOutOfStock && setSelectedVariant(variant)}
                      disabled={isOutOfStock}
                      className={`relative rounded-lg border-2 p-3 text-left transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : isOutOfStock
                            ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-50"
                            : "border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-900">{variant.name}</div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-xs font-semibold text-blue-600">
                          {formatPrice(variant.price || product.price)}
                        </span>
                        <span className={`text-xs ${isOutOfStock ? "text-red-600" : "text-gray-500"}`}>
                          {isOutOfStock ? "Habis" : `Stok: ${variant.stock}`}
                        </span>
                      </div>
                      {variant.options?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {variant.options.map((option, index) => (
                            <span
                              key={`${variant.id}-${index}`}
                              className="rounded border border-gray-200 bg-white px-2 py-0.5 text-xs"
                            >
                              {option.optionValue}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-gray-400" />
            <span className={availableStock > 0 ? "text-green-600" : "text-red-600"}>
              {product.hasVariants
                ? availableStock > 0
                  ? `Total stok variant: ${availableStock}`
                  : "Semua variant habis"
                : availableStock > 0
                  ? `Stok: ${availableStock}`
                  : "Stok Habis"}
            </span>
          </div>

          {availableStock > 0 && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center rounded-lg border border-gray-300">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-50"
                  >
                    -
                  </button>
                  <span className="w-12 text-center text-sm font-medium">{quantity}</span>
                  <button
                    onClick={() =>
                      setQuantity(
                        Math.min(
                          product.hasVariants && selectedVariant ? selectedVariant.stock : availableStock,
                          quantity + 1,
                        ),
                      )
                    }
                    className="px-3 py-2 text-gray-600 hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm text-gray-500">
                  Estimasi nilai:{" "}
                  <span className="font-semibold text-gray-900">
                    {formatPrice((selectedVariant?.price || product.price) * quantity)}
                  </span>
                </span>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900">
                Transaksi dilakukan manual melalui chat internal atau WhatsApp seller premium.
                {selectedVariantLabel ? ` Variant terpilih: ${selectedVariantLabel}.` : ""}
                {` Jumlah minat: ${quantity}.`}
              </div>

              {/* Chat Button - Show for internal products or seller products */}
              {tenant?.subdomain && (
                <Link
                  href={`/dashboard/chat?openChat=true&tenantId=${tenant.id}&targetUserId=${tenant.owner?.id}&productId=${product.id}&itemTitle=${encodeURIComponent(product.name)}&price=${selectedVariant?.price || product.price}&quantity=${quantity}${selectedVariant ? `&variantName=${encodeURIComponent(selectedVariant.name)}` : ""}`}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  <MessageSquare className="h-4 w-4" />
                  {tenant.subdomain === 'platform' ? 'Chat Admin' : 'Chat Penjual'}
                </Link>
              )}
            </div>
          )}

          {tenant?.subdomain && (
            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <p className="mb-2 text-xs text-gray-500">Produk ini dijual oleh</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {tenant.logo ? (
                    <Image src={tenant.logo} alt={tenant.name} width={32} height={32} className="rounded-full" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                      <Store className="h-4 w-4 text-blue-600" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{tenant.name}</p>
                    <p className="text-xs text-gray-400">{getSubdomainUrl(tenant.subdomain)}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                      <Star
                        className={`h-3.5 w-3.5 ${
                          sellerTotalReviews > 0
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                      {sellerTotalReviews > 0
                        ? `${sellerRating.toFixed(1)} (${sellerTotalReviews} ulasan seller)`
                        : "Belum ada ulasan"}
                    </p>
                  </div>
                </div>
                <Link
                  href={getSubdomainLink(tenant.subdomain)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Kunjungi Toko
                </Link>
              </div>
            </div>
          )}

          {(product.tags?.length ?? 0) > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-gray-400" />
              {product.tags!.map((tag) => (
                <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 border-t pt-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Deskripsi Produk</h2>
            <SafeHtml html={product.description} className="text-gray-600" />
          </div>

          <p className="mt-4 text-xs text-gray-400">Ditambahkan pada {formatDate(product.createdAt)}</p>
        </div>
      </div>

      {product.id && <ReviewSection sellerId={tenant?.owner?.id} productId={product.id} />}
    </div>
  );
}
