"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { NotificationDropdownEnhanced } from "@/components/shared/notification-dropdown-enhanced";
import { useEffect, useState } from "react";
import { useUnreadReports } from "@/hooks/use-unread-reports";
import { Spinner } from "@/components/ui/spinner";
import {
  LayoutDashboard,
  Users,
  Store,
  FolderTree,
  Package,
  Briefcase,
  Flag,
  Shield,
  Bell,
  ScrollText,
  ChevronDown,
  Menu,
  X,
  LogOut,
  CreditCard,
  FileText,
  MessageSquare,
  Rocket,
  Settings,
  Layers,
  Wrench,
  Gift,
  Home,
  Database,
  BookOpen,
  Newspaper,
  ShieldCheck,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

// ============================================
// MENU STRUCTURE — grouped with descriptions
// ============================================

interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  desc: string;
  superOnly?: boolean;
}

interface MenuSection {
  key: string;
  title: string;
  items: MenuItem[];
  defaultOpen?: boolean;
}

const MENU_SECTIONS: MenuSection[] = [
  {
    key: "general",
    title: "Umum",
    defaultOpen: true,
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: LayoutDashboard,
        desc: "Ringkasan platform, statistik & aktivitas terbaru",
      },
      {
        href: "/admin/notifications",
        label: "Notifikasi",
        icon: Bell,
        desc: "Lihat notifikasi realtime untuk admin dan super admin",
      },
      {
        href: "/admin/chat-monitor",
        label: "Pesan",
        icon: MessageSquare,
        desc: "Monitor semua percakapan user & seller untuk moderasi",
        superOnly: true,
      },
      {
        href: "/admin/users",
        label: "Pengguna",
        icon: Users,
        desc: "Kelola akun buyer, seller & admin",
      },
      {
        href: "/admin/tenants",
        label: "Toko / Tenant",
        icon: Store,
        desc: "Kelola toko seller, suspend & verifikasi",
      },
    ],
  },
  {
    key: "moderation",
    title: "Moderasi",
    defaultOpen: true,
    items: [
      {
        href: "/admin/products",
        label: "Produk",
        icon: Package,
        desc: "Moderasi produk seller dan kelola produk internal platform",
      },
      {
        href: "/admin/services",
        label: "Layanan",
        icon: Briefcase,
        desc: "Review & moderasi jasa/gig seller",
      },
      {
        href: "/admin/jobs",
        label: "Jobs",
        icon: FileText,
        desc: "Pantau lowongan kerja yang diposting",
      },
      {
        href: "/admin/reports",
        label: "Laporan",
        icon: Flag,
        desc: "Tangani laporan pelanggaran dari user",
      },
      {
        href: "/admin/forum",
        label: "Forum",
        icon: MessageSquare,
        desc: "Moderasi post, anti-spam, dan strike komunitas",
      },
      {
        href: "/admin/articles",
        label: "Artikel",
        icon: Newspaper,
        desc: "Kelola artikel, kategori, SEO, dan import CSV",
      },
    ],
  },
  {
    key: "verification",
    title: "Verifikasi",
    defaultOpen: false,
    items: [
      {
        href: "/admin/kyc",
        label: "KYC",
        icon: Shield,
        desc: "Verifikasi identitas seller (KTP/dokumen)",
      },
      {
        href: "/admin/appeals",
        label: "Banding Akun",
        icon: Flag,
        desc: "Review banding dari akun yang di-suspend",
      },
      {
        href: "/admin/audit-logs",
        label: "Audit Log",
        icon: ScrollText,
        desc: "Catatan semua aksi admin di platform",
      },
    ],
  },
  {
    key: "master",
    title: "Master Data",
    defaultOpen: false,
    items: [
      {
        href: "/admin/categories",
        label: "Kategori",
        icon: FolderTree,
        desc: "Kelola kategori produk, jasa & job",
        superOnly: true,
      },
      {
        href: "/admin/subscriptions",
        label: "Subscription",
        icon: Layers,
        desc: "Atur paket langganan & harga tier",
        superOnly: true,
      },
      {
        href: "/admin/subscription-payments",
        label: "Pembayaran Langganan",
        icon: CreditCard,
        desc: "Review pembayaran langganan dari seller",
      },
      {
        href: "/admin/affiliates",
        label: "Affiliate",
        icon: Gift,
        desc: "Kelola affiliate seller, kota khusus, dan klaim bonus",
      },
      {
        href: "/admin/physical-verifications",
        label: "Verifikasi Fisik",
        icon: ShieldCheck,
        desc: "Kelola verifikasi kunjungan fisik seller",
      },
      {
        href: "/admin/payment-accounts",
        label: "Rekening Platform",
        icon: CreditCard,
        desc: "Kelola rekening untuk pembayaran langganan",
        superOnly: true,
      },
      {
        href: "/admin/boosts",
        label: "Boost Listing",
        icon: Rocket,
        desc: "Kelola fitur boost produk & jasa",
        superOnly: true,
      },
    ],
  },
  {
    key: "system",
    title: "Sistem",
    defaultOpen: false,
    items: [
      {
        href: "/admin/tutorials",
        label: "Tutorial",
        icon: BookOpen,
        desc: "Kelola panduan penggunaan platform",
        superOnly: true,
      },
      {
        href: "/admin/tools",
        label: "Tools Rekomendasi",
        icon: Wrench,
        desc: "Kelola tools, ebook & aplikasi untuk seller",
        superOnly: true,
      },
      {
        href: "/admin/cms",
        label: "CMS",
        icon: Settings,
        desc: "Kelola halaman, banner, FAQ & pengaturan situs",
        superOnly: true,
      },
      {
        href: "/admin/platform-settings",
        label: "Platform Settings",
        icon: SlidersHorizontal,
        desc: "Kelola konfigurasi platform, fitur flag, maintenance & cache",
        superOnly: true,
      },
      {
        href: "/admin/database-backup",
        label: "Database Backup",
        icon: Database,
        desc: "Backup & restore database sistem",
        superOnly: true,
      },
    ],
  },
];

