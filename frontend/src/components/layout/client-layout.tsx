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
import { MaintenanceScreen } from "@/components/maintenance/maintenance-screen";
import { useMaintenanceStore } from "@/stores/maintenance.store";

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
  const maintenanceEnabled = useMaintenanceStore((s) => s.enabled);
  const checkMaintenance = useMaintenanceStore((s) => s.checkMaintenance);
  const applyMaintenance = useMaintenanceStore((s) => s.applyMaintenance);

  // Halaman auth harus tetap dapat digunakan agar admin masih bisa login saat maintenance.
  const isAuthPath =
    ["/login", "/register", "/forgot-password", "/reset-password"].some(
      (p) => pathname === p || pathname.startsWith(p + "/"),
    ) || pathname.startsWith("/verify-");
  const showMaintenanceScreen =
    maintenanceEnabled &&
    !pathname.startsWith("/admin") &&
    !isAuthPath;

    // Pertahankan status maintenance tetap sinkron (endpoint publik dibypass saat maintenance aktif) dan tanggapi 503
  useEffect(() => {
    void checkMaintenance();
    const interval = setInterval(() => {
      void checkMaintenance();
    }, 30000);
    const onMaintenanceActive = (e: Event) => {
      const detail = (e as CustomEvent<{
        title?: string;
        message?: string;
        estimatedEnd?: string | null;
      }>).detail;
      // Terapkan status maintenance segera dari body 503, lalu refresh detail dari endpoint publik sebagai fallback.
      applyMaintenance(detail || {});
      void checkMaintenance();
    };
    window.addEventListener("plazo:maintenance-active", onMaintenanceActive);
    return () => {
      clearInterval(interval);
      window.removeEventListener("plazo:maintenance-active", onMaintenanceActive);
    };
  }, [checkMaintenance, applyMaintenance]);

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
    if (isStorefront || showMaintenanceScreen) return;

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
  }, [isStorefront, showMaintenanceScreen]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Apply global theme from CMS settings
  useEffect(() => {
    if (isStorefront || showMaintenanceScreen || Object.keys(settings).length === 0) return;

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

    // Cleanup
    return () => {
      root.style.removeProperty('--color-primary');
      root.style.removeProperty('--color-primary-rgb');
      root.style.removeProperty('--color-accent');
      root.style.removeProperty('--color-accent-rgb');
    };
  }, [settings, isStorefront, showMaintenanceScreen]);

  // Layout standalone saat maintenance aktif (URL TIDAK diubah).
  if (showMaintenanceScreen) {
    return (
      <ErrorBoundary>
        <main className="min-h-screen flex-1 bg-gray-50">
          <MaintenanceScreen />
        </main>
      </ErrorBoundary>
    );
  }

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
