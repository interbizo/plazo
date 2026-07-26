"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import { Gift, MapPin, Wallet, CheckCircle2, Clock3, Search, ChevronLeft, ChevronRight, Upload, X, ImageIcon } from "lucide-react";
import { adminApi } from "@/services/admin.service";
import { uploadApi } from "@/services/upload.service";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { formatDate, formatPrice } from "@/lib/utils";

interface AdminAffiliateRow {
  id: string;
  userId: string;
  referralCode: string;
  isActive: boolean;
  isCitySpecial: boolean;
  city?: string | null;
  notes?: string | null;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    tenants?: Array<{
      id: string;
      name: string;
      city?: string | null;
      subscriptionPlan: string;
    }>;
  };
  stats: {
    invitedSellers: number;
    totalBonus: number;
    pendingBonus: number;
    approvedBonus: number;
    paidBonus: number;
  };
}

interface AdminAffiliateClaim {
  id: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "PAID" | "REJECTED";
  requestedAt: string;
  reviewedAt?: string;
  paidAt?: string;
  rejectionReason?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  paymentProofUrl?: string;
  affiliateUser?: {
    firstName: string;
    lastName: string;
    email: string;
    tenants?: Array<{ name: string; city?: string | null }>;
  };
  bonuses?: Array<{
    id: string;
    bonusAmount: number;
    referredTenant?: { name: string; city?: string | null };
  }>;
}

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-blue-100 text-blue-700",
  PAID: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

const ITEMS_PER_PAGE = 10;

