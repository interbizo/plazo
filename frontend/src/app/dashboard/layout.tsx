"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { useNotificationStore } from "@/stores/notification.store";
import { NotificationDropdownEnhanced } from "@/components/shared/notification-dropdown-enhanced";
import {
  LayoutDashboard,
  ShoppingBag,
  FileText,
  Bell,
  Star,
  User,
  ChevronDown,
  Menu,
  X,
  MessageSquare,
  LogOut,
  Heart,
  Store,
  Briefcase,
  BookOpen,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// ============================================
// MENU STRUCTURE — grouped with descriptions
// ============================================

interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  desc: string;
  countKey?: "notifications";
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
        href: "/dashboard",
        label: "Overview",
        icon: LayoutDashboard,
        desc: "Ringkasan aktivitas & statistik akun Anda",
      },
      {
        href: "/dashboard/notifications",
        label: "Notifikasi",
        icon: Bell,
        desc: "Update chat, toko, dan info penting lainnya",
        countKey: "notifications",
      },
      {
        href: "/dashboard/chat",
        label: "Pesan",
        icon: MessageSquare,
        desc: "Chat langsung dengan seller",
      },
      {
        href: "/forum",
        label: "Forum",
        icon: MessageSquare,
        desc: "Diskusi bersama komunitas Plazo",
      },
    ],
  },
  {
    key: "freelance",
    title: "Freelance & Jasa",
    defaultOpen: true,
    items: [
      {
        href: "/dashboard/jobs",
        label: "Pekerjaan Saya",
        icon: FileText,
        desc: "Kelola lowongan kerja yang Anda posting",
      },
      /* {
        href: "/dashboard/offers",
        label: "Penawaran",
        icon: Gift,
        desc: "Penawaran langsung dari seller yang perlu Anda cek",
      }, */
    ],
  },
  {
    key: "activity",
    title: "Aktivitas & Riwayat",
    defaultOpen: false,
    items: [
      {
        href: "/dashboard/wishlist",
        label: "Wishlist",
        icon: Heart,
        desc: "Produk & jasa yang Anda simpan",
      },
      {
        href: "/dashboard/reviews",
        label: "Ulasan",
        icon: Star,
        desc: "Lihat ulasan yang sudah Anda berikan",
      },
      {
        href: "/dashboard/tutorials",
        label: "Tutorial",
        icon: BookOpen,
        desc: "Panduan lengkap menggunakan platform",
      },
    ],
  },
  {
    key: "account",
    title: "Akun",
    defaultOpen: false,
    items: [
      {
        href: "/dashboard/profile",
        label: "Profil",
        icon: User,
        desc: "Edit data diri & pengaturan akun",
      },
      {
        href: "/dashboard/kyc",
        label: "Verifikasi KYC",
        icon: ShieldCheck,
        desc: "Verifikasi identitas untuk akses fitur lengkap",
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
  onNavigate,
}: {
  section: MenuSection;
  pathname: string;
  counts: Record<string, number>;
  onNavigate?: () => void;
}) {
  const hasActiveChild = section.items.some(
    (item) =>
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href)),
  );
  const [open, setOpen] = useState(section.defaultOpen || hasActiveChild);

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
          open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {section.items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const count = item.countKey ? counts[item.countKey] || 0 : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">
                  {item.label}
                  {count > 0 && (
                    <span
                      className={`ml-1 ${isActive ? "text-blue-500" : "text-red-500"}`}
                    >
                      ({count})
                    </span>
                  )}
                </span>
                <p
                  className={`text-[11px] leading-tight mt-0.5 ${
                    isActive
                      ? "text-blue-500"
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

export default function BuyerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuthStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const [showMobile, setShowMobile] = useState(false);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Redirect based on role
  useEffect(() => {
    if (!user?.role) return;

    // Admin/Super Admin: Redirect to admin panel
    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
      router.replace("/admin");
      return;
    }

    // Seller: Redirect to seller dashboard
    if (user.role === "SELLER") {
      router.replace("/seller/dashboard");
      return;
    }

    // Buyer: Allow all dashboard access (default)
  }, [user?.role, router]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  const counts: Record<string, number> = {
    notifications: unreadCount,
  };

  const sidebarContent = (onNavigate?: () => void) => (
    <nav>
      {/* Quick links — Marketplace */}
      <div className="mb-4 space-y-1.5">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
        >
          <Store className="h-4 w-4 shrink-0" />
          Jelajahi Marketplace
        </Link>
        <div className="flex gap-2">
          <Link
            href="/products"
            onClick={onNavigate}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-medium transition-colors text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Produk
          </Link>
          <Link
            href="/services"
            onClick={onNavigate}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-medium transition-colors text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
          >
            <Briefcase className="h-3.5 w-3.5" />
            Jasa
          </Link>
        </div>
      </div>

      {/* Grouped menu sections */}
      {MENU_SECTIONS.map((section) => (
        <SidebarSection
          key={section.key}
          section={section}
          pathname={pathname}
          counts={counts}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Mobile header */}
      <div className="mb-4 flex items-center justify-between lg:hidden">
        <h2 className="text-lg font-bold text-gray-900">
          Halo, {user?.firstName || "Pembeli"}!
        </h2>
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
              <h3 className="text-lg font-semibold">Menu</h3>
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
                  Halo, {user?.firstName || "Pembeli"}!
                </h2>
                <p className="text-sm text-gray-500 truncate">{user?.email}</p>
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
    </div>
  );
}
