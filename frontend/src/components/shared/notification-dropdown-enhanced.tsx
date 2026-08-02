"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useNotificationStore } from "@/stores/notification.store";
import { formatRelativeTime } from "@/lib/utils";
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  Filter,
  Search,
  ChevronDown,
  Loader2,
} from "lucide-react";
import type { Notification } from "@/types";
import {
  getNotificationRoute,
  getNotificationUiMeta,
} from "@/lib/notification-ui";

interface NotificationDropdownEnhancedProps {
  role?: string;
}

type FilterType =
  | "all"
  | "unread"
  | "order"
  | "job"
  | "proposal"
  | "chat"
  | "payment"
  | "system";

export function NotificationDropdownEnhanced({
  role,
}: NotificationDropdownEnhancedProps) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    notifications,
    unreadCount,
    isLoading,
    isOpen,
    toggle,
    setOpen,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationStore();

  // Local state for filters and pagination
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  // Always position dropdown to the right
  const dropdownPosition = "right";

  // Fetch unread count on mount
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, setOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKey);
    }
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, setOpen]);

  // Reset pagination when filter or search changes
  useEffect(() => {
    setPage(1);
    setHasMore(true);
  }, [filter, searchQuery]);

  // Filter notifications based on selected filter and search query
  const filteredNotifications = notifications.filter((notif) => {
    // Filter by type
    if (filter === "unread" && notif.isRead) return false;
    if (filter !== "all" && filter !== "unread") {
      const notifType = notif.type.toLowerCase();
      if (notifType !== filter) return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchTitle = notif.title.toLowerCase().includes(query);
      const matchMessage = notif.message.toLowerCase().includes(query);
      return matchTitle || matchMessage;
    }

    return true;
  });

  // Paginate filtered notifications
  const paginatedNotifications = filteredNotifications.slice(0, page * 10);

  // Check if there are more notifications to load
  useEffect(() => {
    setHasMore(paginatedNotifications.length < filteredNotifications.length);
  }, [paginatedNotifications.length, filteredNotifications.length]);

  const handleNotifClick = (notif: Notification) => {
    const route = getNotificationRoute(notif, role);
    if (!notif.isRead) {
      void markAsRead(notif.id);
    }
    if (route) {
      router.push(route);
      setOpen(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    // Simulate loading delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 300));
    setPage((prev) => prev + 1);
    setLoadingMore(false);
  };

  // Scroll to top when filter changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [filter, searchQuery]);

  const filterOptions: { value: FilterType; label: string; count?: number }[] =
    [
      { value: "all", label: "Semua", count: notifications.length },
      { value: "unread", label: "Belum Dibaca", count: unreadCount },
      { value: "order", label: "Pesanan" },
      { value: "job", label: "Pekerjaan" },
      { value: "proposal", label: "Proposal" },
      { value: "chat", label: "Pesan" },
      { value: "payment", label: "Pembayaran" },
      { value: "system", label: "Sistem" },
    ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button - Improved clickable area */}
      <button
        ref={buttonRef}
        onClick={toggle}
        className="relative rounded-lg p-2.5 md:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-all duration-150 touch-manipulation min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
        aria-label="Notifikasi"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5 md:h-5 md:w-5" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white ring-2 ring-white shadow-sm animate-in fade-in zoom-in duration-200"
            aria-label={`${unreadCount} notifikasi belum dibaca`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel with smooth animation */}
      {isOpen && (
        <div
          className={`absolute ${dropdownPosition === "right" ? "right-0" : "left-0"} top-full z-50 mt-2 w-96 rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200`}
          role="dialog"
          aria-label="Panel notifikasi"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  Notifikasi
                </h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600 animate-in fade-in zoom-in duration-200">
                    {unreadCount} baru
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`rounded-md p-1.5 transition-all duration-150 min-w-[32px] min-h-[32px] flex items-center justify-center ${
                    showFilters
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  }`}
                  title="Filter"
                  aria-label="Toggle filter"
                  aria-pressed={showFilters}
                >
                  <Filter className="h-4 w-4" />
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="rounded-md p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-150 min-w-[32px] min-h-[32px] flex items-center justify-center"
                    title="Tandai semua dibaca"
                    aria-label="Tandai semua notifikasi sebagai dibaca"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150 min-w-[32px] min-h-[32px] flex items-center justify-center"
                  aria-label="Tutup panel notifikasi"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari notifikasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150"
                aria-label="Cari notifikasi"
              />
            </div>

            {/* Filter chips with smooth animation */}
            {showFilters && (
              <div className="mt-3 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFilter(option.value)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-150 touch-manipulation ${
                      filter === option.value
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
                    }`}
                    aria-pressed={filter === option.value}
                  >
                    {option.label}
                    {option.count !== undefined && ` (${option.count})`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notification list with smooth scroll */}
          <div
            ref={scrollRef}
            className="max-h-[60vh] md:max-h-[400px] overflow-y-auto overscroll-contain"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
              </div>
            ) : paginatedNotifications.length === 0 ? (
              <div className="py-12 text-center animate-in fade-in duration-300">
                <Bell className="mx-auto h-10 w-10 text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">
                  {searchQuery || filter !== "all"
                    ? "Tidak ada notifikasi yang cocok"
                    : "Belum ada notifikasi"}
                </p>
              </div>
            ) : (
              <div>
                {paginatedNotifications.map((notif, index) => {
                  const { Icon, iconClassName } = getNotificationUiMeta(
                    notif.type,
                  );
                  return (
                    <div
                      key={notif.id}
                      className={`group relative flex gap-3 px-4 py-3 cursor-pointer transition-all duration-150 border-b border-gray-50 last:border-0 touch-manipulation animate-in fade-in slide-in-from-top-1 ${
                        notif.isRead
                          ? "hover:bg-gray-50 active:bg-gray-100"
                          : "bg-blue-50/40 hover:bg-blue-50/70 active:bg-blue-50"
                      }`}
                      onClick={() => handleNotifClick(notif)}
                      style={{ animationDelay: `${index * 20}ms` }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleNotifClick(notif);
                        }
                      }}
                    >
                      {/* Unread dot */}
                      {!notif.isRead && (
                        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                      )}

                      {/* Icon */}
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconClassName} transition-transform duration-150 group-hover:scale-110`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm leading-snug ${notif.isRead ? "text-gray-600" : "text-gray-900 font-medium"}`}
                        >
                          {notif.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-gray-300 mt-1">
                          {formatRelativeTime(notif.createdAt)}
                        </p>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 shrink-0 self-center rounded-md p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all duration-150 min-w-[28px] min-h-[28px] flex items-center justify-center"
                        title="Hapus"
                        aria-label="Hapus notifikasi"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}

                {/* Load More button */}
                {hasMore && (
                  <div className="px-4 py-3 border-t border-gray-100">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400 transition-all duration-150 rounded-lg hover:bg-blue-50 active:bg-blue-100 touch-manipulation"
                      aria-label="Muat lebih banyak notifikasi"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Memuat...
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          Muat lebih banyak
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {paginatedNotifications.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50/50">
              <button
                onClick={() => {
                  const path =
                    role === "SELLER"
                      ? "/seller/dashboard/notifications"
                      : role === "ADMIN" || role === "SUPER_ADMIN"
                        ? "/admin/notifications"
                        : "/dashboard/notifications";
                  router.push(path);
                  setOpen(false);
                }}
                className="w-full text-center text-xs font-medium text-blue-600 hover:text-blue-700 transition-all duration-150 py-1 rounded hover:bg-blue-50 active:bg-blue-100 touch-manipulation"
                aria-label="Lihat semua notifikasi"
              >
                Lihat semua notifikasi
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
