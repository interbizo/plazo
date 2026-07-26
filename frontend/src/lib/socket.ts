"use client";

import { io, Socket } from "socket.io-client";
import { tokenStorage } from "@/lib/api";

let socket: Socket | null = null;
let onReconnectCallback: (() => void) | null = null;
let isSocketInitialized = false;

export function getSocket(): Socket | null {
  return socket;
}

export function setReconnectCallback(callback: () => void) {
  onReconnectCallback = callback;
}

export function isSocketConnected(): boolean {
  return socket?.connected || false;
}

export function connectSocket(): Socket {
  // If socket exists and is connected, return it
  if (socket?.connected) return socket;

  // If socket exists but disconnected, try to reconnect
  if (socket && !socket.connected) {
    socket.connect();
    return socket;
  }

  const token = tokenStorage.getAccessToken();
  if (!token) throw new Error("No auth token");

  // Create new socket instance
  socket = io(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001", {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 5000,
  });

  // Only register event listeners once
  if (!isSocketInitialized) {
    socket.on("connect", () => {
      if (process.env.NODE_ENV === "development") {
        console.log("[Socket] Connected:", socket?.id);
      }
      
      // Call reconnect callback to fetch missed notifications
      if (onReconnectCallback) {
        onReconnectCallback();
      }
    });

    socket.on("disconnect", (reason) => {
      if (process.env.NODE_ENV === "development") {
        console.log("[Socket] Disconnected:", reason);
      }
    });

    socket.on("connect_error", (err) => {
      if (process.env.NODE_ENV === "development") {
        console.warn("[Socket] Connection error:", err.message);
      }
    });

    isSocketInitialized = true;
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    // Remove all listeners before disconnect to prevent memory leaks
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  onReconnectCallback = null;
  isSocketInitialized = false;
}
