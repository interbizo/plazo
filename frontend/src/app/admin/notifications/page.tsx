"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import {
  getNotificationRoute,
  getNotificationUiMeta,
} from "@/lib/notification-ui";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { Notification } from "@/types";

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const { data } = await api.get("/api/notifications", {
          params: { limit: 50 },
        });
        setNotifications(data?.data || data?.notifications || []);
      } catch (err) {
        toast.error(getErrorMessage(err));
        setNotifications([]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.post(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, isRead: true, readAt: new Date().toISOString() }
            : item,
        ),
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    const route = getNotificationRoute(notification, "ADMIN");
    if (!notification.isRead) {
      void handleMarkAsRead(notification.id);
    }
    if (route) {
      router.push(route);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.post("/api/notifications/read-all");
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
          readAt: new Date().toISOString(),
        })),
      );
      toast.success("Semua notifikasi ditandai dibaca");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifikasi Admin</h1>
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
          description="Notifikasi admin akan muncul di sini saat ada aktivitas penting."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const { Icon, iconClassName, containerClassName } = getNotificationUiMeta(notif.type);
            return (
              <button
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                  notif.isRead
                    ? "border-gray-100 bg-white hover:border-gray-200"
                    : `${containerClassName} hover:opacity-95`
                }`}
              >
                <div className="flex gap-3">
                  <div className={`mt-0.5 rounded-lg p-2 ${iconClassName}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm ${
                        notif.isRead
                          ? "text-gray-700"
                          : "font-medium text-gray-900"
                      }`}
                    >
                      {notif.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
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
