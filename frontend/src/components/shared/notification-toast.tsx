"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useNotificationSocket } from "@/hooks/use-socket";
import { useNotificationSync } from "@/hooks/use-notification-sync";
import { useNotificationStore } from "@/stores/notification.store";
import { useAuthStore } from "@/stores/auth.store";
import type { Notification } from "@/types";
import {
  getNotificationRoute,
  getNotificationUiMeta,
} from "@/lib/notification-ui";
import {
  registerNotificationServiceWorker,
  requestBrowserNotificationPermission,
  showBrowserNotification,
} from "@/lib/browser-notifications";

function showNotificationToast(notif: Notification, onOpen?: () => void) {
  const { Icon, iconClassName } = getNotificationUiMeta(notif.type);

  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? "animate-enter" : "animate-leave"
        } pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl bg-white p-4 shadow-lg ring-1 ring-gray-900/5`}
        onClick={() => {
          toast.dismiss(t.id);
          onOpen?.();
        }}
        role="alert"
      >
        <div className={`shrink-0 rounded-full p-2 ${iconClassName}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-gray-900">
            {notif.title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
            {notif.message}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toast.dismiss(t.id);
          }}
          className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    ),
    {
      duration: 5000,
      position: "top-right",
    },
  );
}

export function NotificationToastListener() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const addNotification = useNotificationStore((s) => s.addNotification);

  // Enable cross-tab notification sync
  useNotificationSync();

  useNotificationSocket((notif) => {
    if (!isAuthenticated) return;
    addNotification(notif);
    const route = getNotificationRoute(notif, user?.role);
    showNotificationToast(notif, () => {
      if (route) {
        router.push(route);
      }
    });
    void showBrowserNotification(notif, user?.role);
  });

  useEffect(() => {
    if (!isAuthenticated) return;

    void registerNotificationServiceWorker();
    const timer = window.setTimeout(() => {
      void requestBrowserNotificationPermission();
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [isAuthenticated]);

  return null;
}
