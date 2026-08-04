"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ScrollToTop } from "@/components/shared/scroll-to-top";
import { NotificationToastListener } from "@/components/shared/notification-toast";
import { AuthProvider } from "@/providers/auth-provider";
import { ToastProvider } from "@/providers/toast-provider";
import { SocketProvider } from "@/providers/socket-provider";
import { marketplaceApi } from "@/services/marketplace.service";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface ClientLayoutProps {
  children: React.ReactNode;
  settings: Record<string, string>;
  isStorefrontHost?: boolean;
}

export function ClientLayout({ children, isStorefrontHost = false }: ClientLayoutProps) {
  const pathname = usePathname();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const isStorefrontPath = pathname === "/store" || pathname.startsWith("/store/");
  const isStorefront = isStorefrontHost || isStorefrontPath;

  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || typeof window === "undefined") {
      return;
    }

    if ("caches" in window) {
      void caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => undefined);
    }

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(
            registrations.map((registration) => {
              const scriptUrl =
                registration.active?.scriptURL ||
                registration.waiting?.scriptURL ||
                registration.installing?.scriptURL ||
                "";

              if (scriptUrl.endsWith("/notification-sw.js")) {
                return Promise.resolve(false);
              }

              return registration.unregister();
            }),
          ),
        )
        .catch(() => undefined);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    if (isStorefront) return;

    try {
      const { data } = await marketplaceApi.getSiteSettings();
      const arr = Array.isArray(data) ? data : data?.data || [];

      const map: Record<string, string> = {};
      arr.forEach((s: { key: string; value: string }) => {
        map[s.key] = s.value;
      });

      if (Object.keys(map).length > 0) {
        setSettings(map);
      }
    } catch {
      // Silently fail - keep defaults
    }
  }, [isStorefront]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Apply global theme from CMS settings
  useEffect(() => {
    if (isStorefront || Object.keys(settings).length === 0) return;

    const root = document.documentElement;

    // Apply primary color
    if (settings.primary_color) {
      root.style.setProperty('--color-primary', settings.primary_color);
      
      // Convert hex to RGB for opacity variants
      const rgb = hexToRgb(settings.primary_color);
      if (rgb) {
        root.style.setProperty('--color-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
      }
    }

    // Apply accent color
    if (settings.accent_color) {
      root.style.setProperty('--color-accent', settings.accent_color);
      
      const rgb = hexToRgb(settings.accent_color);
      if (rgb) {
        root.style.setProperty('--color-accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
      }
    }

    console.log('[Theme] Global theme applied:', {
      primary: settings.primary_color,
      accent: settings.accent_color,
    });

    // Cleanup
    return () => {
      root.style.removeProperty('--color-primary');
      root.style.removeProperty('--color-primary-rgb');
      root.style.removeProperty('--color-accent');
      root.style.removeProperty('--color-accent-rgb');
    };
  }, [settings, isStorefront]);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <ToastProvider />
          <NotificationToastListener />
          {!isStorefront && <Navbar settings={settings} />}
          <main className="flex-1">{children}</main>
          {!isStorefront && <Footer settings={settings} />}
          {!isStorefront && <ScrollToTop />}
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse hex values
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  if (hex.length !== 6) {
    return null;
  }
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return { r, g, b };
}
