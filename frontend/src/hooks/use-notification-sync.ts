"use client";

import { useEffect } from "react";
import { useNotificationStore } from "@/stores/notification.store";

/**
 * Hook to sync notification state across browser tabs using BroadcastChannel API.
 * This ensures that when a notification is marked as read in one tab,
 * all other tabs are updated automatically.
 */
export function useNotificationSync() {
  const { notifications, unreadCount } = useNotificationStore();

  useEffect(() => {
    // Check if BroadcastChannel is supported
    if (typeof BroadcastChannel === "undefined") {
      if (process.env.NODE_ENV === "development") {
        console.warn("[Notifications] BroadcastChannel not supported in this browser");
      }
      return;
    }

    const channel = new BroadcastChannel("plazo_notifications");

    channel.onmessage = (event) => {
      const { type, id } = event.data;

      if (type === "MARK_READ" && id) {
        // Update local state when another tab marks a notification as read
        useNotificationStore.setState((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }));
      } else if (type === "MARK_ALL_READ") {
        // Update local state when another tab marks all as read
        useNotificationStore.setState((state) => ({
          notifications: state.notifications.map((n) => ({
            ...n,
            isRead: true,
            readAt: new Date().toISOString(),
          })),
          unreadCount: 0,
        }));
      }
    };

    return () => {
      channel.close();
    };
  }, [notifications, unreadCount]);
}
