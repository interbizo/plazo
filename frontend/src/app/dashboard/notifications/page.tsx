"use client";

import { useEffect, useState } from "react";
import { buyerApi } from "@/services/buyer.service";
import { getErrorMessage } from "@/lib/api";
import { getNotificationUiMeta } from "@/lib/notification-ui";
import { formatRelativeTime } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";
import toast from "react-hot-toast";
import type { Notification } from "@/types";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const { data } = await buyerApi.getNotifications({ limit: 50 });
        const items = data.data ?? (Array.isArray(data) ? data : []);
        setNotifications(items as Notification[]);
      } catch {
        // Silently fallback to empty — user sees "no notifications" empty state
        setNotifications([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await buyerApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await buyerApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("Semua notifikasi ditandai dibaca");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifikasi</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500">{unreadCount} belum dibaca</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            isLoading={markingAll}
          >
            <CheckCheck className="mr-1.5 h-4 w-4" />
            Tandai semua dibaca
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-12 w-12 text-gray-300" />}
          title="Tidak ada notifikasi"
          description="Notifikasi akan muncul di sini saat ada update."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const { Icon, iconClassName, containerClassName } = getNotificationUiMeta(notif.type);
            return (
              <button
                key={notif.id}
                onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                className={`w-full text-left rounded-xl border p-4 transition-colors ${
                  notif.isRead
                    ? "border-gray-100 bg-white hover:border-gray-200"
                    : `${containerClassName} hover:opacity-95`
                }`}
              >
                <div className="flex gap-3">
                  <div className={`mt-0.5 rounded-lg p-2 ${iconClassName}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        notif.isRead
                          ? "text-gray-700"
                          : "font-medium text-gray-900"
                      }`}
                    >
                      {notif.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {formatRelativeTime(notif.createdAt)}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
