"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { adminApi } from "@/services/admin.service";
import { formatDate } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldCheck, Check, X, Eye, ZoomIn } from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";

interface KycSubmission {
  id: string;
  status?: string;
  documentType?: string;
  createdAt?: string;
  user?: { firstName?: string; lastName?: string; email?: string };
  fullName?: string;
  ktpNumber?: string;
  address?: string;
  dob?: string;
  ktpPhotoUrl?: string;
  selfieWithKtpUrl?: string;
}

function KycContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [selectedKyc, setSelectedKyc] = useState<KycSubmission | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const page = Number(searchParams.get("page") || "1");

  const fetchKyc = async () => {
    setIsLoading(true);
    try {
      const { data } = await adminApi.getKycSubmissions({ page });
      setSubmissions(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.pages || 0);
    } catch (error) {
      console.error("Error fetching KYC:", error);
      toast.error("Gagal memuat data KYC");
      setSubmissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKyc();
  }, [page]);

  const updateURL = (params: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v);
      else sp.delete(k);
    });
    router.push(`/admin/kyc?${sp.toString()}`, { scroll: false });
  };

  const handleViewDetail = async (id: string) => {
    setIsLoadingDetail(true);
    try {
      const { data } = await adminApi.getKycDetail(id);
      setSelectedKyc(data);
      setIsDetailOpen(true);
    } catch (error) {
      console.error("Error fetching KYC detail:", error);
      toast.error("Gagal memuat detail KYC");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleReview = async (id: string, reviewStatus: string) => {
    const confirmMessage = reviewStatus === "approve" 
      ? "Apakah Anda yakin ingin menyetujui KYC ini?"
      : "Apakah Anda yakin ingin menolak KYC ini?";
    
    if (!confirm(confirmMessage)) return;

    try {
      const response = await adminApi.reviewKyc(id, {
        action: reviewStatus.toLowerCase(),
        rejectionReason:
          reviewStatus === "reject" ? "Dokumen tidak valid atau tidak sesuai" : undefined,
      });
      
      toast.success(
        reviewStatus === "approve" 
          ? "KYC berhasil disetujui" 
          : "KYC berhasil ditolak"
      );
      
      setIsDetailOpen(false);
      setSelectedKyc(null);
      fetchKyc();
    } catch (error: any) {
      console.error("Error reviewing KYC:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Gagal memproses KYC";
      toast.error(errorMessage);
    }
  };

  const openImageModal = (url: string, title: string) => {
    setSelectedImage({ url, title });
    setIsImageModalOpen(true);
  };

  // Fetch KYC image securely via API with auth header (no token in URL)
  const [kycImageUrls, setKycImageUrls] = useState<Record<string, string>>({});

  const getImageUrl = (kycId: string, type: "ktp" | "selfie") => {
    const cacheKey = `${kycId}-${type}`;
    if (kycImageUrls[cacheKey]) return kycImageUrls[cacheKey];

    // Trigger async fetch
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const token = typeof window !== "undefined" ? localStorage.getItem("plazo_access_token") : null;

    if (token) {
      fetch(`${baseUrl}/api/admin/kyc/${kycId}/file/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.blob())
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          setKycImageUrls((prev) => ({ ...prev, [cacheKey]: blobUrl }));
        })
        .catch(() => {});
    }

    // Return placeholder while loading
    return kycImageUrls[cacheKey] || "";
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Verifikasi KYC</h1>
        <p className="text-sm text-gray-500">{total} pengajuan</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : submissions.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="h-12 w-12 text-gray-300" />}
          title="Tidak ada pengajuan KYC"
          description=""
        />
      ) : (
        <>
          <div className="space-y-3">
            {submissions.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {s.user?.firstName} {s.user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {s.user?.email} • {s.documentType || "KTP"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(s.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        s.status === "APPROVED"
                          ? "success"
                          : s.status === "REJECTED"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {s.status || "PENDING"}
                    </Badge>
                    <button
                      onClick={() => handleViewDetail(s.id)}
                      className="rounded-lg p-1.5 text-blue-500 hover:bg-blue-50"
                      title="Lihat Detail"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {(!s.status || s.status === "PENDING") && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleReview(s.id, "approve")}
                          className="rounded-lg p-1.5 text-green-500 hover:bg-green-50"
                          title="Setujui"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleReview(s.id, "reject")}
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                          title="Tolak"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(p) => updateURL({ page: String(p) })}
            />
          </div>
        </>
      )}

      {/* Detail Modal */}
      {isDetailOpen && selectedKyc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Detail KYC</h2>
              <button
                onClick={() => {
                  setIsDetailOpen(false);
                  setSelectedKyc(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* User Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Informasi User</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Nama</p>
                    <p className="font-medium text-gray-900">
                      {selectedKyc.user?.firstName} {selectedKyc.user?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{selectedKyc.user?.email}</p>
                  </div>
                </div>
              </div>

              {/* KYC Data */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Data KYC</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedKyc.fullName && (
                    <div>
                      <p className="text-gray-500">Nama Lengkap (KTP)</p>
                      <p className="font-medium text-gray-900">{selectedKyc.fullName}</p>
                    </div>
                  )}
                  {selectedKyc.ktpNumber && (
                    <div>
                      <p className="text-gray-500">No. KTP</p>
                      <p className="font-medium text-gray-900">{selectedKyc.ktpNumber}</p>
                    </div>
                  )}
                  {selectedKyc.dob && (
                    <div>
                      <p className="text-gray-500">Tanggal Lahir</p>
                      <p className="font-medium text-gray-900">{selectedKyc.dob}</p>
                    </div>
                  )}
                  {selectedKyc.address && (
                    <div className="col-span-2">
                      <p className="text-gray-500">Alamat</p>
                      <p className="font-medium text-gray-900">{selectedKyc.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Dokumen Verifikasi</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* KTP Photo */}
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Foto KTP</p>
                    <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden group">
                      <Image
                        src={getImageUrl(selectedKyc.id, "ktp")}
                        alt="Foto KTP"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                      <button
                        onClick={() => openImageModal(getImageUrl(selectedKyc.id, "ktp"), "Foto KTP")}
                        className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <ZoomIn className="h-8 w-8 text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Selfie with KTP */}
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Selfie dengan KTP</p>
                    <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden group">
                      <Image
                        src={getImageUrl(selectedKyc.id, "selfie")}
                        alt="Selfie dengan KTP"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                      <button
                        onClick={() => openImageModal(getImageUrl(selectedKyc.id, "selfie"), "Selfie dengan KTP")}
                        className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <ZoomIn className="h-8 w-8 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Status</h3>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      selectedKyc.status === "APPROVED"
                        ? "success"
                        : selectedKyc.status === "REJECTED"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {selectedKyc.status || "PENDING"}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {formatDate(selectedKyc.createdAt)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              {(!selectedKyc.status || selectedKyc.status === "PENDING") && (
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleReview(selectedKyc.id, "approve")}
                    className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-medium"
                  >
                    Setujui KYC
                  </button>
                  <button
                    onClick={() => handleReview(selectedKyc.id, "reject")}
                    className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-medium"
                  >
                    Tolak KYC
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {isImageModalOpen && selectedImage && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-90 p-4"
          onClick={() => setIsImageModalOpen(false)}
        >
          <div className="relative max-w-7xl max-h-[95vh] w-full h-full">
            <button
              onClick={() => setIsImageModalOpen(false)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 z-10"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="relative w-full h-full">
              <Image
                src={selectedImage.url}
                alt={selectedImage.title}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <p className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-50 px-4 py-2 rounded-lg">
              {selectedImage.title}
            </p>
          </div>
        </div>
      )}

      {/* Loading Detail Overlay */}
      {isLoadingDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6">
            <Spinner />
            <p className="mt-2 text-sm text-gray-600">Memuat detail KYC...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminKycPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      }
    >
      <KycContent />
    </Suspense>
  );
}