export default function AdminAffiliatesPage() {
  const [affiliates, setAffiliates] = useState<AdminAffiliateRow[]>([]);
  const [claims, setClaims] = useState<AdminAffiliateClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [processingClaimId, setProcessingClaimId] = useState<string | null>(null);
  const [cityDrafts, setCityDrafts] = useState<Record<string, { city: string; isCitySpecial: boolean; isActive: boolean }>>({});
  
  // Search and pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Payout modal states
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<AdminAffiliateClaim | null>(null);
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const proofInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      console.log('[Affiliates] Fetching affiliate data');
      
      const [affiliatesRes, claimsRes] = await Promise.all([
        adminApi.getAffiliates(),
        adminApi.getAffiliateClaims(),
      ]);
      
      console.log('[Affiliates] Response:', { affiliatesRes, claimsRes });
      
      const affiliateData = affiliatesRes.data?.data || [];
      const claimData = claimsRes.data?.data || [];
      
      setAffiliates(affiliateData);
      setClaims(claimData);
      setCityDrafts(
        Object.fromEntries(
          affiliateData.map((item: AdminAffiliateRow) => [
            item.userId,
            {
              city: item.city || item.user?.tenants?.[0]?.city || "",
              isCitySpecial: item.isCitySpecial,
              isActive: item.isActive,
            },
          ]),
        ),
      );
      
      console.log('[Affiliates] Data loaded successfully');
    } catch (err: any) {
      console.error('[Affiliates] Error:', err);
      const errorMessage = err?.response?.data?.message || err?.message || "Gagal memuat data affiliate";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Filter affiliates based on search query
  const filteredAffiliates = useMemo(() => {
    if (!searchQuery.trim()) return affiliates;

    const query = searchQuery.toLowerCase().trim();
    return affiliates.filter((affiliate) => {
      const fullName = `${affiliate.user?.firstName || ""} ${affiliate.user?.lastName || ""}`.toLowerCase();
      const email = (affiliate.user?.email || "").toLowerCase();
      const userId = affiliate.userId.toLowerCase();
      const referralCode = affiliate.referralCode.toLowerCase();
      const tenantName = (affiliate.user?.tenants?.[0]?.name || "").toLowerCase();
      const city = (affiliate.city || affiliate.user?.tenants?.[0]?.city || "").toLowerCase();

      return (
        fullName.includes(query) ||
        email.includes(query) ||
        userId.includes(query) ||
        referralCode.includes(query) ||
        tenantName.includes(query) ||
        city.includes(query)
      );
    });
  }, [affiliates, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredAffiliates.length / ITEMS_PER_PAGE);
  const paginatedAffiliates = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredAffiliates.slice(startIndex, endIndex);
  }, [filteredAffiliates, currentPage]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const saveAffiliateCity = async (userId: string) => {
    const draft = cityDrafts[userId];
    if (!draft) return;
    setSavingUserId(userId);
    try {
      const payload = {
        isCitySpecial: draft.isCitySpecial,
        city: draft.city || undefined,
        isActive: draft.isActive,
      };
      const res = await adminApi.updateAffiliateCity(userId, payload);
      toast.success(res.data?.message || "Affiliate berhasil diperbarui");
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal memperbarui affiliate");
    } finally {
      setSavingUserId(null);
    }
  };

  const reviewClaim = async (
    claimId: string,
    status: "APPROVED" | "REJECTED" | "PAID",
    paymentProofUrl?: string,
  ) => {
    setProcessingClaimId(claimId);
    try {
      const payload: any = { status };
      if (status === "PAID" && paymentProofUrl) {
        payload.paymentProofUrl = paymentProofUrl;
      }
      const res = await adminApi.reviewAffiliateClaim(claimId, payload);
      toast.success(res.data?.message || "Klaim berhasil diproses");
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal memproses klaim");
    } finally {
      setProcessingClaimId(null);
    }
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 2MB");
      return;
    }

    setIsUploadingProof(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data } = await uploadApi.uploadFile(formData, "ATTACHMENT");
      setPaymentProofUrl(data.file.url);
      toast.success("Bukti transfer berhasil diupload");
    } catch {
      toast.error("Gagal upload bukti transfer");
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handlePayout = async () => {
    if (!selectedClaim) return;
    
    if (!paymentProofUrl) {
      toast.error("Harap upload bukti transfer terlebih dahulu");
      return;
    }

    await reviewClaim(selectedClaim.id, "PAID", paymentProofUrl);
    setShowPayoutModal(false);
    setSelectedClaim(null);
    setPaymentProofUrl("");
  };

  const openPayoutModal = (claim: AdminAffiliateClaim) => {
    setSelectedClaim(claim);
    setPaymentProofUrl(claim.paymentProofUrl || "");
    setShowPayoutModal(true);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Program Affiliate</h1>
        <p className="mt-1 text-sm text-gray-500">
          Kelola affiliate seller premium, affiliate khusus kota, dan klaim bonus manual.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Affiliate Aktif", value: affiliates.filter((a) => a.isActive).length, icon: Gift },
          { label: "Khusus Kota", value: affiliates.filter((a) => a.isCitySpecial).length, icon: MapPin },
          { label: "Klaim Pending", value: claims.filter((c) => c.status === "PENDING").length, icon: Clock3 },
          { label: "Bonus Paid", value: formatPrice(affiliates.reduce((sum, item) => sum + (item.stats?.paidBonus || 0), 0)), icon: Wallet },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="inline-flex rounded-xl bg-indigo-50 p-2 text-indigo-700">
              <card.icon className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm text-gray-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Daftar Affiliate</h2>
          
          {/* Search Bar */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama, email, kode, atau kota..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Results info */}
        {searchQuery && (
          <div className="mb-4 text-sm text-gray-600">
            Menampilkan {filteredAffiliates.length} dari {affiliates.length} affiliate
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="py-3 pr-4">Affiliate</th>
                <th className="py-3 pr-4">Kode</th>
                <th className="py-3 pr-4">Kota Khusus</th>
                <th className="py-3 pr-4">Statistik</th>
                <th className="py-3 pr-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAffiliates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    {searchQuery 
                      ? "Tidak ada affiliate yang cocok dengan pencarian"
                      : "Belum ada seller yang membuka program affiliate."}
                  </td>
                </tr>
              ) : (
                paginatedAffiliates.map((affiliate) => {
                  const draft = cityDrafts[affiliate.userId];
                  return (
                    <tr key={affiliate.id} className="border-b border-gray-50 align-top">
                      <td className="py-4 pr-4">
                        <p className="font-semibold text-gray-900">
                          {affiliate.user?.firstName} {affiliate.user?.lastName}
                        </p>
                        <p className="text-gray-500">{affiliate.user?.email}</p>
                        <p className="mt-1 text-xs text-gray-400">
                          {affiliate.user?.tenants?.[0]?.name || "Tanpa toko"} • {affiliate.user?.tenants?.[0]?.subscriptionPlan || "-"}
                        </p>
                      </td>
                      <td className="py-4 pr-4">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 font-mono text-xs font-semibold text-gray-700">
                          {affiliate.referralCode}
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="space-y-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={draft?.isCitySpecial || false}
                              onChange={(e) =>
                                setCityDrafts((prev) => ({
                                  ...prev,
                                  [affiliate.userId]: {
                                    ...(prev[affiliate.userId] || { city: "", isActive: true }),
                                    isCitySpecial: e.target.checked,
                                  },
                                }))
                              }
                            />
                            <span>Aktifkan affiliate kota</span>
                          </label>
                          <input
                            value={draft?.city || ""}
                            onChange={(e) =>
                              setCityDrafts((prev) => ({
                                ...prev,
                                [affiliate.userId]: {
                                  ...(prev[affiliate.userId] || { isCitySpecial: false, isActive: true }),
                                  city: e.target.value,
                                },
                              }))
                            }
                            placeholder="Nama kota"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2"
                          />
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={draft?.isActive ?? true}
                              onChange={(e) =>
                                setCityDrafts((prev) => ({
                                  ...prev,
                                  [affiliate.userId]: {
                                    ...(prev[affiliate.userId] || { city: "", isCitySpecial: false }),
                                    isActive: e.target.checked,
                                  },
                                }))
                              }
                            />
                            <span>Affiliate aktif</span>
                          </label>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="space-y-1 text-gray-600">
                          <p>Seller diajak: <strong>{affiliate.stats.invitedSellers}</strong></p>
                          <p>Pending: <strong>{formatPrice(affiliate.stats.pendingBonus)}</strong></p>
                          <p>Approved: <strong>{formatPrice(affiliate.stats.approvedBonus)}</strong></p>
                          <p>Paid: <strong>{formatPrice(affiliate.stats.paidBonus)}</strong></p>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <Button
                          size="sm"
                          onClick={() => saveAffiliateCity(affiliate.userId)}
                          isLoading={savingUserId === affiliate.userId}
                        >
                          Simpan
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
            <div className="text-sm text-gray-600">
              Halaman {currentPage} dari {totalPages} ({filteredAffiliates.length} total)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              
              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`min-w-[36px] rounded-lg px-3 py-2 text-sm font-medium ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900">Klaim Bonus Affiliate</h2>
        <div className="mt-4 space-y-4">
          {claims.length === 0 ? (
            <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              Belum ada klaim bonus affiliate.
            </p>
          ) : (
            claims.map((claim) => (
              <div key={claim.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900">
                        {claim.affiliateUser?.firstName} {claim.affiliateUser?.lastName}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[claim.status] || "bg-gray-100 text-gray-700"}`}>
                        {claim.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{claim.affiliateUser?.email}</p>
                    <p className="mt-1 text-sm text-gray-600">
                      Nominal klaim: <strong>{formatPrice(claim.amount)}</strong> • {formatDate(claim.requestedAt)}
                    </p>

                    {/* Bank Account Details */}
                    {claim.bankAccountName && (
                      <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
                        <p className="text-xs font-semibold text-blue-900 mb-2">Data Rekening Tujuan Transfer:</p>
                        <div className="space-y-1 text-sm text-blue-800">
                          <p><strong>Nama:</strong> {claim.bankAccountName}</p>
                          <p><strong>No. Rekening:</strong> {claim.bankAccountNumber}</p>
                          <p><strong>Bank/Provider:</strong> {claim.bankName}</p>
                        </div>
                      </div>
                    )}

                    {claim.bonuses?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {claim.bonuses.slice(0, 4).map((bonus) => (
                          <span key={bonus.id} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                            {bonus.referredTenant?.name || "Referral"} • {formatPrice(bonus.bonusAmount)}
                          </span>
                        ))}
                      </div>
                    ) : null}

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

                    {claim.rejectionReason ? (
                      <p className="mt-3 text-sm text-red-600">{claim.rejectionReason}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {claim.status === "PENDING" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => reviewClaim(claim.id, "APPROVED")}
                          isLoading={processingClaimId === claim.id}
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => reviewClaim(claim.id, "REJECTED")}
                          isLoading={processingClaimId === claim.id}
                        >
                          Tolak
                        </Button>
                      </>
                    )}
                    {claim.status === "APPROVED" && (
                      <Button
                        size="sm"
                        onClick={() => openPayoutModal(claim)}
                        isLoading={processingClaimId === claim.id}
                      >
                        <Wallet className="mr-1 h-4 w-4" />
                        Payout & Upload Bukti
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Payout Modal */}
      {showPayoutModal && selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Payout Bonus Affiliate</h3>
              <button
                onClick={() => {
                  setShowPayoutModal(false);
                  setSelectedClaim(null);
                  setPaymentProofUrl("");
                }}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Claim Info */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-gray-900">Total Bonus</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">
                  {formatPrice(selectedClaim.amount)}
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  <strong>Seller:</strong> {selectedClaim.affiliateUser?.firstName} {selectedClaim.affiliateUser?.lastName}
                </p>
              </div>

              {/* Bank Account Details */}
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-900 mb-2">Data Rekening Tujuan:</p>
                <div className="space-y-1 text-sm text-blue-800">
                  <p><strong>Nama:</strong> {selectedClaim.bankAccountName}</p>
                  <p><strong>No. Rekening:</strong> {selectedClaim.bankAccountNumber}</p>
                  <p><strong>Bank/Provider:</strong> {selectedClaim.bankName}</p>
                </div>
              </div>

              {/* Upload Bukti Transfer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Bukti Transfer <span className="text-red-500">*</span>
                </label>
                {paymentProofUrl ? (
                  <div className="relative">
                    <img
                      src={paymentProofUrl}
                      alt="Bukti Transfer"
                      className="w-full max-w-md rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => setPaymentProofUrl("")}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => proofInputRef.current?.click()}
                    disabled={isUploadingProof}
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg hover:border-emerald-500 transition-colors"
                  >
                    {isUploadingProof ? (
                      <Spinner />
                    ) : (
                      <>
                        <Upload className="h-10 w-10 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          Klik untuk upload bukti transfer
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Format: JPG, PNG (Max 2MB)
                        </p>
                      </>
                    )}
                  </button>
                )}
                <input
                  ref={proofInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProofUpload}
                  className="hidden"
                />
              </div>

              {/* Instructions */}
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs text-amber-800">
                  <strong>Instruksi:</strong> Lakukan transfer manual ke rekening seller di atas, 
                  kemudian upload bukti transfer. Setelah upload, klik "Konfirmasi Payout" 
                  untuk menandai klaim sebagai PAID.
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPayoutModal(false);
                  setSelectedClaim(null);
                  setPaymentProofUrl("");
                }}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                onClick={handlePayout}
                isLoading={processingClaimId === selectedClaim.id}
                disabled={!paymentProofUrl}
                className="flex-1"
              >
                Konfirmasi Payout
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
