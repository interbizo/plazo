"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Briefcase,
  ChevronDown,
  CreditCard,
  ExternalLink,
  FileText,
  FolderOpen,
  Heart,
  Home,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  User,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { FloatingUpgradeButton } from "@/components/seller/floating-upgrade-button";
import { NotificationDropdownEnhanced } from "@/components/shared/notification-dropdown-enhanced";
import { sellerApi } from "@/services/seller.service";
import { useAuthStore } from "@/stores/auth.store";

type MenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  desc: string;
  sellerOnly?: boolean;
  memberOnly?: boolean;
};

type MenuSection = {
  key: string;
  title: string;
  mode?: "buyer" | "store";
  defaultOpen?: boolean;
  items: MenuItem[];
};

const menuSections: MenuSection[] = [
  {
    key: "main",
    title: "Utama",
    mode: "buyer",
    defaultOpen: true,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Ringkasan aktivitas akun" },
      { href: "/dashboard/chat", label: "Pesan", icon: MessageSquare, desc: "Percakapan dengan pengguna lain" },
      { href: "/dashboard/notifications", label: "Notifikasi", icon: Bell, desc: "Update dan informasi penting" },
      { href: "/forum", label: "Forum", icon: MessageSquare, desc: "Diskusi komunitas Plazo" },
    ],
  },
  {
    key: "buyer",
    title: "Aktivitas Buyer",
    mode: "buyer",
    defaultOpen: true,
    items: [
      { href: "/dashboard/jobs", label: "Pekerjaan Saya", icon: FileText, desc: "Kelola lowongan yang diposting" },
      { href: "/dashboard/wishlist", label: "Wishlist", icon: Heart, desc: "Produk dan jasa yang disimpan" },
      { href: "/dashboard/reviews", label: "Ulasan", icon: Star, desc: "Ulasan yang telah diberikan" },
      { href: "/dashboard/tutorials", label: "Tutorial", icon: BookOpen, desc: "Panduan menggunakan Plazo" },
    ],
  },
  {
    key: "store",
    title: "Kelola Toko",
    mode: "store",
    defaultOpen: true,
    items: [
      { href: "/seller/dashboard", label: "Dashboard Toko", icon: LayoutDashboard, desc: "Ringkasan toko dan listing", sellerOnly: true },
      { href: "/seller/dashboard/chat", label: "Pesan", icon: MessageSquare, desc: "Percakapan dengan pelanggan", sellerOnly: true },
      { href: "/seller/dashboard/notifications", label: "Notifikasi", icon: Bell, desc: "Update dan informasi toko", sellerOnly: true },
      { href: "/seller/dashboard/products", label: "Produk", icon: Package, desc: "Kelola produk yang dijual", sellerOnly: true },
      { href: "/seller/dashboard/services", label: "Layanan", icon: Briefcase, desc: "Kelola jasa yang ditawarkan", sellerOnly: true },
      { href: "/seller/dashboard/proposals", label: "Proposal", icon: FileText, desc: "Proposal untuk lowongan", sellerOnly: true },
      { href: "/seller/dashboard/portfolio", label: "Portfolio", icon: FolderOpen, desc: "Showcase hasil kerja", sellerOnly: true },
      { href: "/seller/dashboard/boosts", label: "Boost / Top Ads", icon: Zap, desc: "Tingkatkan visibilitas listing", sellerOnly: true },
      { href: "/seller/dashboard/affiliate", label: "Program Affiliate", icon: Star, desc: "Referral dan bonus affiliate", sellerOnly: true, memberOnly: true },
      { href: "/seller/dashboard/tools", label: "Tools Rekomendasi", icon: Lightbulb, desc: "Tools dan materi pilihan", sellerOnly: true },
      { href: "/seller/dashboard/promotions", label: "Flash Sale", icon: Zap, desc: "Kelola promo toko", sellerOnly: true },
      { href: "/seller/dashboard/subscription", label: "Langganan Toko", icon: CreditCard, desc: "Kelola paket langganan", sellerOnly: true },
      { href: "/seller/dashboard/verification", label: "Verifikasi Toko", icon: ShieldCheck, desc: "Bangun kepercayaan pembeli", sellerOnly: true },
      { href: "/seller/dashboard/physical-verification", label: "Verifikasi Fisik", icon: ShieldCheck, desc: "Verifikasi kunjungan toko", sellerOnly: true, memberOnly: true },
      { href: "/seller/dashboard/store", label: "Kelola Toko", icon: Store, desc: "Atur profil, tampilan, dan CMS toko", sellerOnly: true },
    ],
  },
  {
    key: "account",
    title: "Akun",
    mode: "buyer",
    defaultOpen: false,
    items: [
      { href: "/dashboard/profile", label: "Profil", icon: User, desc: "Edit data diri dan akun" },
      { href: "/dashboard/kyc", label: "Verifikasi KYC", icon: ShieldCheck, desc: "Verifikasi identitas akun" },
    ],
  },
];

