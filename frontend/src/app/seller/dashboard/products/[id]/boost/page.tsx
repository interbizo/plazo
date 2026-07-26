"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { sellerApi } from "@/services/seller.service";
import { getErrorMessage } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PageTitle } from "@/components/shared/page-title";
import {
  Zap,
  TrendingUp,
  Eye,
  Clock,
  CheckCircle,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  thumbnail?: string;
  isBoosted: boolean;
  boostedUntil?: string;
}

interface BoostPlan {
  days: number;
  price: number;
  label: string;
  popular?: boolean;
  savings?: string;
}

const BOOST_PLANS: BoostPlan[] = [
  { days: 7, price: 9.99, label: "1 Minggu" },
  { days: 14, price: 17.99, label: "2 Minggu", popular: true, savings: "10%" },
  { days: 30, price: 29.99, label: "1 Bulan", savings: "33%" },
];

export default function BoostProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<BoostPlan>(BOOST_PLANS[1]);
  const [isBoosting, setIsBoosting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data } = await sellerApi.getProduct(productId);
        setProduct(data.data);
      } catch (error) {
        toast.error("Gagal memuat produk");
        router.push("/seller/dashboard/products");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
  }, [productId, router]);

  const handleBoost = async () => {
    if (!product) return;

    setIsBoosting(true);
    try {
      await sellerApi.boostProduct(product.id, selectedPlan.days);
      toast.success(
        `Permintaan boost berhasil dikirim! Silakan lakukan pembayaran untuk mengaktifkan boost.`
      );
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

  if (!product) return null;

  const isCurrentlyBoosted =
    product.isBoosted &&
    product.boostedUntil &&
    new Date(product.boostedUntil) > new Date();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <PageTitle title="Boost Produk" />

      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </button>

      {/* Current Boost Status */}
      {isCurrentlyBoosted && (
        <div className="mb-6 rounded-xl border-2 border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900">
                Produk Sedang Di-Boost
              </p>
              <p className="text-sm text-green-700 mt-1">
                Aktif hingga:{" "}
                {new Date(product.boostedUntil!).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Product Preview */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-gray-200 bg-white p-4 sticky top-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Produk yang akan di-boost
            </h3>
            <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 mb-3">
              {product.thumbnail ? (
                <Image
                  src={product.thumbnail}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Zap className="h-12 w-12 text-gray-300" />
                </div>
              )}
            </div>
            <h4 className="font-semibold text-gray-900 line-clamp-2">
              {product.name}
            </h4>
            <p className="text-lg font-bold text-blue-600 mt-2">
              {formatPrice(product.price)}
            </p>
          </div>
        </div>

        {/* Boost Plans */}
        <div className="lg:col-span-2">
          {/* Benefits */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 mb-6">
            <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Keuntungan Boost Produk
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Eye className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900">
                    Tampil di Halaman Utama
                  </p>
                  <p className="text-sm text-blue-700">
                    Produk muncul di bagian atas hasil pencarian
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900">
                    Badge "Promoted"
                  </p>
                  <p className="text-sm text-blue-700">
                    Produk ditandai sebagai produk unggulan
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900">
                    Prioritas Tinggi
                  </p>
                  <p className="text-sm text-blue-700">
                    Muncul lebih dulu dari produk biasa
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Eye className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900">
                    Lebih Banyak Views
                  </p>
                  <p className="text-sm text-blue-700">
                    Meningkatkan visibilitas hingga 10x lipat
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Plans */}
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Pilih Durasi Boost
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {BOOST_PLANS.map((plan) => (
              <button
                key={plan.days}
                onClick={() => setSelectedPlan(plan)}
                className={`relative rounded-xl border-2 p-6 text-left transition-all ${
                  selectedPlan.days === plan.days
                    ? "border-blue-500 bg-blue-50 shadow-lg"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                      Paling Populer
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <span className="font-semibold text-gray-900">
                    {plan.label}
                  </span>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  ${plan.price}
                </p>
                <p className="text-sm text-gray-500">
                  ${(plan.price / plan.days).toFixed(2)}/hari
                </p>
                {plan.savings && (
                  <div className="mt-3 inline-block rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                    Hemat {plan.savings}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Ringkasan Pembayaran
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Durasi Boost</span>
                <span className="font-semibold text-gray-900">
                  {selectedPlan.label} ({selectedPlan.days} hari)
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Harga per hari</span>
                <span className="font-semibold text-gray-900">
                  ${(selectedPlan.price / selectedPlan.days).toFixed(2)}
                </span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-blue-600">
                  ${selectedPlan.price}
                </span>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-2">Cara Melakukan Boost:</p>
                <ol className="list-decimal list-inside space-y-1.5 ml-1">
                  <li>Klik tombol "Lanjutkan ke Pembayaran" di bawah</li>
                  <li>Sistem akan membuat permintaan boost untuk produk Anda</li>
                  <li>Anda akan diarahkan ke halaman Boost & Top Ads</li>
                  <li>Lakukan pembayaran sesuai nominal yang tertera</li>
                  <li>Upload bukti pembayaran</li>
                  <li>Tunggu konfirmasi dari admin (maks 1x24 jam)</li>
                  <li>Boost akan aktif setelah pembayaran dikonfirmasi</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={() => setShowConfirmModal(true)}
            size="lg"
            className="w-full"
          >
            <Zap className="h-5 w-5 mr-2" />
            Lanjutkan ke Pembayaran
          </Button>
        </div>
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
                <h3 className="font-bold text-gray-900">Konfirmasi Boost Produk</h3>
                <p className="text-sm text-gray-500">
                  Pastikan detail boost sudah benar
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-lg bg-gray-50 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Produk:</span>
                <span className="font-semibold text-gray-900 text-right max-w-[200px] truncate">
                  {product?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Durasi:</span>
                <span className="font-semibold text-gray-900">
                  {selectedPlan.label} ({selectedPlan.days} hari)
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold text-gray-900">Total Biaya:</span>
                <span className="text-lg font-bold text-blue-600">
                  ${selectedPlan.price}
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
