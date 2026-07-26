"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useNotificationStore } from "@/stores/notification.store";
import { connectSocket, disconnectSocket, getSocket, setReconnectCallback } from "@/lib/socket";
import type { Notification } from "@/types";

type NotificationHandler = (notification: Notification) => void;

const listeners = new Set<NotificationHandler>();

let notificationListenerRegistered = false;

/**
 * Initialize socket notification listener.
 * This function ensures the listener is only registered once.
 */
function initSocketListeners() {
  if (notificationListenerRegistered) return;
  
  const socket = getSocket();
  if (!socket) return;

  // Remove any existing listener first to prevent duplicates
  socket.off("notification");

  // Register new listener
  socket.on("notification", (data: Notification) => {
    listeners.forEach((fn) => fn(data));
  });

  notificationListenerRegistered = true;
}

/**
 * Cleanup socket notification listener.
 */
function cleanupSocketListeners() {
  const socket = getSocket();
  if (socket) {
    socket.off("notification");
  }
  notificationListenerRegistered = false;
}

export function useSocket() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const fetchMissedNotifications = useNotificationStore((s) => s.fetchMissedNotifications);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const startPolling = useNotificationStore((s) => s.startPolling);
  const stopPolling = useNotificationStore((s) => s.stopPolling);

  useEffect(() => {
    if (!isAuthenticated) {
      cleanupSocketListeners();
      disconnectSocket();
      stopPolling();
      return;
    }

    let connectionCheckInterval: NodeJS.Timeout | null = null;

    try {
      // Set callback to fetch missed notifications on reconnect
      setReconnectCallback(() => {
        fetchMissedNotifications();
        fetchUnreadCount();
        stopPolling(); // Stop polling when WebSocket reconnects
      });

      connectSocket();
      initSocketListeners();
      
      // Fetch missed notifications and unread count on initial connect
      fetchMissedNotifications();
      fetchUnreadCount();

      // Monitor WebSocket connection health
      // If connection fails for more than 30 seconds, start polling
      let disconnectedTime: number | null = null;

      connectionCheckInterval = setInterval(() => {
        const socket = getSocket();
        
        if (!socket || !socket.connected) {
          if (disconnectedTime === null) {
            disconnectedTime = Date.now();
          } else {
            const disconnectedDuration = Date.now() - disconnectedTime;
            
            // If disconnected for more than 30 seconds, start fallback polling
            if (disconnectedDuration > 30000) {
              startPolling();
            }
          }
        } else {
          // Connected, reset timer and stop polling
          disconnectedTime = null;
          stopPolling();
        }
      }, 5000); // Check every 5 seconds

    } catch (err) {
      // Connection failed, start polling immediately
      if (process.env.NODE_ENV === "development") {
        console.warn("[Socket] Failed to connect, starting fallback polling:", err);
      }
      startPolling();
    }

    return () => {
      // Cleanup on unmount
      if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval);
      }
    };
  }, [isAuthenticated, fetchMissedNotifications, fetchUnreadCount, startPolling, stopPolling]);
}

export function useNotificationSocket(handler: NotificationHandler) {
  const handlerRef = useRef(handler);
  
  // Update handler ref when handler changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const fn: NotificationHandler = (n) => handlerRef.current(n);
    listeners.add(fn);
    
    return () => {
      listeners.delete(fn);
    };
  }, []);
}
