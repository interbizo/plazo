"use client";

import { useEffect, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { sellerApi } from "@/services/seller.service";
import {
  getNotificationRoute,
  getNotificationUiMeta,
} from "@/lib/notification-ui";
import { formatRelativeTime } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";
import toast from "react-hot-toast";
import { getErrorMessage } from "@/lib/api";
import type { Notification } from "@/types";

export default function SellerNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    try {
      const { data } = await sellerApi.getNotifications({ limit: 50 });
      startTransition(() => {
        setNotifications(data.data || (data as unknown as Notification[]) || []);
      });
    } catch {
      startTransition(() => {
        setNotifications([]);
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await sellerApi.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    const route = getNotificationRoute(notification, "SELLER");
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
      await sellerApi.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("Semua notifikasi ditandai dibaca");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setMarkingAll(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifikasi</h1>
          {unread > 0 && (
            <p className="text-sm text-gray-500">{unread} belum dibaca</p>
          )}
        </div>
        {unread > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAllRead}
            isLoading={markingAll}
          >
            <CheckCheck className="h-4 w-4 mr-1.5" />
            Tandai Semua Dibaca
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-12 w-12" />}
          title="Tidak Ada Notifikasi"
          description="Notifikasi akan muncul di sini"
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const { Icon, iconClassName, containerClassName } = getNotificationUiMeta(n.type);
            return (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  n.isRead
                    ? "border-gray-100 bg-white hover:border-gray-200"
                    : `${containerClassName} hover:opacity-95`
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 rounded-full p-2 ${iconClassName}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${n.isRead ? "text-gray-700" : "font-semibold text-gray-900"}`}
                    >
                      {n.title}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatRelativeTime(n.createdAt)}
                    </p>
                  </div>
                  {!n.isRead && (
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
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
