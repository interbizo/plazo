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

// Memeriksa apakah penerima notifikasi menggunakan route dashboard admin.
function isAdminRole(role?: UserRole | string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

// Mengembalikan tujuan aman berdasarkan role bila detail notifikasi belum didukung.
function getFallbackRoute(role?: UserRole | string) {
  return isAdminRole(role)
    ? "/admin/notifications"
    : `${getRoleBase(role)}/notifications`;
}

// Menambahkan satu query parameter yang sudah di-encode bila nilainya tersedia.
function appendQuery(path: string, key: string, value?: string | null) {
  if (!value) return path;
  return `${path}?${key}=${encodeURIComponent(value)}`;
}

// Membuat route chat sesuai role dan dapat memilih room chat tertentu.
function getChatRoute(role?: UserRole | string, roomId?: string | null) {
  const path = isAdminRole(role) ? "/admin/chat" : `${getRoleBase(role)}/chat`;
  return appendQuery(path, "room", roomId);
}

// Menormalkan reference type dari backend sebelum dicocokkan dengan route.
function normalizeReferenceType(referenceType?: string | null) {
  return (referenceType || "").toLowerCase();
}

// Membaca string dari metadata notifikasi tanpa type cast yang tidak aman.
function getMetadataString(notif: Notification, key: string) {
  const value = notif.metadata?.[key];
  return typeof value === "string" && value ? value : undefined;
}

export function getNotificationRoute(
  notif: Notification,
  role?: UserRole | string,
): string | null {
  const base = getRoleBase(role);
  const type = normalizeNotificationType(notif.type);
  const referenceType = normalizeReferenceType(notif.referenceType);
  const referenceId = notif.referenceId || undefined;
  const roomId = getMetadataString(notif, "roomId");

  switch (referenceType) {
    case "chat":
    case "chat_room":
    case "chatroom":
      return getChatRoute(role, roomId || referenceId);
    case "chat_transaction":
      return getChatRoute(role, roomId);
    case "report":
      if (isAdminRole(role)) return appendQuery("/admin/reports", "reportId", referenceId);
      if (!referenceId) return `${base}/reports`;
      return role === "SELLER"
        ? `/seller/dashboard/reports/${referenceId}`
        : `/dashboard/reports/${referenceId}`;
    case "job":
      if (isAdminRole(role)) return "/admin/jobs";
      return role === "SELLER"
        ? "/jobs"
        : referenceId
          ? `/dashboard/jobs/${referenceId}`
          : `${base}/jobs`;
    case "proposal":
      return role === "SELLER"
        ? "/seller/dashboard/proposals"
        : isAdminRole(role)
          ? "/admin/jobs"
          : "/dashboard/jobs";
    case "order":
      return getChatRoute(role);
    case "subscription_payment":
      return isAdminRole(role)
        ? appendQuery("/admin/subscription-payments", "paymentId", referenceId)
        : "/seller/dashboard/subscription";
    case "user":
      if (type === "KYC") {
        return isAdminRole(role)
          ? appendQuery("/admin/kyc", "userId", referenceId)
          : role === "SELLER"
            ? "/seller/dashboard/verification"
            : "/dashboard/kyc";
      }
      return isAdminRole(role)
        ? appendQuery("/admin/users", "userId", referenceId)
        : `${base}/profile`;
    case "physical_verification":
      return isAdminRole(role)
        ? appendQuery("/admin/physical-verifications", "verificationId", referenceId)
        : "/seller/dashboard/physical-verification";
    case "product":
      return isAdminRole(role)
        ? appendQuery("/admin/products", "productId", referenceId)
        : "/seller/dashboard/products";
    case "service":
      return isAdminRole(role)
        ? appendQuery("/admin/services", "serviceId", referenceId)
        : "/seller/dashboard/services";
    case "review":
      return isAdminRole(role)
        ? appendQuery("/admin/reviews", "reviewId", referenceId)
        : `${base}/reviews`;
    case "affiliate_claim":
      return isAdminRole(role)
        ? appendQuery("/admin/affiliates", "claimId", referenceId)
        : "/seller/dashboard/affiliate";
    case "withdrawal":
      if (role === "SELLER") return "/seller/dashboard";
      if (isAdminRole(role)) return "/admin";
      return getFallbackRoute(role);
    case "flash_sale":
      if (isAdminRole(role)) return "/admin/cms";
      if (role === "SELLER") return "/seller/dashboard/promotions";
      return getFallbackRoute(role);
    case "dispute":
      if (isAdminRole(role)) return "/admin/chat";
      return getFallbackRoute(role);
    case "security":
      if (isAdminRole(role)) return "/admin/audit-logs";
      return getFallbackRoute(role);
  }

  if (type === "CHAT") {
    return getChatRoute(role, roomId || referenceId);
  }

  if (!referenceId) {
    return getFallbackRoute(role);
  }

  switch (type) {
    case "CHAT_TRANSACTION":
    case "TRANSACTION_COMPLETED":
      return getChatRoute(role, roomId);
    case "ORDER":
    case "PAYMENT":
      return getChatRoute(role, roomId);
    case "JOB":
      return role === "SELLER"
        ? "/jobs"
        : isAdminRole(role)
          ? "/admin/jobs"
          : `${base}/jobs/${referenceId}`;
    case "PROPOSAL":
      return role === "SELLER"
        ? `${base}/proposals`
        : isAdminRole(role)
          ? "/admin/jobs"
          : `${base}/jobs`;
    case "REVIEW":
      return isAdminRole(role)
        ? "/admin/reviews"
        : `${base}/reviews`;
    case "KYC":
      return isAdminRole(role)
        ? "/admin/kyc"
        : role === "SELLER"
          ? "/seller/dashboard/verification"
          : "/dashboard/kyc";
    case "SUBSCRIPTION":
      return role === "SELLER"
        ? "/seller/dashboard/subscription"
        : isAdminRole(role)
          ? "/admin/subscriptions"
          : getFallbackRoute(role);
    case "VERIFICATION":
      return isAdminRole(role)
        ? "/admin/physical-verifications"
        : "/seller/dashboard/physical-verification";
    case "REPORT":
      return isAdminRole(role)
        ? appendQuery("/admin/reports", "reportId", referenceId)
        : role === "SELLER"
          ? `/seller/dashboard/reports/${referenceId}`
          : `/dashboard/reports/${referenceId}`;
    case "PRODUCT":
      return isAdminRole(role)
        ? appendQuery("/admin/products", "productId", referenceId)
        : "/seller/dashboard/products";
    case "SERVICE":
      return isAdminRole(role)
        ? appendQuery("/admin/services", "serviceId", referenceId)
        : "/seller/dashboard/services";
    case "AFFILIATE":
      return isAdminRole(role) ? "/admin/affiliates" : "/seller/dashboard/affiliate";
    case "FLASH_SALE":
      if (isAdminRole(role)) return "/admin/cms";
      if (role === "SELLER") return "/seller/dashboard/promotions";
      return getFallbackRoute(role);
    case "DISPUTE":
      if (isAdminRole(role)) return "/admin/chat";
      return getFallbackRoute(role);
    case "SECURITY":
    case "ALERT":
      if (isAdminRole(role)) return "/admin/audit-logs";
      return getFallbackRoute(role);
    case "WITHDRAWAL":
      if (role === "SELLER") return "/seller/dashboard";
      if (isAdminRole(role)) return "/admin";
      return getFallbackRoute(role);
    default:
      return getFallbackRoute(role);
  }
}
