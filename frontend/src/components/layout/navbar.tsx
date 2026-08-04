"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useNotificationStore } from "@/stores/notification.store";
import { Avatar } from "@/components/ui/avatar";
import {
  getNotificationRoute,
} from "@/lib/notification-ui";
import { getSubdomainLink } from "@/lib/domain";
import type { Notification } from "@/types";
import {
  Menu,
  X,
  Search,
  ChevronDown,
  LogOut,
  User,
  LayoutDashboard,
  Store,
  ShoppingBag,
  Briefcase,
  Palette,
  Newspaper,
} from "lucide-react";

interface NavbarProps {
  settings?: Record<string, string>;
}

export function Navbar({ settings = {} }: NavbarProps) {
  const { user, isAuthenticated, logout, isLoading: authLoading } = useAuthStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState<"products" | "services" | "jobs">("products");
  const profileRef = useRef<HTMLDivElement>(null);

  const siteName = settings.site_name || "Plazo";
  const siteLogo = settings.site_logo;

  // Fetch counts on auth
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
    }
  }, [isAuthenticated, fetchUnreadCount]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isDashboard =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/seller") ||
    pathname.startsWith("/admin");
  if (isDashboard) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/${searchCategory}?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const navLinks = [
    { href: "/products", label: "Produk", icon: ShoppingBag },
    { href: "/services", label: "Jasa", icon: Palette },
    { href: "/jobs", label: "Cari Vendor", icon: Briefcase },
    { href: "/articles", label: "Artikel", icon: Newspaper },
  ];

  return (
    <nav className="sticky top-0 z-40">
      {/* Top utility bar */}
      <div className="bg-blue-700 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-8 items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline text-blue-200">
                {settings.site_tagline || `Selamat datang di ${siteName}`}
              </span>
            </div>
            <div className="flex items-center gap-4">
              {authLoading ? (
                // Show skeleton while loading auth state
                <div className="flex items-center gap-4">
                  <div className="h-4 w-16 bg-blue-600 rounded animate-pulse" />
                  <span className="text-blue-400">|</span>
                  <div className="h-4 w-16 bg-blue-600 rounded animate-pulse" />
                </div>
              ) : isAuthenticated && user ? (
                <Link
                  href={
                    user.role === "SELLER"
                      ? "/seller/dashboard"
                      : user.role === "ADMIN" || user.role === "SUPER_ADMIN"
                        ? "/admin"
                        : "/dashboard"
                  }
                  className="text-blue-200 hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-blue-200 hover:text-white transition-colors"
                  >
                    Masuk
                  </Link>
                  <span className="text-blue-400">|</span>
                  <Link
                    href="/register"
                    className="text-blue-200 hover:text-white transition-colors"
                  >
                    Daftar
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <div className="bg-blue-600 shadow-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center gap-4 sm:gap-6">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              {siteLogo ? (
                <Image
                  src={siteLogo}
                  alt={siteName}
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
                  <span className="text-sm font-bold text-blue-600">
                    {siteName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-xl font-bold text-white hidden sm:block">
                {siteName}
              </span>
            </Link>

            {/* Search bar with category selector */}
            <form onSubmit={handleSearch} className="flex-1 min-w-0 max-w-2xl">
              <div className="flex">
                <select
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value as "products" | "services" | "jobs")}
                  className="hidden sm:block rounded-l-sm border-r border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 focus:outline-none cursor-pointer"
                >
                  <option value="products">Produk</option>
                  <option value="services">Jasa</option>
                  <option value="jobs">Cari Vendor</option>
                </select>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    searchCategory === "products"
                      ? "Cari produk..."
                      : searchCategory === "services"
                        ? "Cari jasa atau freelancer..."
                        : "Cari vendor atau freelancer..."
                  }
                  className="w-full sm:rounded-l-none rounded-l-sm bg-white px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-r-sm bg-blue-800 px-4 hover:bg-blue-900 transition-colors"
                >
                  <Search className="h-5 w-5 text-white" />
                </button>
              </div>
            </form>

            {/* Right actions */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {authLoading ? (
                // Show skeleton while loading
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-white/20 rounded-full animate-pulse" />
                  <div className="hidden lg:block h-4 w-20 bg-white/20 rounded animate-pulse" />
                </div>
              ) : isAuthenticated && user ? (
                <>
                  {/* Notification dropdown (navbar variant - white icons) */}
                  <NavbarNotificationBell role={user.role} unreadCount={unreadCount} />

                  {/* Profile dropdown */}
                  <div className="relative" ref={profileRef}>
                    <button
                      onClick={() => setProfileOpen(!profileOpen)}
                      className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-white/10 transition-colors"
                    >
                      <Avatar
                        src={user.avatar}
                        firstName={user.firstName}
                        lastName={user.lastName}
                        size="sm"
                      />
                      <span className="hidden lg:block text-sm font-medium text-white">
                        {user.firstName}
                      </span>
                      <ChevronDown className="hidden lg:block h-4 w-4 text-white/60" />
                    </button>

                    {profileOpen && (
                      <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
                        <div className="px-4 py-2.5 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>

                        <Link
                          href={
                            user.role === "SELLER"
                              ? "/seller/dashboard"
                              : user.role === "ADMIN" ||
                                  user.role === "SUPER_ADMIN"
                                ? "/admin"
                                : "/dashboard"
                          }
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                          onClick={() => setProfileOpen(false)}
                        >
                          <LayoutDashboard className="h-4 w-4" />
                          Dashboard
                        </Link>

                        {user.role === "SELLER" && user.tenantSubdomain && (
                          <a
                            href={getSubdomainLink(user.tenantSubdomain)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                            onClick={() => setProfileOpen(false)}
                          >
                            <Store className="h-4 w-4" />
                            My Store
                          </a>
                        )}

                        <Link
                          href={
                            user.role === "SELLER"
                              ? "/seller/dashboard/profile"
                              : user.role === "ADMIN" || user.role === "SUPER_ADMIN"
                                ? "/dashboard/profile"
                                : "/dashboard/profile"
                          }
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                          onClick={() => setProfileOpen(false)}
                        >
                          <User className="h-4 w-4" />
                          Profile
                        </Link>

                        <div className="border-t border-gray-100">
                          <button
                            onClick={() => {
                              setProfileOpen(false);
                              logout();
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <LogOut className="h-4 w-4" />
                            Logout
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Link
                    href="/login"
                    className="rounded-sm border border-white/30 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
                  >
                    Masuk
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-sm bg-white px-4 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    Daftar
                  </Link>
                </div>
              )}

              {/* Mobile toggle */}
              <button
                className="md:hidden rounded-lg p-2 text-white/80 hover:text-white hover:bg-white/10"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom nav links — desktop */}
      <div className="hidden md:block bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8 h-10 text-sm">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 font-medium transition-colors ${
                    isActive
                      ? "text-blue-600"
                      : "text-gray-600 hover:text-blue-600"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="bg-white border-b border-gray-200 md:hidden">
          <div className="space-y-1 px-4 py-3">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
            {!isAuthenticated && (
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100 mt-2">
                <Link
                  href="/login"
                  className="flex-1 rounded-lg border border-blue-600 px-3 py-2 text-center text-sm font-medium text-blue-600"
                  onClick={() => setMobileOpen(false)}
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-center text-sm font-medium text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

/**
 * Navbar-specific notification bell with white styling for the blue navbar.
 * Uses the shared NotificationDropdown internally.
 */
function NavbarNotificationBell({ role, unreadCount }: { role: string; unreadCount: number }) {
  const { isOpen, toggle, setOpen } = useNotificationStore();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, setOpen]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative rounded-lg p-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Notifikasi"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <NavbarNotificationPanel role={role} />
      )}
    </div>
  );
}

/**
 * The notification panel that appears under the navbar bell.
 * Reuses the same store and logic as NotificationDropdown but styled for navbar context.
 */
function NavbarNotificationPanel({ role }: { role: string }) {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isLoading,
    setOpen,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const ICON_MAP: Record<string, string> = {
    ORDER: "text-blue-500",
    order: "text-blue-500",
    JOB: "text-purple-500",
    job: "text-purple-500",
    CHAT: "text-green-500",
    chat: "text-green-500",
    REVIEW: "text-yellow-500",
    review: "text-yellow-500",
    PAYMENT: "text-emerald-500",
    payment: "text-emerald-500",
  };
  void ICON_MAP;

  const handleClick = (notif: Notification) => {
    const route = getNotificationRoute(notif, role) || "/dashboard";
    if (!notif.isRead) {
      void markAsRead(notif.id);
    }
    router.push(route);
    setOpen(false);
  };

  return (
    <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Notifikasi</h3>
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
              {unreadCount} baru
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Tandai dibaca
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-200 mb-2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            <p className="text-sm text-gray-400">Belum ada notifikasi</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`group flex gap-3 px-4 py-3 cursor-pointer transition-colors ${
                notif.isRead ? "hover:bg-gray-50" : "bg-blue-50/40 hover:bg-blue-50/60"
              }`}
              onClick={() => handleClick(notif)}
            >
              {/* Dot */}
              {!notif.isRead && (
                <div className="shrink-0 mt-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                </div>
              )}
              {notif.isRead && <div className="shrink-0 w-2" />}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${notif.isRead ? "text-gray-600" : "text-gray-900 font-medium"}`}>
                  {notif.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{notif.message}</p>
                <p className="text-[10px] text-gray-300 mt-1">
                  {(() => {
                    const now = new Date();
                    const d = new Date(notif.createdAt);
                    const diff = now.getTime() - d.getTime();
                    const mins = Math.floor(diff / 60000);
                    const hrs = Math.floor(mins / 60);
                    const days = Math.floor(hrs / 24);
                    if (days > 0) return `${days}h lalu`;
                    if (hrs > 0) return `${hrs}j lalu`;
                    if (mins > 0) return `${mins}m lalu`;
                    return "Baru saja";
                  })()}
                </p>
              </div>

              {/* Delete */}
              <button
                onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                className="opacity-0 group-hover:opacity-100 shrink-0 self-center rounded p-1 text-gray-300 hover:text-red-500 transition-all"
                title="Hapus"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-2.5">
          <button
            onClick={() => {
              const path = role === "SELLER"
                ? "/seller/dashboard/notifications"
                : role === "ADMIN" || role === "SUPER_ADMIN"
                  ? "/admin/notifications"
                  : "/dashboard/notifications";
              router.push(path);
              setOpen(false);
            }}
            className="w-full text-center text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Lihat semua notifikasi
          </button>
        </div>
      )}
    </div>
  );
}
