"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Crown, Zap, Star, TrendingUp, X } from "lucide-react";
import { sellerApi } from "@/services/seller.service";

export function UpgradePremiumBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expiryWarning, setExpiryWarning] = useState<{ daysLeft: number; plan: string } | null>(null);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const res = await sellerApi.getCurrentSubscription();
        const plan = res.data?.tenant?.subscriptionPlan || "FREE";
        const expiresAt = res.data?.tenant?.subscriptionExpiresAt;
        setIsPremium(plan !== "FREE");
        
        // Check if subscription is expiring soon (within 7 days)
        if (plan !== "FREE" && expiresAt) {
          const daysLeft = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 7 && daysLeft > 0) {
            setExpiryWarning({ daysLeft, plan });
            setIsVisible(true);
            return;
          }
        }
        
        // Show upgrade banner only for FREE users
        if (plan === "FREE") {
          const dismissed = localStorage.getItem("upgrade_banner_dismissed");
          const dismissedTime = dismissed ? parseInt(dismissed) : 0;
          const now = Date.now();
          const oneDayInMs = 24 * 60 * 60 * 1000;
          
          if (!dismissed || (now - dismissedTime) > oneDayInMs) {
            setIsVisible(true);
          }
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("upgrade_banner_dismissed", Date.now().toString());
  };

  if (isLoading || !isVisible || isPremium) {
    return null;
  }

  // Show expiry warning for paid users about to expire
  if (expiryWarning) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 via-orange-400 to-red-400 p-5 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">
              Langganan {expiryWarning.plan} Anda akan berakhir dalam {expiryWarning.daysLeft} hari
            </h3>
            <p className="text-sm text-white/90 mt-1">
              Perpanjang sekarang agar fitur premium tetap aktif dan toko Anda tetap tampil di marketplace.
            </p>
          </div>
          <Link
            href="/seller/dashboard/subscription"
            className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-orange-600 shadow hover:bg-gray-50"
          >
            Perpanjang
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-6 shadow-xl">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white blur-3xl" />
      </div>

      {/* Close Button */}
      <button
        onClick={handleDismiss}
        className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 text-white transition-colors hover:bg-white/30"
        aria-label="Tutup banner"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="hidden sm:flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <Crown className="h-8 w-8 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold text-white">
                Upgrade ke Premium Sekarang!
              </h3>
              <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-bold text-orange-600 animate-pulse">
                🔥 PROMO
              </span>
            </div>
            
            <p className="text-sm text-white/90 mb-4 max-w-2xl">
              Dapatkan akses penuh ke semua fitur premium dan tingkatkan penjualan Anda hingga 10x lipat!
            </p>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {[
                { icon: Zap, text: "Boost Unlimited" },
                { icon: Star, text: "Badge Verified" },
                { icon: TrendingUp, text: "Analytics Pro" },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-lg bg-white/10 backdrop-blur-sm px-3 py-2"
                >
                  <feature.icon className="h-4 w-4 text-white" />
                  <span className="text-sm font-medium text-white">
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/seller/dashboard/subscription"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl hover:scale-105"
              >
                <Crown className="h-4 w-4" />
                Lihat Paket Premium
              </Link>
              <button
                onClick={handleDismiss}
                className="text-sm font-medium text-white/80 hover:text-white transition-colors"
              >
                Nanti saja
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
