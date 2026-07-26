"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { sellerApi } from "@/services/seller.service";
import { getErrorMessage } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PageTitle } from "@/components/shared/page-title";
import {
  Zap,
  ArrowLeft,
  CheckCircle,
  TrendingUp,
  Eye,
  Clock,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

interface Service {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  isBoosted: boolean;
  boostedUntil?: string;
}

const BOOST_PLANS = [
  {
    days: 7,
    price: 9.99,
    label: "1 Minggu",
    popular: false,
    benefits: ["Tampil di halaman pertama", "Badge 'Promoted'", "3x lebih banyak views"],
  },
  {
    days: 14,
    price: 17.99,
    label: "2 Minggu",
    popular: true,
    benefits: ["Tampil di halaman pertama", "Badge 'Promoted'", "3x lebih banyak views", "Hemat 10%"],
  },
  {
    days: 30,
    price: 29.99,
    label: "1 Bulan",
    popular: false,
    benefits: ["Tampil di halaman pertama", "Badge 'Promoted'", "3x lebih banyak views", "Hemat 25%"],
  },
];

export default function BoostServicePage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.id as string;

  const [service, setService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(14); // Default 2 weeks
  const [isBoosting, setIsBoosting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const fetchService = async () => {
      try {
        const { data } = await sellerApi.getService(serviceId);
        setService(data.data);
      } catch (error) {
        toast.error("Gagal memuat data jasa");
        router.push("/seller/dashboard/services");
      } finally {
        setIsLoading(false);
      }
    };
    fetchService();
  }, [serviceId, router]);

  const handleBoost = async () => {
    if (!service) return;

    setIsBoosting(true);
    try {
      await sellerApi.boostService(serviceId, selectedPlan);
      toast.success(`Permintaan boost berhasil dikirim! Silakan lakukan pembayaran untuk mengaktifkan boost.`);
      setShowConfirmModal(false);
      router.push("/seller/dashboard/boosts");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsBoosting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!service) return null;

  const selectedPlanData = BOOST_PLANS.find((p) => p.days === selectedPlan);
  const isCurrentlyBoosted = service.isBoosted && service.boostedUntil && new Date(service.boostedUntil) > new Date();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <PageTitle title="Boost Jasa" />

      {/* Back Button */}
      <Link
        href="/seller/dashboard/services"
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Daftar Jasa
      </Link>

      {/* Service Info */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{service.name}</h2>
            <p className="mt-1 text-sm text-gray-500">
              Harga: {formatPrice(service.basePrice)}
            </p>
          </div>
          {isCurrentlyBoosted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
              <Zap className="h-3 w-3" />
              Sedang Di-boost
            </span>
          )}
        </div>

        {isCurrentlyBoosted && (
          <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
            <div className="flex items-center gap-2 text-sm text-yellow-800">
              <Clock className="h-4 w-4" />
              <span>
                Boost aktif hingga:{" "}
                <strong>
                  {new Date(service.boostedUntil!).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Benefits Section */}
      <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-6">
        <h3 className="mb-4 text-lg font-bold text-blue-900">
          Keuntungan Boost Jasa
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-blue-900">Prioritas Tampil</p>
              <p className="text-sm text-blue-700">
                Jasa Anda tampil di halaman pertama hasil pencarian
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <Eye className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-blue-900">3x Lebih Banyak Views</p>
              <p className="text-sm text-blue-700">
                Tingkatkan visibilitas dan peluang mendapat order
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-blue-900">Badge Promoted</p>
              <p className="text-sm text-blue-700">
                Jasa Anda ditandai sebagai jasa unggulan
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="mb-8">
        <h3 className="mb-4 text-lg font-bold text-gray-900">Pilih Durasi Boost</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {BOOST_PLANS.map((plan) => (
            <button
              key={plan.days}
              onClick={() => setSelectedPlan(plan.days)}
              className={`relative rounded-xl border-2 p-6 text-left transition-all ${
                selectedPlan === plan.days
                  ? "border-blue-500 bg-blue-50 shadow-lg"
                  : "border-gray-200 hover:border-blue-300"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                  Paling Populer
                </span>
              )}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-600">{plan.label}</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">
                  {formatPrice(plan.price)}
                </p>
              </div>
              <ul className="space-y-2">
                {plan.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              {selectedPlan === plan.days && (
                <div className="absolute top-4 right-4">
                  <CheckCircle className="h-6 w-6 text-blue-500 fill-blue-500" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Warning if already boosted */}
      {isCurrentlyBoosted && (
        <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
            <div className="text-sm text-orange-800">
              <p className="font-semibold">Jasa sedang dalam periode boost</p>
              <p className="mt-1">
                Boost baru akan memperpanjang durasi boost yang sudah ada.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Instructions */}
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-2">Cara Melakukan Boost:</p>
            <ol className="list-decimal list-inside space-y-1.5 ml-1">
              <li>Klik tombol "Lanjutkan ke Pembayaran" di bawah</li>
              <li>Sistem akan membuat permintaan boost untuk jasa Anda</li>
              <li>Anda akan diarahkan ke halaman Boost & Top Ads</li>
              <li>Lakukan pembayaran sesuai nominal yang tertera</li>
              <li>Upload bukti pembayaran</li>
              <li>Tunggu konfirmasi dari admin (maks 1x24 jam)</li>
              <li>Boost akan aktif setelah pembayaran dikonfirmasi</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Summary & Action */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-bold text-gray-900">Ringkasan Pembayaran</h3>
        <div className="space-y-3 border-b border-gray-200 pb-4 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Jasa</span>
            <span className="font-medium text-gray-900">{service.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Durasi Boost</span>
            <span className="font-medium text-gray-900">{selectedPlanData?.label}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Harga</span>
            <span className="font-medium text-gray-900">
              {formatPrice(selectedPlanData?.price || 0)}
            </span>
          </div>
        </div>
        <div className="flex justify-between items-center mb-6">
          <span className="text-lg font-bold text-gray-900">Total</span>
          <span className="text-2xl font-bold text-blue-600">
            {formatPrice(selectedPlanData?.price || 0)}
          </span>
        </div>
        <Button
          onClick={() => setShowConfirmModal(true)}
          size="lg"
          className="w-full"
        >
          <Zap className="mr-2 h-5 w-5" />
          Lanjutkan ke Pembayaran
        </Button>
        <p className="mt-3 text-center text-xs text-gray-500">
          Dengan melakukan boost, Anda menyetujui{" "}
          <Link href="/terms" className="text-blue-600 hover:underline">
            Syarat & Ketentuan
          </Link>{" "}
          kami
        </p>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4 w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Konfirmasi Boost Jasa</h3>
                <p className="text-sm text-gray-500">
                  Pastikan detail boost sudah benar
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-lg bg-gray-50 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Jasa:</span>
                <span className="font-semibold text-gray-900 text-right max-w-[200px] truncate">
                  {service?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Durasi:</span>
                <span className="font-semibold text-gray-900">
                  {selectedPlanData?.label} ({selectedPlan} hari)
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold text-gray-900">Total Biaya:</span>
                <span className="text-lg font-bold text-blue-600">
                  {formatPrice(selectedPlanData?.price || 0)}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 mb-4">
              <p className="text-xs text-blue-800">
                <strong>Catatan:</strong> Setelah klik "Ya, Lanjutkan", Anda akan diarahkan ke halaman pembayaran. 
                Silakan lakukan transfer sesuai nominal dan upload bukti pembayaran. Boost akan aktif setelah admin mengkonfirmasi pembayaran Anda.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowConfirmModal(false)}
                disabled={isBoosting}
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleBoost}
                isLoading={isBoosting}
              >
                <Zap className="h-4 w-4 mr-1" />
                Ya, Lanjutkan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