const SUPER_ADMIN_PATHS = MENU_SECTIONS.flatMap((section) =>
  section.items.filter((item) => item.superOnly).map((item) => item.href),
);

// ============================================
// COLLAPSIBLE SECTION
// ============================================

function SidebarSection({
  section,
  pathname,
  isSuperAdmin,
  unreadReportsCount,
  onNavigate,
}: {
  section: MenuSection;
  pathname: string;
  isSuperAdmin: boolean;
  unreadReportsCount?: number;
  onNavigate?: () => void;
}) {
  const visibleItems = section.items.filter(
    (item) => !item.superOnly || isSuperAdmin,
  );
  const hasActiveChild = visibleItems.some(
    (item) =>
      pathname === item.href ||
      (item.href !== "/admin" && pathname.startsWith(item.href)),
  );
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
          open ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.href === "/admin/reports" &&
                    unreadReportsCount &&
                    unreadReportsCount > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                        {unreadReportsCount > 99 ? "99+" : unreadReportsCount}
                      </span>
                    )}
                  {item.superOnly && (
                    <span className="rounded bg-yellow-100 px-1 text-[9px] font-bold text-yellow-700">
                      SA
                    </span>
                  )}
                </div>
                <p
                  className={`text-[11px] leading-tight mt-0.5 ${
                    isActive
                      ? "text-indigo-500"
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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, isLoading } = useAuthStore();
  const [showMobile, setShowMobile] = useState(false);
  const { unreadCount: unreadReportsCount } = useUnreadReports();

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isAdmin = user?.role === "ADMIN" || isSuperAdmin;

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || isSuperAdmin) return;

    const isSuperAdminPage = SUPER_ADMIN_PATHS.some(
      (href) => pathname === href || pathname.startsWith(`${href}/`),
    );

    if (isSuperAdminPage) {
      router.push("/admin");
    }
  }, [isLoading, isAuthenticated, isSuperAdmin, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) return null;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const sidebarContent = (onNavigate?: () => void) => (
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
        
        {isSuperAdmin && (
          <Link
            href="/admin/chat"
            className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium">Chat Transaksi</span>
              <p className="text-[11px] text-gray-400 group-hover:text-gray-500">
                Balas buyer produk/jasa internal
              </p>
            </div>
          </Link>
        )}
      </div>

      <div className="border-t border-gray-200 mb-3" />

      {MENU_SECTIONS.map((section) => (
        <SidebarSection
          key={section.key}
          section={section}
          pathname={pathname}
          isSuperAdmin={isSuperAdmin}
          unreadReportsCount={unreadReportsCount}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Mobile header */}
      <div className="mb-4 flex items-center justify-between lg:hidden">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {isSuperAdmin ? "Super Admin" : "Admin Panel"}
          </h2>
          <p className="text-xs text-gray-500">
            {user?.firstName} {user?.lastName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationDropdownEnhanced role={user?.role} />
          {unreadReportsCount > 0 && (
            <Link
              href="/admin/reports"
              className="relative rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50"
            >
              <Flag className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadReportsCount > 99 ? "99+" : unreadReportsCount}
              </span>
            </Link>
          )}
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
              <h3 className="text-lg font-semibold">
                {isSuperAdmin ? "Super Admin" : "Admin"}
              </h3>
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
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-900 truncate">
                  {isSuperAdmin ? "Super Admin" : "Admin Panel"}
                </h2>
                <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                <span
                  className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isSuperAdmin
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  {isSuperAdmin ? "Super Admin" : "Admin"}
                </span>
              </div>
              <div className="flex flex-col gap-2 relative z-50">
                <NotificationDropdownEnhanced role={user?.role} />
                {unreadReportsCount > 0 && (
                  <Link
                    href="/admin/reports"
                    className="relative rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 transition-colors"
                    title="Laporan baru"
                  >
                    <Flag className="h-4 w-4" />
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                      {unreadReportsCount > 99 ? "99+" : unreadReportsCount}
                    </span>
                  </Link>
                )}
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
