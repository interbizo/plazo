"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { useNotificationStore } from "@/stores/notification.store";
import { NotificationDropdownEnhanced } from "@/components/shared/notification-dropdown-enhanced";
import { FloatingUpgradeButton } from "@/components/seller/floating-upgrade-button";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  Briefcase,
  Star,
  FileText,
  Store,
  User,
  ChevronDown,
  Menu,
  X,
  FolderOpen,
  MessageSquare,
  LogOut,
  Bell,
  ShieldCheck,
  Zap,
  CreditCard,
  Lightbulb,
  Gift,
  Home,
  ExternalLink,
  AlertCircle,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { sellerApi } from "@/services/seller.service";

// ============================================
// MENU STRUCTURE — grouped with descriptions
// ============================================

interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  desc: string;
  countKey?: "notifications";
  premiumFeature?: string; // Feature name to check (e.g., "canAdvancedAnalytics")
  memberOnly?: boolean;
}

interface MenuSection {
  key: string;
  title: string;
  items: MenuItem[];
  defaultOpen?: boolean;
}

const MENU_SECTIONS: MenuSection[] = [
  {
    key: "main",
    title: "Utama",
    defaultOpen: true,
    items: [
      {
        href: "/seller/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        desc: "Ringkasan listing, toko, dan aktivitas seller",
      },
      {
        href: "/seller/dashboard/chat",
        label: "Pesan",
        icon: MessageSquare,
        desc: "Chat langsung dengan pembeli",
      },
      {
        href: "/seller/dashboard/notifications",
        label: "Notifikasi",
        icon: Bell,
        desc: "Balasan buyer, update sistem, dan info penting",
        countKey: "notifications",
      },
      {
        href: "/forum",
        label: "Forum",
        icon: MessageSquare,
        desc: "Diskusi bersama komunitas Plazo",
      },
      {
        href: "/seller/dashboard/products",
        label: "Produk",
        icon: Package,
        desc: "Tambah & kelola produk yang dijual",
      },
      {
        href: "/seller/dashboard/services",
        label: "Layanan",
        icon: Briefcase,
        desc: "Kelola jasa/gig yang Anda tawarkan",
      },
    ],
  },
  {
    key: "freelance",
    title: "Freelance & Penawaran",
    defaultOpen: true,
    items: [
      {
        href: "/seller/dashboard/proposals",
        label: "Proposal",
        icon: FileText,
        desc: "Proposal yang Anda kirim ke buyer",
      },
      /* {
        href: "/seller/dashboard/custom-offers",
        label: "Penawaran Khusus",
        icon: FileText,
        desc: "Siapkan penawaran kerja sama untuk buyer",
      }, */
    ],
  },
  {
    key: "communication",
    title: "Komunikasi",
    defaultOpen: true,
    items: [
      {
        href: "/seller/dashboard/chat",
        label: "Pesan",
        icon: MessageSquare,
        desc: "Chat langsung dengan pembeli",
      },
      {
        href: "/seller/dashboard/notifications",
        label: "Notifikasi",
        icon: Bell,
        desc: "Balasan buyer, update sistem, dan info penting",
        countKey: "notifications",
      },
      {
        href: "/seller/dashboard/reports",
        label: "Riwayat Laporan",
        icon: AlertCircle,
        desc: "Lihat laporan yang pernah Anda buat",
      },
    ],
  },
  {
    key: "activity",
    title: "Aktivitas",
    defaultOpen: false,
    items: [
      {
        href: "/seller/dashboard/portfolio",
        label: "Portfolio",
        icon: FolderOpen,
        desc: "Showcase hasil kerja terbaik Anda",
      },
      {
        href: "/seller/dashboard/reviews",
        label: "Ulasan",
        icon: Star,
        desc: "Review dari pembeli tentang layananmu",
      },
      {
        href: "/seller/dashboard/boosts",
        label: "Boost / Top Ads",
        icon: Zap,
        desc: "Tingkatkan visibilitas produk & jasa",
        premiumFeature: "canHighlightProducts",
      },
      {
        href: "/seller/dashboard/affiliate",
        label: "Program Affiliate",
        icon: Gift,
        desc: "Pantau referral seller, bonus, dan klaim affiliate",
        memberOnly: true,
      },
      {
        href: "/seller/dashboard/tools",
        label: "Tools Rekomendasi",
        icon: Lightbulb,
        desc: "Akses tools, ebook & aplikasi pilihan",
      },
      {
        href: "/seller/dashboard/tutorials",
        label: "Tutorial",
        icon: BookOpen,
        desc: "Panduan lengkap menggunakan platform",
      },
      {
        href: "/seller/dashboard/promotions",
        label: "Flash Sale",
        icon: Zap,
        desc: "Kelola promo dan penawaran flash sale seller",
        premiumFeature: "canFlashSale",
      },
    ],
  },
  {
    key: "settings",
    title: "Pengaturan & Akun",
    defaultOpen: false,
    items: [
      {
        href: "/seller/dashboard/subscription",
        label: "Upgrade Premium",
        icon: CreditCard,
        desc: "Kelola paket langganan toko",
      },
      {
        href: "/seller/dashboard/verification",
        label: "Verifikasi KYC",
        icon: ShieldCheck,
        desc: "Verifikasi identitas untuk kepercayaan",
      },
      {
        href: "/seller/dashboard/physical-verification",
        label: "Verifikasi Fisik",
        icon: ShieldCheck,
        desc: "Verifikasi kunjungan fisik untuk badge verified",
        memberOnly: true,
      },
      {
        href: "/seller/dashboard/store",
        label: "Pengaturan Toko",
        icon: Store,
        desc: "Atur nama, logo, tema & CMS toko",
      },
      {
        href: "/seller/dashboard/store/pages",
        label: "Halaman Toko",
        icon: FileText,
        desc: "Buat halaman custom (About, FAQ, dll)",
      },
      {
        href: "/seller/dashboard/profile",
        label: "Profil",
        icon: User,
        desc: "Edit data diri & pengaturan akun",
      },
    ],
  },
];

