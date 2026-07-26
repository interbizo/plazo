"use client";

import { useState } from "react";
import { X, Zap, Check, TrendingUp, Eye, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";

interface BoostModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: "product" | "service" | "job";
  itemId: string;
  itemName: string;
  onBoostSuccess: () => void;
  boostFunction: (id: string, days: number) => Promise<any>;
}

const BOOST_PLANS = [
  {
    days: 7,
    price: 50000,
    label: "1 Minggu",
    popular: false,
    benefits: ["Tampil di halaman utama", "Badge 'Promoted'", "Prioritas pencarian"],
  },
  {
    days: 14,
    price: 90000,
    label: "2 Minggu",
    popular: true,
    discount: 10,
    benefits: [
      "Tampil di halaman utama",
      "Badge 'Promoted'",
      "Prioritas pencarian",
      "Hemat 10%",
    ],
  },
  {
    days: 30,
    price: 150000,
    label: "1 Bulan",
    popular: false,
    discount: 25,
    benefits: [
      "Tampil di halaman utama",
      "Badge 'Promoted'",
      "Prioritas pencarian",
      "Hemat 25%",
      "Statistik detail",
    ],
  },
];

export function BoostModal({
  isOpen,
  onClose,
  itemType,
  itemId,
  itemName,
  onBoostSuccess,
  boostFunction,
}: BoostModalProps) {
  const [selectedPlan, setSelectedPlan] = useState(14);
  const [isBoosting, setIsBoosting] = useState(false);

  if (!isOpen) return null;

  const handleBoost = async () => {
    setIsBoosting(true);
    try {
      await boostFunction(itemId, selectedPlan);
      toast.success(`${itemType === "product" ? "Produk" : itemType === "service" ? "Jasa" : "Job"} berhasil di-boost!`);
      onBoostSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Gagal boost. Silakan coba lagi.");
    } finally {
      setIsBoosting(false);
    }
  };

  const selectedPlanData = BOOST_PLANS.find((p) => p.days === selectedPlan);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Zap className="h-6 w-6 text-yellow-500" />
              Boost {itemType === "product" ? "Produk" : itemType === "service" ? "Jasa" : "Job"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Tingkatkan visibilitas: <span className="font-semibold text-gray-900">{itemName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Benefits Section */}
          <div className="mb-8 rounded-xl bg-gradient-to-r from-yellow-50 to-orange-50 p-6 border border-yellow-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-yellow-600" />
              Keuntungan Boost
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-yellow-100 p-2">
                  <Eye className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Lebih Terlihat</p>
                  <p className="text-sm text-gray-600">Tampil di halaman utama dan hasil pencarian teratas</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-yellow-100 p-2">
                  <Star className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Badge Premium</p>
                  <p className="text-sm text-gray-600">Dapatkan badge "Promoted" yang menarik perhatian</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-yellow-100 p-2">
                  <TrendingUp className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Penjualan Meningkat</p>
                  <p className="text-sm text-gray-600">Rata-rata 3x lebih banyak views dan konversi</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Plans */}
          <h3 className="text-lg font-bold text-gray-900 mb-4">Pilih Paket Boost</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {BOOST_PLANS.map((plan) => (
              <button
                key={plan.days}
                onClick={() => setSelectedPlan(plan.days)}
                className={`relative rounded-xl border-2 p-6 text-left transition-all ${
                  selectedPlan === plan.days
                    ? "border-yellow-500 bg-yellow-50 shadow-lg scale-105"
                    : "border-gray-200 hover:border-yellow-300 hover:shadow-md"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-yellow-500 px-3 py-1 text-xs font-bold text-white">
                      POPULER
                    </span>
                  </div>
                )}
                {plan.discount && (
                  <div className="absolute -top-3 -right-3">
                    <span className="rounded-full bg-green-500 px-2 py-1 text-xs font-bold text-white">
                      -{plan.discount}%
                    </span>
                  </div>
                )}
                <div className="mb-4">
                  <p className="text-2xl font-bold text-gray-900">{plan.label}</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-2">
                    {formatPrice(plan.price)}
                  </p>
                  {plan.discount && (
                    <p className="text-sm text-gray-500 line-through">
                      {formatPrice(plan.price / (1 - plan.discount / 100))}
                    </p>
                  )}
                </div>
                <ul className="space-y-2">
                  {plan.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
                {selectedPlan === plan.days && (
                  <div className="absolute top-4 right-4">
                    <div className="rounded-full bg-yellow-500 p-1">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 mb-6">
            <h4 className="font-bold text-gray-900 mb-4">Ringkasan</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Paket</span>
                <span className="font-semibold text-gray-900">{selectedPlanData?.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Durasi</span>
                <span className="font-semibold text-gray-900">{selectedPlan} hari</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Mulai</span>
                <span className="font-semibold text-gray-900">Segera setelah pembayaran</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Berakhir</span>
                <span className="font-semibold text-gray-900">
                  {new Date(Date.now() + selectedPlan * 24 * 60 * 60 * 1000).toLocaleDateString("id-ID")}
                </span>
              </div>
              <div className="border-t border-gray-300 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-yellow-600">
                    {formatPrice(selectedPlanData?.price || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={isBoosting}
            >
              Batal
            </Button>
            <Button
              onClick={handleBoost}
              isLoading={isBoosting}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              <Zap className="h-4 w-4 mr-2" />
              Boost Sekarang
            </Button>
          </div>

          {/* Note */}
          <p className="text-xs text-gray-500 text-center mt-4">
            Dengan melakukan boost, Anda menyetujui{" "}
            <a href="/terms" className="text-blue-600 hover:underline">
              syarat dan ketentuan
            </a>{" "}
            layanan boost.
          </p>
        </div>
      </div>
    </div>
  );
}