function SidebarSection({
  section,
  pathname,
  canSell,
  hasMemberPlan,
  onNavigate,
}: {
  section: MenuSection;
  pathname: string;
  canSell: boolean;
  hasMemberPlan: boolean;
  onNavigate?: () => void;
}) {
  const items = section.items.filter(
    (item) => (!item.sellerOnly || canSell) && (!item.memberOnly || hasMemberPlan),
  );
  const activeItem = items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const [open, setOpen] = useState(section.defaultOpen || Boolean(activeItem));

  if (!items.length) return null;

  return (
    <div className="mb-1">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 transition-colors hover:text-gray-600">
        {section.title}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      <div className={`space-y-0.5 overflow-hidden transition-all ${open ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"}`}>
        {items.map((item) => {
          const isActive = activeItem?.href === item.href;
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate} className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${isActive ? "bg-emerald-50 text-emerald-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}>
              <item.icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium">{item.label}</span>
                <p className={`mt-0.5 text-[11px] leading-tight ${isActive ? "text-emerald-600" : "text-gray-400 group-hover:text-gray-500"}`}>{item.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function getStoreUrl(subdomain: string | null) {
  if (!subdomain || typeof window === "undefined") return null;
  const { host, protocol } = window.location;
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    const port = host.split(":")[1];
    return `${protocol}//${subdomain}.localhost${port ? `:${port}` : ""}`;
  }
  const parts = host.split(".");
  return `${protocol}//${subdomain}.${parts.length >= 2 ? parts.slice(-2).join(".") : host}`;
}

export function UnifiedDashboardLayout({
  children,
  requireSeller = false,
}: {
  children: React.ReactNode;
  requireSeller?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, isLoading } = useAuthStore();
  const [showMobile, setShowMobile] = useState(false);
  const [hasMemberPlan, setHasMemberPlan] = useState(false);
  const [storeSubdomain, setStoreSubdomain] = useState<string | null>(user?.tenantSubdomain || null);
  const [storeName, setStoreName] = useState("");
  const canSell = user?.role === "SELLER";
  const hasStore = Boolean(storeSubdomain || user?.tenantSubdomain);

  useEffect(() => {
    if (user?.tenantSubdomain) setStoreSubdomain(user.tenantSubdomain);
  }, [user?.tenantSubdomain]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
    if (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") router.replace("/admin");
    if (!isLoading && requireSeller && !canSell) router.replace("/dashboard");
  }, [isLoading, isAuthenticated, requireSeller, canSell, router, user?.role]);

  useEffect(() => {
    if (!canSell) return;
    sellerApi
      .getCurrentSubscription()
      .then((response) => {
        setHasMemberPlan(response.data?.tenant?.subscriptionPlan !== "FREE");
        if (response.data?.tenant?.subdomain) setStoreSubdomain(response.data.tenant.subdomain);
        if (response.data?.tenant?.name) setStoreName(response.data.tenant.name);
      })
      .catch(() => setHasMemberPlan(false));
  }, [canSell]);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-emerald-600" /></div>;
  }
  if (!isAuthenticated || (requireSeller && !canSell)) return null;

  const handleLogout = () => {
    logout();
    router.push("/login");
  };
  const storeUrl = getStoreUrl(storeSubdomain || user?.tenantSubdomain || null);
  const isStoreMode = pathname.startsWith("/seller/dashboard");
  const sidebarContent = (onNavigate?: () => void) => (
    <nav>
      <div className="mb-4 space-y-2">
        {isStoreMode && (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Kelola Toko</p>
            <p className="truncate text-sm font-semibold text-emerald-800">{storeName || storeSubdomain || "Toko Saya"}</p>
          </div>
        )}
        <Link href="/" onClick={onNavigate} className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100">
          <Home className="h-4 w-4" /> Jelajahi Marketplace
        </Link>
        <div className="flex gap-2">
          <Link href="/products" onClick={onNavigate} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"><ShoppingBag className="h-3.5 w-3.5" /> Produk</Link>
          <Link href="/services" onClick={onNavigate} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"><Briefcase className="h-3.5 w-3.5" /> Jasa</Link>
        </div>
        {hasStore ? (
          <>
            <Link href={isStoreMode ? "/dashboard" : "/seller/dashboard"} onClick={onNavigate} className="flex items-center gap-3 rounded-lg border border-emerald-200 px-3 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50">
              {isStoreMode ? <ArrowLeft className="h-4 w-4" /> : <Store className="h-4 w-4" />}
              {isStoreMode ? "Kembali" : "Kelola Toko"}
            </Link>
            {storeUrl && <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50"><ExternalLink className="h-3.5 w-3.5" /> Lihat Toko Saya</a>}
          </>
        ) : (
          <Link href="/dashboard/sell" onClick={onNavigate} className="flex items-center gap-3 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"><Store className="h-4 w-4" /> Mulai Berjualan</Link>
        )}
      </div>
      {menuSections
        .filter((section) => !section.mode || section.mode === (isStoreMode ? "store" : "buyer"))
        .map((section) => <SidebarSection key={section.key} section={section} pathname={pathname} canSell={canSell} hasMemberPlan={hasMemberPlan} onNavigate={onNavigate} />)}
    </nav>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between lg:hidden">
        <h2 className="text-lg font-bold text-gray-900">Halo, {user?.firstName || "Pengguna"}!</h2>
        <div className="flex items-center gap-2"><NotificationDropdownEnhanced role={user?.role} /><button type="button" onClick={() => setShowMobile(true)} className="rounded-lg border border-gray-300 p-2 text-gray-600"><Menu className="h-5 w-5" /></button></div>
      </div>
      {showMobile && <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-black/40" onClick={() => setShowMobile(false)} /><div className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-white p-5 shadow-xl"><div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-semibold">Menu</h3><button type="button" onClick={() => setShowMobile(false)}><X className="h-5 w-5 text-gray-500" /></button></div>{sidebarContent(() => setShowMobile(false))}<button type="button" onClick={handleLogout} className="mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" /> Logout</button></div></div>}
      <div className="flex gap-8">
        <aside className="sticky top-6 hidden max-h-[calc(100vh-3rem)] w-60 shrink-0 self-start pr-1 lg:flex lg:flex-col">
          <div className="mb-4 border-b border-gray-200 pb-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0 flex-1"><h2 className="truncate text-lg font-bold text-gray-900">Halo, {user?.firstName || "Pengguna"}!</h2><p className="truncate text-sm text-gray-500">{user?.email}</p></div><div className="relative z-50"><NotificationDropdownEnhanced role={user?.role} /></div></div></div>
          <div className="flex-1 overflow-y-auto">{sidebarContent()}</div>
          <div className="mt-4 border-t border-gray-200 pt-4"><button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" /> Logout</button></div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      {canSell && <FloatingUpgradeButton />}
    </div>
  );
}
