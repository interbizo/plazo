"use client";

import { useEffect, useState, startTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { marketplaceApi } from "@/services/marketplace.service";
import { chatApi } from "@/services/chat.service";
import { useAuthStore } from "@/stores/auth.store";
import { formatPrice, formatDate } from "@/lib/utils";
import { createWhatsAppCheckoutUrl } from "@/lib/whatsapp-checkout";
import { useCurrentPageUrl } from "@/hooks/use-current-page-url";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SafeHtml } from "@/components/ui/safe-html";
import { ShareButton } from "@/components/shared/share-button";
import {
  Star,
  Store,
  ArrowLeft,
  Package,
  Tag,
  ShoppingBag,
  CheckCircle,
  MessageCircle,
  Phone,
} from "lucide-react";
import { ReviewSection } from "@/components/review-section";
import { getStorefrontPath } from "@/lib/domain";
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
  stock: number;
  images: string[];
  thumbnail?: string;
  tags?: string[];
  category?: { id: string; name: string };
  tenant?: ProductTenant;
  createdAt: string;
  hasVariants?: boolean;
  variants?: ProductVariant[];
  averageRating?: number;
  totalReviews?: number;
  totalSales?: number;
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

export default function StoreProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const subdomain = params.subdomain as string;
  const slug = params.slug as string;
  const { isAuthenticated, user } = useAuthStore();
  const currentPageUrl = useCurrentPageUrl();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [storeName, setStoreName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        const { data } = await marketplaceApi.getStoreProductBySlug(subdomain, slug);
        const productData =
          ((data as { product?: ProductDetail })?.product as ProductDetail | undefined) ||
          (data as unknown as ProductDetail);

        if (!productData) {
          setProduct(null);
          return;
        }

        startTransition(() => {
          setProduct(productData);
          setStoreName(productData.tenant?.name || subdomain);
        });

        // Track view
        marketplaceApi.trackProductView(productData.id).catch(() => {});
      } catch {
        setProduct(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (slug && subdomain) fetchProduct();
  }, [slug, subdomain, router]);

  const handleContactSeller = async () => {
    if (!product?.tenant?.owner?.id || !product?.tenant?.id) {
      toast.error("Data toko belum lengkap");
      return;
    }
    if (!isAuthenticated) {
      toast.error("Silakan login terlebih dahulu");
      router.push(
        `/login?returnUrl=${encodeURIComponent(
          getStorefrontPath(subdomain, `/products/${slug}`),
        )}`,
      );
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
      if (!roomId) throw new Error("Room tidak ditemukan");
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

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <ShoppingBag className="mx-auto mb-4 h-14 w-14 text-gray-200" />
        <h1 className="text-xl font-bold text-gray-900">Produk Tidak Ditemukan</h1>
        <p className="mt-2 text-sm text-gray-500">
          Produk ini tidak tersedia di toko {storeName || subdomain}.
        </p>
      </div>
    );
  }

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
  const selectedPrice = selectedVariant?.price ?? product.price;
  const buyerName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const whatsappHref = canShowWhatsapp
    ? createWhatsAppCheckoutUrl({
        phoneNumber: tenant.contactWhatsapp || "",
        buyerName,
        itemLabel: "Produk",
        itemName: product.name,
        price: selectedPrice,
        quantity,
        optionLabel: selectedVariantLabel ? "Varian" : undefined,
        optionValue: selectedVariantLabel || undefined,
        itemUrl: currentPageUrl,
      })
    : "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href={getStorefrontPath(subdomain)} className="flex items-center gap-1 hover:text-blue-600">
          <ArrowLeft className="h-3.5 w-3.5" />
          {storeName || subdomain}
        </Link>
        <span>/</span>
        <Link href={getStorefrontPath(subdomain, "/products")} className="hover:text-blue-600">
          Produk
        </Link>
        {product.category && (
          <>
            <span>/</span>
            <span className="text-gray-600">{product.category.name}</span>
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
            <span className="mb-2 inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              {product.category.name}
            </span>
          )}

          <h1 className="text-2xl font-bold leading-tight text-gray-900">{product.name}</h1>

          {tenant && (
            <div className="mt-3">
              <Link
                href={getStorefrontPath(subdomain)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
              >
                {tenant.logo ? (
                  <Image src={tenant.logo} alt={tenant.name} width={24} height={24} className="rounded-full" />
                ) : (
                  <Store className="h-5 w-5 text-gray-400" />
                )}
                <span className="font-medium">{tenant.name}</span>
                {tenant.isVerified && <CheckCircle className="h-3.5 w-3.5 text-blue-500" />}
              </Link>
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
          </div>

          <div className="mt-4">
            <p className="text-3xl font-bold text-blue-600">
              {formatPrice(selectedPrice)}
            </p>
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
                  Checkout via WhatsApp
                </Button>
              </a>
            )}
          </div>

          {/* Share Button */}
          <div className="mt-3">
            <ShareButton
              url={currentPageUrl}
              title={product.name}
              description={product.description?.substring(0, 160) || ""}
              image={product.thumbnail || product.images?.[0] || ""}
              variant="default"
            />
          </div>

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
                    {formatPrice(selectedPrice * quantity)}
                  </span>
                </span>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900">
                Transaksi dilakukan manual melalui chat internal atau WhatsApp seller premium.
                {selectedVariantLabel ? ` Variant terpilih: ${selectedVariantLabel}.` : ""}
                {` Jumlah minat: ${quantity}.`}
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