// ============================================
// COLLAPSIBLE SECTION
// ============================================

function SidebarSection({
  section,
  pathname,
  counts,
  hasMemberPlan,
  onNavigate,
}: {
  section: MenuSection;
  pathname: string;
  counts: Record<string, number>;
  hasMemberPlan: boolean;
  onNavigate?: () => void;
}) {
  const visibleItems = section.items.filter(
    (item) => !item.memberOnly || hasMemberPlan,
  );
  const hasActiveChild = visibleItems.some((item) => {
    const matchingItems = visibleItems.filter(
      (i) => pathname === i.href || pathname.startsWith(i.href + "/"),
    );
    const longestMatch = matchingItems.reduce(
      (longest, current) =>
        current.href.length > longest.href.length ? current : longest,
      matchingItems[0],
    );
    return longestMatch?.href === item.href;
  });
  const [open, setOpen] = useState(section.defaultOpen || hasActiveChild);

  if (visibleItems.length === 0) return null;

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600 transition-colors"
      >
        {section.title}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
        />
      </button>

      <div
        className={`space-y-0.5 overflow-hidden transition-all duration-200 ${
          open ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {visibleItems.map((item) => {
          // Find the longest matching route in this section
          const matchingItems = section.items.filter(
            (i) => pathname === i.href || pathname.startsWith(i.href + "/"),
          );
          const longestMatch = matchingItems.reduce(
            (longest, current) =>
              current.href.length > longest.href.length ? current : longest,
            matchingItems[0],
          );

          // Only this item is active if it's the longest match
          const isActive = longestMatch?.href === item.href;

          const count = item.countKey ? counts[item.countKey] || 0 : 0;
          
          // Special styling for Upgrade Premium menu
          const isUpgradeMenu = item.href === "/seller/dashboard/subscription";

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-all ${
                isUpgradeMenu
                  ? "bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 hover:from-amber-100 hover:to-orange-100 hover:border-amber-300 hover:shadow-sm"
                  : isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <item.icon className={`h-4 w-4 shrink-0 mt-0.5 ${isUpgradeMenu ? "text-amber-600" : ""}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isUpgradeMenu ? "text-amber-900" : ""}`}>
                    {item.label}
                    {count > 0 && (
                      <span
                        className={`ml-1 ${isActive ? "text-emerald-500" : "text-red-500"}`}
                      >
                        ({count})
                      </span>
                    )}
                  </span>
                  {isUpgradeMenu && (
                    <span className="inline-flex items-center rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
                      ⭐ HOT
                    </span>
                  )}
                </div>
                <p
                  className={`text-[11px] leading-tight mt-0.5 ${
                    isUpgradeMenu
                      ? "text-amber-700 font-medium"
                      : isActive
                        ? "text-emerald-500"
                        : "text-gray-400 group-hover:text-gray-500"
                  }`}
                >
                  {item.desc}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// LAYOUT
// ============================================

export default function SellerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, isLoading } = useAuthStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const [showMobile, setShowMobile] = useState(false);
  const [hasMemberPlan, setHasMemberPlan] = useState(false);
  const [storeSubdomain, setStoreSubdomain] = useState<string | null>(null);
  const [isLoadingStore, setIsLoadingStore] = useState(true);

  const isSeller = user?.role === "SELLER";

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isSeller)) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") {
        router.push("/admin");
      } else {
        router.push("/");
      }
    }
  }, [isLoading, isAuthenticated, isSeller, router, user?.role]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Check and set tenant subdomain
  useEffect(() => {
    if (user?.tenantSubdomain) {
      const currentTenant =
        typeof window !== "undefined"
          ? localStorage.getItem("plazo_tenant_subdomain")
          : null;
      if (currentTenant !== user.tenantSubdomain) {
        if (typeof window !== "undefined") {
          localStorage.setItem("plazo_tenant_subdomain", user.tenantSubdomain);
          // Also set cookie for cross-subdomain access
          document.cookie = `tenant_subdomain=${user.tenantSubdomain}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
        }
      }
      // Set subdomain from user profile as initial value
      setStoreSubdomain(user.tenantSubdomain);
      setIsLoadingStore(false);
    }
  }, [user?.tenantSubdomain]);

  useEffect(() => {
    let mounted = true;

    if (!isAuthenticated || !isSeller) {
      setHasMemberPlan(false);
      setIsLoadingStore(false);
      return;
    }

    // Only fetch if we don't have subdomain from user profile yet
    if (!user?.tenantSubdomain) {
      setIsLoadingStore(true);
    }

    sellerApi
      .getCurrentSubscription()
      .then((res) => {
        if (!mounted) return;
        const plan = res.data?.tenant?.subscriptionPlan || "FREE";
        const subdomain = res.data?.tenant?.subdomain;
        setHasMemberPlan(plan !== "FREE");
        
        // Update subdomain if available from API
        if (subdomain) {
          setStoreSubdomain(subdomain);
        }
        setIsLoadingStore(false);
      })
      .catch(() => {
        if (mounted) {
          setHasMemberPlan(false);
          // Don't clear subdomain if we already have it from user profile
          // setStoreSubdomain(null);
          setIsLoadingStore(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, isSeller, user?.tenantSubdomain]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-emerald-600" />
      </div>
    );
  }

  if (!isAuthenticated || !isSeller) return null;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const counts: Record<string, number> = {
    notifications: unreadCount,
  };

  const sidebarContent = (onNavigate?: () => void) => {
    // Get store URL - generate proper subdomain URL
    const getStoreUrl = () => {
      if (!storeSubdomain) return null;
      
      if (typeof window === "undefined") return null;
      
      const currentHost = window.location.host;
      const protocol = window.location.protocol;
      
      // Development: localhost or 127.0.0.1
      if (currentHost.includes("localhost") || currentHost.includes("127.0.0.1")) {
        const port = currentHost.split(":")[1];
        return `${protocol}//${storeSubdomain}.localhost${port ? `:${port}` : ""}`;
      }
      
      // Production: extract base domain
      // Example: seller.plazo.com -> plazo.com
      // Example: seller.ehftest.dev -> ehftest.dev
      const parts = currentHost.split(".");
      
      // If already on subdomain (e.g., seller.plazo.com), remove first part
      // If on main domain (e.g., plazo.com), use as is
      const baseDomain = parts.length >= 2 
        ? parts.slice(-2).join(".") // Get last 2 parts (domain.tld)
        : currentHost;
      
      return `${protocol}//${storeSubdomain}.${baseDomain}`;
    };

    const storeUrl = getStoreUrl();

    return (
      <nav>
        {/* Quick Links */}
        <div className="mb-4 space-y-1">
          <Link
            href="/"
            target="_blank"
            className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            <Home className="h-4 w-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium">Website Utama</span>
              <p className="text-[11px] text-gray-400 group-hover:text-gray-500">
                Kembali ke homepage
              </p>
            </div>
          </Link>

          {storeUrl && storeSubdomain && (
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-emerald-600 transition-colors hover:bg-emerald-50 hover:shadow-sm border border-emerald-200"
              onClick={onNavigate}
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">Lihat Toko Saya</span>
                <p className="text-[11px] text-emerald-500 group-hover:text-emerald-600 truncate">
                  {storeSubdomain}
                </p>
              </div>
            </a>
          )}

          {!storeSubdomain && !isLoadingStore && (
            <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-gray-50 border border-gray-200 opacity-60">
              <Store className="h-4 w-4 shrink-0 text-gray-400" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-500">Toko Belum Tersedia</span>
                <p className="text-[11px] text-gray-400">
                  Hubungi admin untuk setup toko
                </p>
              </div>
            </div>
          )}

          {isLoadingStore && (
            <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-gray-50 border border-gray-200">
              <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-emerald-600" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-500">Memuat toko...</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 mb-3" />

        {MENU_SECTIONS.map((section) => (
          <SidebarSection
            key={section.key}
            section={section}
            pathname={pathname}
            counts={counts}
            hasMemberPlan={hasMemberPlan}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Mobile header */}
      <div className="mb-4 flex items-center justify-between lg:hidden">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Halo, {user?.firstName || "Penjual"}!
          </h2>
          <p className="text-xs text-gray-500">Seller Dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationDropdownEnhanced role={user?.role} />
          <button
            onClick={() => setShowMobile(true)}
            className="rounded-lg border border-gray-300 p-2 text-gray-600"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {showMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowMobile(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Menu Penjual</h3>
              <button onClick={() => setShowMobile(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            {sidebarContent(() => setShowMobile(false))}
            <button
              onClick={() => {
                handleLogout();
                setShowMobile(false);
              }}
              className="mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Logout
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-60 shrink-0 sticky top-6 self-start max-h-[calc(100vh-3rem)] pr-1">
          {/* Header - Fixed, not scrollable */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-900 truncate">
                  Halo, {user?.firstName || "Penjual"}!
                </h2>
                <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  Seller
                </span>
              </div>
              <div className="relative z-50">
                <NotificationDropdownEnhanced role={user?.role} />
              </div>
            </div>
          </div>

          {/* Menu - Scrollable */}
          <nav className="flex-1 overflow-y-auto">{sidebarContent()}</nav>

          {/* Logout Button - Fixed at bottom */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Logout
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
      
      {/* Floating Upgrade Button */}
      <FloatingUpgradeButton />
    </div>
  );
}
