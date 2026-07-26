"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import {
  Store,
  Package,
  Wrench,
  Star,
  CheckCircle,
  MapPin,
  Award,
  TrendingUp,
  ShoppingBag,
  Phone,
  Mail,
  Clock,
  Globe,
  MessageCircle,
} from "lucide-react";
import { OnlineStatusBadge } from "@/components/shared/online-status-badge";
import { VerifiedBadge } from "@/components/badges/verified-badge";
import { StorefrontThemeProvider } from "@/components/storefront/theme-provider";
import { StorefrontHeader } from "@/components/storefront/header";
import { WhatsAppFloat } from "@/components/storefront/whatsapp-float";
import { StoreSuspended, isStoreSuspendedError } from "@/components/storefront/store-suspended";
import { useStorefront } from "@/hooks/use-storefront";
import { getStorefrontPath } from "@/lib/domain";
import type { Product, Service, Review } from "@/types";

export default function StorePage() {
  const params = useParams();
  const subdomain = params.subdomain as string;
  const { storeData, isLoading, error } = useStorefront(subdomain);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // Check if store is suspended
  if (isStoreSuspendedError(error)) {
    return <StoreSuspended />;
  }

  if (!storeData?.store) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center">
        <Store className="mx-auto h-16 w-16 text-gray-200 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Toko Tidak Ditemukan</h2>
        <p className="text-sm text-gray-500">Toko yang Anda cari tidak tersedia atau sudah tidak aktif.</p>
      </div>
    );
  }

  const {
    store,
    stats,
    products = [],
    services = [],
    reviews = [],
  } = storeData;
  const sellerAverageRating = Number(
    store.owner?.sellerProfile?.averageRating ?? stats.averageRating ?? 0,
  );
  const sellerTotalReviews = Number(
    store.owner?.sellerProfile?.totalReviews ?? stats.totalReviews ?? 0,
  );

  return (
    <StorefrontThemeProvider store={store}>
      <div className="min-h-screen bg-gray-50">
        {/* Header with Navigation */}
        <StorefrontHeader store={store} subdomain={subdomain} />

        {/* WhatsApp Floating Button */}
        {store.contactWhatsapp && (
          <WhatsAppFloat
            phoneNumber={store.contactWhatsapp}
            storeName={store.name}
            themeColor={store.themeColor || undefined}
          />
        )}

        {/* Hero Section with Banner */}
        <div className="relative overflow-hidden">
          {store.banner ? (
            <div className="relative h-72 sm:h-96 lg:h-[28rem] w-full">
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/60 z-10" />
              <Image
                src={store.banner}
                alt={store.name}
                fill
                className="object-cover"
                priority
              />
            </div>
          ) : (
            <div 
              className="relative h-72 sm:h-96 lg:h-[28rem] w-full"
              style={{
                background: store.themeColor 
                  ? `linear-gradient(135deg, ${store.themeColor}15 0%, ${store.themeSecondary || store.themeColor}25 100%)`
                  : 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)'
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Store 
                    className="h-32 w-32 mx-auto mb-4 opacity-20" 
                    style={{ color: store.themeColor || '#6366f1' }} 
                  />
                  {store.tagline && (
                    <p 
                      className="text-2xl font-semibold opacity-40"
                      style={{ color: store.themeColor || '#6366f1' }}
                    >
                      {store.tagline}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Store Info Card - Overlapping Banner */}
          <div className="relative z-20 mx-auto max-w-6xl px-4 -mt-24 sm:-mt-32">
            <div 
              className="overflow-hidden backdrop-blur-xl bg-white/98 shadow-2xl hover:shadow-3xl transition-shadow duration-300"
              style={{ 
                borderRadius: 'var(--store-radius-xl, 1.5rem)',
                border: '1px solid rgba(255, 255, 255, 0.9)'
              }}
            >
              <div className="p-6 sm:p-10">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  {/* Logo */}
                  <div className="relative group">
                    {store.logo ? (
                      <div className="relative">
                        <Image
                          src={store.logo}
                          alt={store.name}
                          width={112}
                          height={112}
                          className="object-cover w-24 h-24 sm:w-28 sm:h-28 ring-4 ring-white shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl"
                          style={{ borderRadius: 'var(--store-radius-lg, 1rem)' }}
                        />
                        {store.isVerified && (
                          <div 
                            className="absolute -bottom-2 -right-2 p-2 rounded-full bg-white shadow-lg ring-2 ring-white"
                            style={{ color: store.themeColor || 'rgb(59 130 246)' }}
                          >
                            <CheckCircle className="h-6 w-6 fill-current" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div 
                        className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center ring-4 ring-white shadow-xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl" 
                        style={{ 
                          borderRadius: 'var(--store-radius-lg, 1rem)',
                          backgroundColor: store.themeColor ? `${store.themeColor}20` : 'rgb(219 234 254)'
                        }}
                      >
                        <Store className="h-12 w-12 sm:h-14 sm:w-14" style={{ color: store.themeColor || 'rgb(37 99 235)' }} />
                      </div>
                    )}
                  </div>

                  {/* Store Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start gap-3 mb-3">
                      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight">
                        {store.name}
                      </h1>
                      <VerifiedBadge 
                        isVerified={store.isVerified}
                        size="md"
                        showLabel={true}
                      />
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className="text-sm font-medium text-gray-500">@{store.subdomain}</span>
                      <span className="text-gray-300">•</span>
                      <OnlineStatusBadge
                        lastActiveAt={store.owner?.lastActiveAt || null}
                        showText
                        size="sm"
                      />
                      {store.city && (
                        <>
                          <span className="text-gray-300">•</span>
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <MapPin className="h-4 w-4" />
                            <span>{store.city}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {store.description && (
                      <p className="text-base sm:text-lg text-gray-600 mb-6 leading-relaxed max-w-3xl break-words whitespace-pre-wrap">
                        {store.description}
                      </p>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100/50 border border-yellow-200/50 hover:shadow-md transition-shadow">
                        <div className="p-2.5 rounded-xl bg-white shadow-sm">
                          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-medium">Rating</p>
                          <p className="text-xl font-bold text-gray-900">
                            {sellerTotalReviews > 0 ? sellerAverageRating.toFixed(1) : '—'}
                          </p>
                        </div>
                      </div>

                      <div 
                        className="flex items-center gap-3 p-4 rounded-xl border hover:shadow-md transition-shadow"
                        style={{
                          background: store.themeColor 
                            ? `linear-gradient(135deg, ${store.themeColor}10 0%, ${store.themeColor}20 100%)`
                            : 'linear-gradient(135deg, rgb(239 246 255) 0%, rgb(219 234 254) 100%)',
                          borderColor: store.themeColor ? `${store.themeColor}30` : 'rgb(191 219 254)'
                        }}
                      >
                        <div className="p-2.5 rounded-xl bg-white shadow-sm">
                          <Package className="h-5 w-5" style={{ color: store.themeColor || 'rgb(59 130 246)' }} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-medium">Produk</p>
                          <p className="text-xl font-bold text-gray-900">{stats.totalProducts}</p>
                        </div>
                      </div>

                      <div 
                        className="flex items-center gap-3 p-4 rounded-xl border hover:shadow-md transition-shadow"
                        style={{
                          background: (store.themeSecondary || store.themeColor)
                            ? `linear-gradient(135deg, ${store.themeSecondary || store.themeColor}10 0%, ${store.themeSecondary || store.themeColor}20 100%)`
                            : 'linear-gradient(135deg, rgb(236 253 245) 0%, rgb(209 250 229) 100%)',
                          borderColor: (store.themeSecondary || store.themeColor) ? `${store.themeSecondary || store.themeColor}30` : 'rgb(167 243 208)'
                        }}
                      >
                        <div className="p-2.5 rounded-xl bg-white shadow-sm">
                          <Wrench className="h-5 w-5" style={{ color: store.themeSecondary || store.themeColor || 'rgb(16 185 129)' }} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-medium">Jasa</p>
                          <p className="text-xl font-bold text-gray-900">{stats.totalServices}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200/50 hover:shadow-md transition-shadow">
                        <div className="p-2.5 rounded-xl bg-white shadow-sm">
                          <Award className="h-5 w-5 text-purple-500" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-medium">Ulasan</p>
                          <p className="text-xl font-bold text-gray-900">{sellerTotalReviews}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">

          {/* Custom Pages Navigation */}
          {store.storePages && store.storePages.length > 0 && (
            <nav className="mb-10 flex flex-wrap gap-3">
              {store.storePages.map((page) => (
                <Link
                  key={page.id}
                  href={getStorefrontPath(subdomain, `/${page.slug}`)}
                  className="group relative overflow-hidden rounded-full border-2 border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-all hover:border-gray-300 hover:shadow-lg hover:-translate-y-0.5"
                  style={{
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (store.themeColor) {
                      e.currentTarget.style.backgroundColor = `${store.themeColor}15`;
                      e.currentTarget.style.borderColor = store.themeColor;
                      e.currentTarget.style.color = store.themeColor;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.borderColor = 'rgb(229 231 235)';
                    e.currentTarget.style.color = 'rgb(55 65 81)';
                  }}
                >
                  <span className="relative z-10">{page.title}</span>
                </Link>
              ))}
            </nav>
          )}

          {/* Products Section */}
          <section className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div 
                  className="p-3 rounded-2xl shadow-md"
                  style={{
                    background: store.themeColor 
                      ? `linear-gradient(135deg, ${store.themeColor}20 0%, ${store.themeColor}10 100%)`
                      : 'linear-gradient(135deg, rgb(219 234 254) 0%, rgb(239 246 255) 100%)'
                  }}
                >
                  <Package className="h-7 w-7" style={{ color: store.themeColor || 'rgb(37 99 235)' }} />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Produk Kami</h2>
                  <p className="text-sm text-gray-500 mt-1">Temukan produk berkualitas terbaik</p>
                </div>
              </div>
              {products.length > 0 && (
                <Link
                  href={getStorefrontPath(subdomain, "/products")}
                  className="group flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:gap-3 hover:shadow-md"
                  style={{ 
                    color: store.themeColor || 'rgb(37 99 235)',
                    backgroundColor: store.themeColor ? `${store.themeColor}10` : 'rgb(239 246 255)'
                  }}
                >
                  Lihat Semua
                  <span className="text-xs opacity-70">({stats.totalProducts})</span>
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
            
            {products.length === 0 ? (
              <div className="text-center py-20 px-4 rounded-3xl border-2 border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100/50">
                <div 
                  className="inline-flex p-5 rounded-2xl mb-4"
                  style={{
                    backgroundColor: store.themeColor ? `${store.themeColor}10` : 'rgb(239 246 255)'
                  }}
                >
                  <ShoppingBag className="h-14 w-14 text-gray-300" />
                </div>
                <p className="text-base font-semibold text-gray-600 mb-1">Belum ada produk tersedia</p>
                <p className="text-sm text-gray-400">Produk akan segera ditambahkan</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {products.map((p: Product) => (
                  <Link
                    key={p.id}
                    href={getStorefrontPath(subdomain, `/products/${p.slug || p.id}`)}
                    className="group overflow-hidden bg-white transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
                    style={{ 
                      borderRadius: 'var(--store-radius-xl, 1.25rem)',
                      border: '1px solid rgb(229 231 235)',
                      boxShadow: 'var(--store-shadow-sm, 0 1px 3px 0 rgb(0 0 0 / 0.1))'
                    }}
                  >
                    {(p.thumbnail || p.images?.[0]) ? (
                      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                        <Image
                          src={p.thumbnail || p.images?.[0]}
                          alt={p.name}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    ) : (
                      <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <Package className="h-14 w-14 text-gray-300" />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-3 min-h-[2.5rem] group-hover:text-gray-700 transition-colors">
                        {p.name}
                      </h3>
                      <div className="flex items-baseline gap-2">
                        <p className="text-lg font-bold" style={{ color: store.themeColor || 'rgb(37 99 235)' }}>
                          {formatPrice(p.price)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Services Section */}
          <section className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div 
                  className="p-3 rounded-2xl shadow-md"
                  style={{
                    background: (store.themeSecondary || store.themeColor)
                      ? `linear-gradient(135deg, ${store.themeSecondary || store.themeColor}20 0%, ${store.themeSecondary || store.themeColor}10 100%)`
                      : 'linear-gradient(135deg, rgb(209 250 229) 0%, rgb(236 253 245) 100%)'
                  }}
                >
                  <Wrench className="h-7 w-7" style={{ color: store.themeSecondary || store.themeColor || 'rgb(16 185 129)' }} />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Layanan Jasa</h2>
                  <p className="text-sm text-gray-500 mt-1">Solusi profesional untuk kebutuhan Anda</p>
                </div>
              </div>
              {services.length > 0 && (
                <Link
                  href={getStorefrontPath(subdomain, "/services")}
                  className="group flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:gap-3 hover:shadow-md"
                  style={{ 
                    color: store.themeSecondary || store.themeColor || 'rgb(16 185 129)',
                    backgroundColor: (store.themeSecondary || store.themeColor) ? `${store.themeSecondary || store.themeColor}10` : 'rgb(236 253 245)'
                  }}
                >
                  Lihat Semua
                  <span className="text-xs opacity-70">({stats.totalServices})</span>
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
            
            {services.length === 0 ? (
              <div className="text-center py-20 px-4 rounded-3xl border-2 border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100/50">
                <div 
                  className="inline-flex p-5 rounded-2xl mb-4"
                  style={{
                    backgroundColor: (store.themeSecondary || store.themeColor) ? `${store.themeSecondary || store.themeColor}10` : 'rgb(236 253 245)'
                  }}
                >
                  <Wrench className="h-14 w-14 text-gray-300" />
                </div>
                <p className="text-base font-semibold text-gray-600 mb-1">Belum ada layanan jasa tersedia</p>
                <p className="text-sm text-gray-400">Layanan akan segera ditambahkan</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {services.map((s: Service) => (
                  <Link
                    key={s.id}
                    href={getStorefrontPath(subdomain, `/services/${s.slug || s.id}`)}
                    className="group overflow-hidden bg-white transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
                    style={{ 
                      borderRadius: 'var(--store-radius-xl, 1.25rem)',
                      border: '1px solid rgb(229 231 235)',
                      boxShadow: 'var(--store-shadow-sm, 0 1px 3px 0 rgb(0 0 0 / 0.1))'
                    }}
                  >
                    {(s.thumbnail || s.gallery?.[0]) ? (
                      <div className="relative aspect-[16/9] bg-gray-100 overflow-hidden">
                        <Image
                          src={s.thumbnail || s.gallery?.[0]}
                          alt={s.name}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    ) : (
                      <div className="relative aspect-[16/9] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <Wrench className="h-14 w-14 text-gray-300" />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-3 min-h-[2.5rem] group-hover:text-gray-700 transition-colors">
                        {s.name}
                      </h3>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs text-gray-500 font-medium">Mulai dari</span>
                        <p className="text-lg font-bold" style={{ color: store.themeSecondary || store.themeColor || 'rgb(16 185 129)' }}>
                          {formatPrice(s.basePrice || s.packages?.[0]?.price)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Reviews Section */}
          {reviews.length > 0 && (
            <section className="mb-16">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-2xl shadow-md bg-gradient-to-br from-yellow-50 to-yellow-100/50">
                  <Star className="h-7 w-7 text-yellow-500 fill-yellow-500" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Ulasan Pelanggan</h2>
                  <p className="text-sm text-gray-500 mt-1">Testimoni dari pelanggan kami</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                {reviews.map((r: Review) => (
                  <div
                    key={r.id}
                    className="group p-6 sm:p-7 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                    style={{ 
                      borderRadius: 'var(--store-radius-xl, 1.25rem)',
                      border: '1px solid rgb(229 231 235)',
                      boxShadow: 'var(--store-shadow-sm, 0 1px 3px 0 rgb(0 0 0 / 0.1))'
                    }}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="relative">
                        <div className="h-14 w-14 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden ring-2 ring-white shadow-md">
                          {r.giver?.avatar ? (
                            <Image
                              src={r.giver.avatar}
                              alt=""
                              width={56}
                              height={56}
                              className="object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-600 font-bold text-xl">
                              {r.giver?.firstName?.[0] || '?'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-gray-900">
                          {r.giver?.firstName} {r.giver?.lastName}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${i < r.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-gray-600">
                            {r.rating}.0
                          </span>
                        </div>
                      </div>
                    </div>
                    {r.comment && (
                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-4 italic">
                        "{r.comment}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </StorefrontThemeProvider>
  );
}
