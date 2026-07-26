"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Crown, X } from "lucide-react";
import { sellerApi } from "@/services/seller.service";

export function FloatingUpgradeButton() {
  const [isVisible, setIsVisible] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const res = await sellerApi.getCurrentSubscription();
        const plan = res.data?.tenant?.subscriptionPlan || "FREE";
        setIsPremium(plan !== "FREE");
        
        // Show button only for FREE users
        if (plan === "FREE") {
          // Check if user has dismissed the button
          const dismissed = sessionStorage.getItem("floating_upgrade_dismissed");
          if (!dismissed) {
            // Show after 3 seconds
            setTimeout(() => {
              setIsVisible(true);
            }, 3000);
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

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDismissed(true);
    setIsVisible(false);
    sessionStorage.setItem("floating_upgrade_dismissed", "true");
  };

  if (isLoading || !isVisible || isPremium || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="relative">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute -right-2 -top-2 rounded-full bg-gray-800 p-1 text-white shadow-lg hover:bg-gray-700 transition-colors"
          aria-label="Tutup"
        >
          <X className="h-3 w-3" />
        </button>

        {/* Main button */}
        <Link
          href="/seller/dashboard/subscription"
          className="group flex items-center gap-3 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 shadow-2xl transition-all hover:shadow-3xl hover:scale-105"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Crown className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                Upgrade Premium
              </span>
              <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-blue-600">
                🔥 HOT
              </span>
            </div>
            <p className="text-xs text-white/80">
              Fitur lengkap, penjualan maksimal
            </p>
          </div>
        </Link>

        {/* Pulse effect */}
        <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 opacity-75 blur-xl animate-pulse" />
      </div>
    </div>
  );
}
