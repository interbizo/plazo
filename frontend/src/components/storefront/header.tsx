"use client";

import Link from "next/link";
import Image from "next/image";
import { Store, CheckCircle, ShoppingBag, Menu, X } from "lucide-react";
import { StorefrontNavigation } from "./navigation";
import { useStoreMenus } from "@/hooks/use-store-menus";
import { HomeButton } from "@/components/shared/home-button";
import type { Tenant } from "@/types";
import { useState } from "react";

interface StorefrontHeaderProps {
  store: Tenant;
  subdomain: string;
}

export function StorefrontHeader({ store, subdomain }: StorefrontHeaderProps) {
  const { menus, isLoading } = useStoreMenus(subdomain);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/98 backdrop-blur-xl shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4">
          {/* Home Button - Always Visible */}
          <HomeButton showText={false} className="sm:hidden" />
          <HomeButton className="hidden sm:flex" />

          {/* Logo & Store Name */}
          <Link
            href={`/store/${subdomain}`}
            className="flex items-center gap-3 group flex-shrink-0"
          >
            {store.logo ? (
              <div className="relative">
                <Image
                  src={store.logo}
                  alt={store.name}
                  width={48}
                  height={48}
                  className="object-cover w-12 h-12 rounded-xl ring-2 ring-gray-100 transition-all duration-300 group-hover:scale-105 group-hover:ring-4"
                  style={{
                    ...(store.themeColor && {
                      '--tw-ring-color': `${store.themeColor}30`
                    } as React.CSSProperties)
                  }}
                />
                {store.isVerified && (
                  <div
                    className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white shadow-md"
                    style={{ color: store.themeColor || "rgb(59 130 246)" }}
                  >
                    <CheckCircle className="h-4 w-4 fill-current" />
                  </div>
                )}
              </div>
            ) : (
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl ring-2 ring-gray-100 transition-all duration-300 group-hover:scale-105 group-hover:ring-4"
                style={{
                  backgroundColor: store.themeColor
                    ? `${store.themeColor}20`
                    : "rgb(219 234 254)",
                  ...(store.themeColor && {
                    '--tw-ring-color': `${store.themeColor}30`
                  } as React.CSSProperties)
                }}
              >
                <Store
                  className="h-6 w-6"
                  style={{ color: store.themeColor || "rgb(37 99 235)" }}
                />
              </div>
            )}

            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                  {store.name}
                </h2>
                {store.isVerified && !store.logo && (
                  <CheckCircle
                    className="h-5 w-5"
                    style={{ color: store.themeColor || "rgb(59 130 246)" }}
                  />
                )}
              </div>
              {store.tagline && (
                <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                  {store.tagline}
                </p>
              )}
            </div>
          </Link>

          {/* Navigation */}
          {!isLoading && menus.length > 0 && (
            <div className="hidden lg:flex flex-1 justify-center">
              <StorefrontNavigation
                subdomain={subdomain}
                menus={menus}
                themeColor={store.themeColor || undefined}
              />
            </div>
          )}

          {/* Cart/Actions */}
          <div className="flex items-center gap-3">
            <button
              className="p-2.5 rounded-xl text-gray-700 hover:bg-gray-100 transition-all relative group"
              aria-label="Shopping cart"
              style={{
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (store.themeColor) {
                  e.currentTarget.style.backgroundColor = `${store.themeColor}15`;
                  e.currentTarget.style.color = store.themeColor;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(243 244 246)';
                e.currentTarget.style.color = 'rgb(55 65 81)';
              }}
            >
              <ShoppingBag className="h-5 w-5" />
            </button>

            {/* Mobile Menu Button */}
            {!isLoading && menus.length > 0 && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2.5 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Announcement Bar (if exists) */}
      {store.storeAnnouncement && (
        <div
          className="border-t border-gray-200 py-2.5 px-4 text-center text-sm font-medium"
          style={{
            background: store.themeColor
              ? `linear-gradient(90deg, ${store.themeColor}08 0%, ${store.themeColor}15 50%, ${store.themeColor}08 100%)`
              : "linear-gradient(90deg, rgb(239 246 255) 0%, rgb(219 234 254) 50%, rgb(239 246 255) 100%)",
            color: store.themeColor || "rgb(30 64 175)",
          }}
        >
          {store.storeAnnouncement}
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-20 right-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl z-50 lg:hidden overflow-y-auto">
            <div className="p-6">
              <StorefrontNavigation
                subdomain={subdomain}
                menus={menus}
                themeColor={store.themeColor || undefined}
                className="flex-col items-stretch"
              />
            </div>
          </div>
        </>
      )}
    </header>
  );
}
