"use client";

import { create } from "zustand";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "@/lib/api";
import type { Notification } from "@/types";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isOpen: boolean;
  pollingEnabled: boolean;
  pollingInterval: number | null;

  // Actions
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  fetchMissedNotifications: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  broadcastMarkAsRead: (id: string) => void;
  startPolling: () => void;
  stopPolling: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isOpen: false,
  pollingEnabled: false,
  pollingInterval: null,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get("/api/notifications", {
        params: { limit: 20 },
      });
      const items = data?.data || data?.notifications || [];
      set({ notifications: items, isLoading: false });
    } catch (err) {
      toast.error(getErrorMessage(err));
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const { data } = await api.get("/api/notifications/unread-count");
      set({ unreadCount: data?.unreadCount || 0 });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  },

  fetchMissedNotifications: async () => {
    try {
      // Get last fetch timestamp from localStorage
      const lastFetch = localStorage.getItem("plazo_last_notif_fetch");
      
      if (!lastFetch) {
        // First time, just fetch recent notifications
        await get().fetchNotifications();
        localStorage.setItem("plazo_last_notif_fetch", new Date().toISOString());
        return;
      }

      // Fetch notifications created after last fetch
      const { data } = await api.get("/api/notifications", {
        params: { 
          limit: 50,
          // Backend will handle filtering by createdAt if needed
        },
      });

      const items = data?.data || data?.notifications || [];
      
      // Filter notifications created after last fetch
      const lastFetchDate = new Date(lastFetch);
      const missedNotifications = items.filter((notif: Notification) => {
        const notifDate = new Date(notif.createdAt);
        return notifDate > lastFetchDate;
      });

      // Add missed notifications to store
      missedNotifications.forEach((notif: Notification) => {
        get().addNotification(notif);
      });

      // Update last fetch timestamp
      localStorage.setItem("plazo_last_notif_fetch", new Date().toISOString());

      if (process.env.NODE_ENV === "development") {
        console.log(`[Notifications] Fetched ${missedNotifications.length} missed notifications`);
      }
    } catch (err) {
      // Silent fail - don't show error to user
      if (process.env.NODE_ENV === "development") {
        console.error("[Notifications] Failed to fetch missed notifications:", err);
      }
    }
  },

  addNotification: (notification) => {
    set((state) => {
      const existingIndex = state.notifications.findIndex(
        (item) => item.id === notification.id,
      );

      const notifications =
        existingIndex >= 0
          ? state.notifications.map((item) =>
              item.id === notification.id ? notification : item,
            )
          : [notification, ...state.notifications].slice(0, 20);

      const shouldIncrement =
        !notification.isRead &&
        state.notifications.every((item) => item.id !== notification.id);

      return {
        notifications,
        unreadCount: shouldIncrement
          ? state.unreadCount + 1
          : state.unreadCount,
      };
    });
  },

  markAsRead: async (id) => {
    try {
      await api.post(`/api/notifications/${id}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
      
      // Broadcast to other tabs
      get().broadcastMarkAsRead(id);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  },

  markAllAsRead: async () => {
    try {
      await api.post("/api/notifications/read-all");
      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          isRead: true,
          readAt: new Date().toISOString(),
        })),
        unreadCount: 0,
      }));
      
      // Broadcast to other tabs
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("plazo_notifications");
        channel.postMessage({ type: "MARK_ALL_READ" });
        channel.close();
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  },

  deleteNotification: async (id) => {
    try {
      await api.delete(`/api/notifications/${id}`);
      set((state) => {
        const notif = state.notifications.find((n) => n.id === id);
        return {
          notifications: state.notifications.filter((n) => n.id !== id),
          unreadCount:
            notif && !notif.isRead
              ? Math.max(0, state.unreadCount - 1)
              : state.unreadCount,
        };
      });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  },

  setOpen: (open) => {
    set({ isOpen: open });
    // Fetch fresh data when opening
    if (open) {
      get().fetchNotifications();
    }
  },

  toggle: () => {
    const isOpen = !get().isOpen;
    set({ isOpen });
    if (isOpen) {
      get().fetchNotifications();
    }
  },

  broadcastMarkAsRead: (id: string) => {
    // Use BroadcastChannel for cross-tab communication
    if (typeof BroadcastChannel !== "undefined") {
      try {
        const channel = new BroadcastChannel("plazo_notifications");
        channel.postMessage({ type: "MARK_READ", id });
        channel.close();
      } catch (err) {
        // BroadcastChannel not supported or error, ignore silently
        if (process.env.NODE_ENV === "development") {
          console.warn("[Notifications] BroadcastChannel error:", err);
        }
      }
    }
  },

  /**
   * Start polling for notifications as fallback when WebSocket is unavailable.
   * Uses smart polling: 10s interval, stops when WebSocket reconnects.
   */
  startPolling: () => {
    const state = get();
    
    // Don't start if already polling
    if (state.pollingInterval !== null) {
      return;
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[Notifications] Starting fallback polling (WebSocket unavailable)");
    }

    // Poll every 10 seconds
    const interval = window.setInterval(() => {
      get().fetchMissedNotifications();
      get().fetchUnreadCount();
    }, 10000);

    set({ pollingEnabled: true, pollingInterval: interval });
  },

  /**
   * Stop polling when WebSocket reconnects.
   */
  stopPolling: () => {
    const state = get();
    
    if (state.pollingInterval !== null) {
      if (process.env.NODE_ENV === "development") {
        console.log("[Notifications] Stopping fallback polling (WebSocket reconnected)");
      }
      
      window.clearInterval(state.pollingInterval);
      set({ pollingEnabled: false, pollingInterval: null });
    }
  },
}));
