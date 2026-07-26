"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Copy, Gift, MapPin, BadgePercent, Wallet, Clock3, X, ImageIcon } from "lucide-react";
import { sellerApi } from "@/services/seller.service";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice, formatDate } from "@/lib/utils";
import type { AffiliateDashboard } from "@/types";

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-blue-100 text-blue-700",
  PAID: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function SellerAffiliatePage() {
  const [data, setData] = useState<AffiliateDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimForm, setClaimForm] = useState({
    bankAccountName: "",
    bankAccountNumber: "",
    bankName: "",
    notes: "",
  });

  const load = async () => {
    try {
      const res = await sellerApi.getAffiliateDashboard();
      setData(res.data);
      setBlocked(false);
      
      // Pre-fill form with default bank account if available
      if (res.data.profile.defaultBankAccountName) {
        setClaimForm({
          bankAccountName: res.data.profile.defaultBankAccountName || "",
          bankAccountNumber: res.data.profile.defaultBankAccountNumber || "",
          bankName: res.data.profile.defaultBankName || "",
          notes: "",
        });
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) {
        setBlocked(true);
      } else {
        toast.error(err?.response?.data?.message || "Gagal memuat dashboard affiliate");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} berhasil disalin`);
    } catch {
      toast.error(`Gagal menyalin ${label.toLowerCase()}`);
    }
  };

  const handleClaim = async () => {
    // Validate form
    if (!claimForm.bankAccountName || !claimForm.bankAccountNumber || !claimForm.bankName) {
      toast.error("Data rekening wajib diisi lengkap");
      return;
    }

    setIsClaiming(true);
    try {
      const res = await sellerApi.createAffiliateClaim(claimForm);
      toast.success(res.data?.message || "Klaim bonus berhasil diajukan");
      setShowClaimModal(false);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal mengajukan klaim bonus");
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (blocked || !data) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-xl font-bold text-gray-900">Program Affiliate</h1>
        <p className="mt-2 text-sm text-gray-600">
          Program affiliate hanya tersedia untuk seller yang sudah berlangganan paket berbayar.
        </p>
        <div className="mt-4">
          <Link href="/seller/dashboard/subscription">
            <Button>Lihat Paket Langganan</Button>
          </Link>
        </div>
      </div>
    );
  }

  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/register?ref=${encodeURIComponent(data.profile.referralCode)}`
      : data.profile.referralCode;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Gift className="h-3.5 w-3.5" />
              Program Affiliate Aktif
            </div>
            <h1 className="mt-3 text-2xl font-bold text-gray-900">Ajak seller lain dan dapat bonus langganan</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Bonus umum 20% berlaku untuk referral kode/link Anda. Jika Anda ditetapkan sebagai affiliate khusus kota, bonus menjadi 30% untuk seller baru dari kota tersebut.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-white p-4 text-sm shadow-sm">
            <p className="font-semibold text-gray-900">Status Affiliate</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                Kode: {data.profile.referralCode}
              </span>
              {data.profile.isCitySpecial ? (
                <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">
                  Kota Khusus {data.profile.city ? `• ${data.profile.city}` : ""}
                </span>
              ) : (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  Affiliate Umum
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Kode Referral</p>
            <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-3">
              <span className="truncate font-mono text-sm font-semibold text-gray-900">{data.profile.referralCode}</span>
              <Button size="sm" variant="outline" onClick={() => handleCopy(data.profile.referralCode, "Kode referral")}>
                <Copy className="mr-1 h-4 w-4" />
                Salin
              </Button>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Link Referral</p>
            <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-3">
              <span className="truncate text-sm text-gray-700">{referralLink}</span>
              <Button size="sm" variant="outline" onClick={() => handleCopy(referralLink, "Link referral")}>
                <Copy className="mr-1 h-4 w-4" />
                Salin
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Seller Diajak", value: data.stats.invitedSellers, icon: Gift, tone: "bg-blue-50 text-blue-700" },
          { label: "Seller Berlangganan", value: data.stats.subscribedSellers, icon: BadgePercent, tone: "bg-purple-50 text-purple-700" },
          { label: "Bonus Menunggu", value: formatPrice(data.stats.pendingBonus), icon: Clock3, tone: "bg-amber-50 text-amber-700" },
          { label: "Total Bonus", value: formatPrice(data.stats.totalBonus), icon: Wallet, tone: "bg-emerald-50 text-emerald-700" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className={`inline-flex rounded-xl p-2 ${item.tone}`}>
              <item.icon className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm text-gray-500">{item.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Klaim Bonus</h2>
            <p className="text-sm text-gray-500">
              Ajukan klaim manual untuk bonus yang masih pending. Admin akan verifikasi lalu transfer manual.
            </p>
          </div>
          <Button 
            onClick={() => setShowClaimModal(true)} 
            disabled={data.stats.pendingBonus <= 0}
          >
            Ajukan Klaim {data.stats.pendingBonus > 0 ? `• ${formatPrice(data.stats.pendingBonus)}` : ""}
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-400">Pending</p>
            <p className="mt-2 text-xl font-bold text-gray-900">{formatPrice(data.stats.pendingBonus)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-400">Approved</p>
            <p className="mt-2 text-xl font-bold text-gray-900">{formatPrice(data.stats.approvedBonus)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-400">Paid</p>
            <p className="mt-2 text-xl font-bold text-gray-900">{formatPrice(data.stats.paidBonus)}</p>
          </div>
        </div>
      </div>

      {/* Claim Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Ajukan Klaim Bonus</h3>
              <button
                onClick={() => setShowClaimModal(false)}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-medium text-gray-900">Total Bonus yang Diklaim</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">
                {formatPrice(data.stats.pendingBonus)}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Pemilik Rekening <span className="text-red-500">*</span>
                </label>
                <Input
                  value={claimForm.bankAccountName}
                  onChange={(e) => setClaimForm({ ...claimForm, bankAccountName: e.target.value })}
                  placeholder="Nama sesuai rekening/e-wallet"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nomor Rekening/E-Wallet <span className="text-red-500">*</span>
                </label>
                <Input
                  value={claimForm.bankAccountNumber}
                  onChange={(e) => setClaimForm({ ...claimForm, bankAccountNumber: e.target.value })}
                  placeholder="Nomor rekening atau nomor HP e-wallet"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank/Provider <span className="text-red-500">*</span>
                </label>
                <Input
                  value={claimForm.bankName}
                  onChange={(e) => setClaimForm({ ...claimForm, bankName: e.target.value })}
                  placeholder="Contoh: BCA, Mandiri, GoPay, OVO"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catatan (Opsional)
                </label>
                <textarea
                  value={claimForm.notes}
                  onChange={(e) => setClaimForm({ ...claimForm, notes: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="Catatan tambahan untuk admin"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowClaimModal(false)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                onClick={handleClaim}
                isLoading={isClaiming}
                className="flex-1"
              >
                Ajukan Klaim
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.5fr,1fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">Riwayat Bonus</h2>
          <div className="mt-4 space-y-3">
            {data.bonuses.length === 0 ? (
              <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                Belum ada bonus affiliate. Bagikan kode atau link referral Anda ke seller lain.
              </p>
            ) : (
              data.bonuses.map((bonus) => (
                <div key={bonus.id} className="rounded-xl border border-gray-100 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900">{bonus.referredTenant?.name || "Seller Referral"}</p>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[bonus.status] || "bg-gray-100 text-gray-700"}`}>
                          {bonus.status}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                          {bonus.affiliateType === "CITY_SPECIAL" ? "Khusus Kota 30%" : "Umum 20%"}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                        {bonus.referredTenant?.city && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {bonus.referredTenant.city}
                          </span>
                        )}
                        <span>Langganan: {bonus.subscriptionPayment?.plan}</span>
                        <span>{formatDate(bonus.createdAt)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Bonus</p>
                      <p className="text-xl font-bold text-gray-900">{formatPrice(bonus.bonusAmount)}</p>
                      <p className="text-xs text-gray-400">Dari {formatPrice(bonus.subscriptionAmount)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">Riwayat Klaim</h2>
          <div className="mt-4 space-y-3">
            {data.claims.length === 0 ? (
              <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                Belum ada klaim bonus yang diajukan.
              </p>
            ) : (
              data.claims.map((claim) => (
                <div key={claim.id} className="rounded-xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{formatPrice(claim.amount)}</p>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[claim.status] || "bg-gray-100 text-gray-700"}`}>
                          {claim.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">Diajukan {formatDate(claim.requestedAt)}</p>
                      
                      {/* Bank Account Details */}
                      {claim.bankAccountName && (
                        <div className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
                          <p><strong>Rekening:</strong> {claim.bankAccountName}</p>
                          <p><strong>No:</strong> {claim.bankAccountNumber}</p>
                          <p><strong>Bank:</strong> {claim.bankName}</p>
                        </div>
                      )}
                      
                      {claim.rejectionReason && (
                        <p className="mt-2 text-xs text-red-600">{claim.rejectionReason}</p>
                      )}
                      
                      {/* Payment Proof */}
                      {claim.paymentProofUrl && claim.status === "PAID" && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-700 mb-1">Bukti Transfer:</p>
                          <a
                            href={claim.paymentProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                          >
                            <ImageIcon className="h-3.5 w-3.5" />
                            Lihat Bukti Transfer
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
