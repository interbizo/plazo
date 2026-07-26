"use client";

import { useState } from "react";
import { X, Zap, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";

interface BoostModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: "product" | "service" | "job";
  itemId: string;
  itemName: string;
  onBoostSuccess?: () => void;
  boostFunction: (id: string, days: number) => Promise<any>;
}

const BOOST_PLANS = [
  {
    days: 7,
    price: 9.99,
    label: "1 Minggu",
    popular: false,
  },
  {
    days: 14,
    price: 17.99,
    label: "2 Minggu",
    popular: true,
    savings: "10%",
  },
  {
    days: 30,
    price: 29.99,
    label: "1 Bulan",
    popular: false,
    savings: "33%",
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
  const [selectedDays, setSelectedDays] = useState(14);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const selectedPlan = BOOST_PLANS.find((p) => p.days === selectedDays);

  const handleBoost = async () => {
    setIsLoading(true);
    try {
      await boostFunction(itemId, selectedDays);
      toast.success(`${itemType === "product" ? "Produk" : itemType === "service" ? "Jasa" : "Job"} berhasil di-boost!`);
      onBoostSuccess?.();
      onClose();
    } catch (error: any) {
      const message = error?.response?.data?.message || "Gagal boost item";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-yellow-400 to-orange-500">
              <Zap className="h-5 w-5 fill-white text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Boost Item</h2>
              <p className="text-sm text-gray-500">Tingkatkan visibilitas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Item Info */}
          <div className="mb-6 rounded-lg bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900">
              {itemType === "product" ? "Produk" : itemType === "service" ? "Jasa" : "Job"}:
            </p>
            <p className="text-base font-bold text-blue-700">{itemName}</p>
          </div>

          {/* Plans */}
          <div className="mb-6 space-y-3">
            <label className="text-sm font-semibold text-gray-700">
              Pilih Durasi Boost:
            </label>
            {BOOST_PLANS.map((plan) => (
              <button
                key={plan.days}
                onClick={() => setSelectedDays(plan.days)}
                className={`relative w-full rounded-xl border-2 p-4 text-left transition-all ${
                  selectedDays === plan.days
                    ? "border-yellow-500 bg-yellow-50 shadow-md"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900">
                        {plan.label}
                      </span>
                      {plan.popular && (
                        <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs font-bold text-white">
                          POPULER
                        </span>
                      )}
                      {plan.savings && (
                        <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold text-white">
                          HEMAT {plan.savings}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {plan.days} hari prioritas di pencarian
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        ${plan.price}
                      </p>
                      <p className="text-xs text-gray-500">
                        ${(plan.price / plan.days).toFixed(2)}/hari
                      </p>
                    </div>
                    {selectedDays === plan.days && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Benefits */}
          <div className="mb-6 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 p-4">
            <p className="mb-2 text-sm font-semibold text-gray-900">
              Keuntungan Boost:
            </p>
            <ul className="space-y-1.5 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
                <span>Muncul di urutan teratas hasil pencarian</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
                <span>Badge "BOOSTED" yang menarik perhatian</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
                <span>Visibilitas 10x lebih tinggi dari item biasa</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
                <span>Meningkatkan peluang penjualan hingga 300%</span>
              </li>
            </ul>
          </div>

          {/* Warning */}
          <div className="mb-6 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Biaya boost akan dipotong dari saldo Anda. Pastikan saldo
              mencukupi sebelum melanjutkan.
            </p>
          </div>

          {/* Total */}
          <div className="mb-6 rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">
                Total Biaya:
              </span>
              <span className="text-2xl font-bold text-gray-900">
                {formatPrice(selectedPlan?.price || 0)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              onClick={handleBoost}
              isLoading={isLoading}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
            >
              <Zap className="mr-2 h-4 w-4" />
              Boost Sekarang
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
