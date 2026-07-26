"use client";

import Link from "next/link";
import { MessageSquare, Bell, Briefcase, Heart, ShoppingBag, Palette } from "lucide-react";

const quickLinks = [
  {
    href: "/products",
    label: "Jelajahi Produk",
    desc: "Cari produk lalu lanjutkan transaksi melalui chat seller.",
    icon: ShoppingBag,
    color: "bg-blue-50 text-blue-600",
  },
  {
    href: "/services",
    label: "Cari Layanan",
    desc: "Pilih jasa yang cocok lalu diskusikan kebutuhanmu langsung dengan seller.",
    icon: Palette,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    href: "/dashboard/chat",
    label: "Buka Chat",
    desc: "Lanjutkan percakapan, negosiasi, dan transaksi manual di chat internal.",
    icon: MessageSquare,
    color: "bg-violet-50 text-violet-600",
  },
  {
    href: "/jobs",
    label: "Lihat Lowongan",
    desc: "Temukan project freelance dan komunikasikan kebutuhanmu langsung.",
    icon: Briefcase,
    color: "bg-amber-50 text-amber-600",
  },
];

const supportLinks = [
  {
    href: "/dashboard/wishlist",
    label: "Wishlist",
    desc: "Simpan produk dan layanan yang ingin Anda hubungi nanti.",
    icon: Heart,
  },
  {
    href: "/dashboard/notifications",
    label: "Notifikasi",
    desc: "Pantau balasan seller, update sistem, dan informasi penting.",
    icon: Bell,
  },
  {
    href: "/dashboard/jobs",
    label: "Lowongan Saya",
    desc: "Kelola lowongan yang Anda posting dan lihat respons seller.",
    icon: Briefcase,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-blue-100 bg-linear-to-br from-blue-50 via-white to-emerald-50 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Buyer</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          Marketplace sekarang berfokus pada percakapan langsung. Jelajahi produk,
          layanan, atau lowongan, lalu lanjutkan negosiasi dan transaksi manual
          lewat chat internal atau WhatsApp seller premium.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {quickLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-sm"
          >
            <div className={`mb-4 inline-flex rounded-2xl p-3 ${item.color}`}>
              <item.icon className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{item.label}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">{item.desc}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Area Pendukung</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {supportLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 transition-colors hover:border-blue-200 hover:bg-blue-50/60"
            >
              <div className="flex items-center gap-2 text-gray-900">
                <item.icon className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold">{item.label}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-600">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
