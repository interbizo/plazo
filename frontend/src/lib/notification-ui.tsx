"use client";

import {
  AlertTriangle,
  Bell,
  Briefcase,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  Gift,
  Info,
  MessageSquare,
  Shield,
  ShoppingBag,
  Star,
} from "lucide-react";
import type { Notification, UserRole } from "@/types";

export type NotificationTone = "info" | "success" | "warning" | "critical";

export interface NotificationUiMeta {
  Icon: typeof Bell;
  iconClassName: string;
  containerClassName: string;
  tone: NotificationTone;
  sound: "soft" | "important";
}

export function normalizeNotificationType(type?: string | null) {
  return (type || "system").toUpperCase();
}

export function getNotificationUiMeta(type?: string | null): NotificationUiMeta {
  switch (normalizeNotificationType(type)) {
    case "CHAT":
      return {
        Icon: MessageSquare,
        iconClassName: "text-green-600 bg-green-50",
        containerClassName: "border-green-100 bg-green-50/40",
        tone: "info",
        sound: "soft",
      };
    case "PAYMENT":
      return {
        Icon: CreditCard,
        iconClassName: "text-emerald-600 bg-emerald-50",
        containerClassName: "border-emerald-100 bg-emerald-50/40",
        tone: "success",
        sound: "important",
      };
    case "PROPOSAL":
      return {
        Icon: Briefcase,
        iconClassName: "text-indigo-600 bg-indigo-50",
        containerClassName: "border-indigo-100 bg-indigo-50/40",
        tone: "info",
        sound: "soft",
      };
    case "ORDER":
      return {
        Icon: ShoppingBag,
        iconClassName: "text-blue-600 bg-blue-50",
        containerClassName: "border-blue-100 bg-blue-50/40",
        tone: "info",
        sound: "soft",
      };
    case "REVIEW":
      return {
        Icon: Star,
        iconClassName: "text-amber-600 bg-amber-50",
        containerClassName: "border-amber-100 bg-amber-50/40",
        tone: "info",
        sound: "soft",
      };
    case "KYC":
      return {
        Icon: Shield,
        iconClassName: "text-violet-600 bg-violet-50",
        containerClassName: "border-violet-100 bg-violet-50/40",
        tone: "info",
        sound: "important",
      };
    case "SUBSCRIPTION":
      return {
        Icon: Gift,
        iconClassName: "text-fuchsia-600 bg-fuchsia-50",
        containerClassName: "border-fuchsia-100 bg-fuchsia-50/40",
        tone: "success",
        sound: "important",
      };
    case "VERIFICATION":
      return {
        Icon: FileCheck2,
        iconClassName: "text-teal-600 bg-teal-50",
        containerClassName: "border-teal-100 bg-teal-50/40",
        tone: "success",
        sound: "important",
      };
    case "SYSTEM":
      return {
        Icon: Info,
        iconClassName: "text-gray-600 bg-gray-50",
        containerClassName: "border-gray-100 bg-gray-50/40",
        tone: "warning",
        sound: "soft",
      };
    case "ALERT":
      return {
        Icon: AlertTriangle,
        iconClassName: "text-red-600 bg-red-50",
        containerClassName: "border-red-100 bg-red-50/40",
        tone: "critical",
        sound: "important",
      };
    default:
      return {
        Icon: CheckCircle2,
        iconClassName: "text-gray-600 bg-gray-50",
        containerClassName: "border-gray-100 bg-gray-50/40",
        tone: "info",
        sound: "soft",
      };
  }
}

function getRoleBase(role?: UserRole | string) {
  if (role === "SELLER") return "/seller/dashboard";
  if (role === "ADMIN" || role === "SUPER_ADMIN") return "/admin";
  return "/dashboard";
}

export function getNotificationRoute(
  notif: Notification,
  role?: UserRole | string,
): string | null {
  const base = getRoleBase(role);
  const type = normalizeNotificationType(notif.type);

  if (type === "CHAT") {
    return role === "ADMIN" || role === "SUPER_ADMIN"
      ? "/admin/chats"
      : `${base}/chat`;
  }

  if (!notif.referenceId) {
    if (role === "ADMIN" || role === "SUPER_ADMIN") return "/admin/notifications";
    return `${base}/notifications`;
  }

  switch (type) {
    case "ORDER":
    case "PAYMENT":
      if (role === "ADMIN" || role === "SUPER_ADMIN") {
        return "/admin/subscription-payments";
      }
      return `${base}/chat`;
    case "JOB":
      return role === "SELLER"
        ? "/jobs"
        : role === "ADMIN" || role === "SUPER_ADMIN"
          ? "/admin/jobs"
          : `${base}/jobs/${notif.referenceId}`;
    case "PROPOSAL":
      return role === "SELLER"
        ? `${base}/proposals`
        : role === "ADMIN" || role === "SUPER_ADMIN"
          ? "/admin/jobs"
          : `${base}/jobs`;
    case "REVIEW":
      return role === "ADMIN" || role === "SUPER_ADMIN"
        ? "/admin/reviews"
        : `${base}/reviews`;
    case "KYC":
      return role === "ADMIN" || role === "SUPER_ADMIN"
        ? "/admin/kyc"
        : `${base}/notifications`;
    case "SUBSCRIPTION":
      return role === "SELLER"
        ? "/seller/dashboard/subscription"
        : role === "ADMIN" || role === "SUPER_ADMIN"
          ? "/admin/subscriptions"
          : `${base}/notifications`;
    default:
      return role === "ADMIN" || role === "SUPER_ADMIN"
        ? "/admin/notifications"
        : `${base}/notifications`;
  }
}
