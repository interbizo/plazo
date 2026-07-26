"use client";

import type { Notification } from "@/types";
import { getNotificationRoute, getNotificationUiMeta } from "@/lib/notification-ui";

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
let audioContext: AudioContext | null = null;

type NotificationOptionsWithRenotify = NotificationOptions & {
  renotify?: boolean;
};

export function registerNotificationServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }

  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker
      .register("/notification-sw.js")
      .then(() => navigator.serviceWorker.ready)
      .catch(() => null);
  }

  return registrationPromise;
}

export async function requestBrowserNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied" as NotificationPermission;
  }

  if (Notification.permission !== "default") {
    return Notification.permission;
  }

  return Notification.requestPermission();
}

function playTone(kind: "soft" | "important") {
  if (typeof window === "undefined") return;
  const AudioCtx =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioCtx) return;

  audioContext = audioContext || new AudioCtx();
  const ctx = audioContext;
  const now = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(kind === "important" ? 880 : 620, now);
  if (kind === "important") {
    oscillator.frequency.linearRampToValueAtTime(660, now + 0.16);
  }

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(kind === "important" ? 0.08 : 0.04, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "important" ? 0.28 : 0.18));

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + (kind === "important" ? 0.3 : 0.2));
}

export async function showBrowserNotification(
  notif: Notification,
  role?: string,
) {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  const registration = await registerNotificationServiceWorker();
  if (!registration) return;

  const route = getNotificationRoute(notif, role);
  const meta = getNotificationUiMeta(notif.type);

  playTone(meta.sound);

  if (!document.hidden) {
    return;
  }

  const options: NotificationOptionsWithRenotify = {
    body: notif.message,
    tag: `${notif.type}-${notif.referenceId || notif.id}`,
    renotify: meta.sound === "important",
    data: {
      url: route || "/",
      notificationId: notif.id,
    },
  };

  await registration.showNotification(notif.title, options);
}
