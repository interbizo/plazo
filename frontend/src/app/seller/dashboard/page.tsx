"use client";

import Link from "next/link";
import {
  Package,
  Briefcase,
  MessageSquare,
  FileText,
  Store,
  Star,
  Zap,
  CreditCard,
} from "lucide-react";
import { SeoStatusCard } from "@/components/seller/seo-status-card";
import { UpgradePremiumBanner } from "@/components/seller/upgrade-premium-banner";

const mainActions = [
  {
    href: "/seller/dashboard/products",
    label: "Kelola Produk",
    desc: "Tambah, edit, dan atur katalog produk yang akan dipromosikan ke buyer.",
    icon: Package,
    color: "bg-blue-50 text-blue-600",
  },
  {
    href: "/seller/dashboard/services",
    label: "Kelola Layanan",
    desc: "Atur paket jasa, portofolio, dan detail penawaran layanan Anda.",
    icon: Briefcase,
    color: "bg-violet-50 text-violet-600",
  },
  {
    href: "/seller/dashboard/chat",
    label: "Balas Chat Buyer",
    desc: "Chat sekarang jadi pusat transaksi. Respon cepat akan membantu closing lebih baik.",
    icon: MessageSquare,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    href: "/seller/dashboard/proposals",
    label: "Kirim Proposal",
    desc: "Cari lowongan yang cocok dan ajukan proposal langsung ke buyer.",
    icon: FileText,
    color: "bg-amber-50 text-amber-600",
  },
];

const supportActions = [
  {
    href: "/seller/dashboard/store",
    label: "Pengaturan Toko",
    icon: Store,
    desc: "Perbarui identitas toko, deskripsi, dan kontak WhatsApp untuk seller premium.",
  },
  {
    href: "/seller/dashboard/reviews",
    label: "Ulasan Buyer",
    icon: Star,
    desc: "Pantau feedback buyer untuk meningkatkan kualitas listing dan komunikasi.",
  },
  {
    href: "/seller/dashboard/boosts",
    label: "Boost Listing",
    icon: Zap,
    desc: "Dorong listing unggulan agar tampil lebih menonjol di katalog publik.",
  },
  {
    href: "/seller/dashboard/subscription",
    label: "Langganan Seller",
    icon: CreditCard,
    desc: "Kelola paket premium dan akses fitur seller yang tersedia.",
  },
];

export default function SellerDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-emerald-100 bg-linear-to-br from-emerald-50 via-white to-blue-50 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Seller Dashboard</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          Marketplace sekarang berorientasi pada percakapan dan lead. Jaga katalog
          tetap rapi, aktif di chat, dan arahkan buyer ke diskusi yang jelas agar
          proses transaksi manual berjalan lancar.
        </p>
      </div>

      {/* Upgrade Premium Banner */}
      <UpgradePremiumBanner />

      {/* SEO Status Card */}
      <SeoStatusCard />

      <div className="grid gap-4 md:grid-cols-2">
        {mainActions.map((item) => (
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
        <h2 className="text-base font-semibold text-gray-900">Penunjang Toko</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {supportActions.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 transition-colors hover:border-emerald-200 hover:bg-emerald-50/50"
            >
              <div className="flex items-center gap-2 text-gray-900">
                <item.icon className="h-4 w-4 text-emerald-600" />
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
