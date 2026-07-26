"use client";

import Link from "next/link";
import {
  Users,
  Store,
  Package,
  Briefcase,
  FileText,
  Flag,
  Shield,
  Bell,
  FolderTree,
  Settings,
} from "lucide-react";

const moderationCards = [
  {
    href: "/admin/users",
    label: "Pengguna",
    desc: "Kelola akun buyer, seller, dan admin.",
    icon: Users,
    color: "bg-blue-50 text-blue-600",
  },
  {
    href: "/admin/tenants",
    label: "Toko / Tenant",
    desc: "Pantau toko seller, kelengkapan profil, dan status verifikasi.",
    icon: Store,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    href: "/admin/products",
    label: "Produk",
    desc: "Moderasi katalog produk publik dan kualitas listing.",
    icon: Package,
    color: "bg-violet-50 text-violet-600",
  },
  {
    href: "/admin/services",
    label: "Layanan",
    desc: "Review jasa, paket layanan, dan konten seller.",
    icon: Briefcase,
    color: "bg-amber-50 text-amber-600",
  },
  {
    href: "/admin/jobs",
    label: "Lowongan",
    desc: "Pantau posting job dan aktivitas proposal seller premium.",
    icon: FileText,
    color: "bg-cyan-50 text-cyan-600",
  },
  {
    href: "/admin/reports",
    label: "Laporan",
    desc: "Tangani pelanggaran, komplain konten, dan laporan user.",
    icon: Flag,
    color: "bg-rose-50 text-rose-600",
  },
];

const quickLinks = [
  {
    href: "/admin/kyc",
    label: "Review KYC",
    icon: Shield,
    desc: "Verifikasi identitas seller dan dokumen pendukung.",
  },
  {
    href: "/admin/broadcast",
    label: "Broadcast",
    icon: Bell,
    desc: "Kirim pengumuman dan notifikasi massal ke pengguna.",
  },
  {
    href: "/admin/categories",
    label: "Kategori",
    icon: FolderTree,
    desc: "Rapikan struktur kategori produk, jasa, dan lowongan.",
  },
  {
    href: "/admin/cms",
    label: "CMS",
    icon: Settings,
    desc: "Kelola halaman situs, banner, FAQ, dan pengaturan umum.",
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-indigo-100 bg-linear-to-br from-indigo-50 via-white to-blue-50 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          Panel admin saat ini difokuskan pada moderasi marketplace, pengawasan
          seller, verifikasi, dan komunikasi platform. Flow transaksi internal
          sedang dipensiunkan dari permukaan utama agar sistem lebih konsisten
          dengan model kontak langsung buyer dan seller.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {moderationCards.map((item) => (
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
        <h2 className="text-base font-semibold text-gray-900">Akses Cepat</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 transition-colors hover:border-indigo-200 hover:bg-indigo-50/50"
            >
              <div className="flex items-center gap-2 text-gray-900">
                <item.icon className="h-4 w-4 text-indigo-600" />
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
