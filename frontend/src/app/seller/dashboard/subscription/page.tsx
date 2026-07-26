"use client";

import { useEffect, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { sellerApi } from "@/services/seller.service";
import { formatPrice } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import type {
  SubscriptionPlanConfig,
  TenantSubscriptionInfo,
  SubscriptionHistory,
} from "@/types";
import {
  Crown,
  Check,
  Zap,
  Shield,
  Star,
  Globe,
  ArrowUp,
  ArrowDown,
  Clock,
  History,
  CreditCard,
  ChevronDown,
  Gift,
  Phone,
} from "lucide-react";
import toast from "react-hot-toast";

// Plan display config
const PLAN_ICONS: Record<string, typeof Crown> = {
  FREE: Zap,
  BASIC: Shield,
  PROFESSIONAL: Star,
  PREMIUM: Star,
  ULTIMATE: Crown,
  ENTERPRISE: Crown,
};

const PLAN_COLORS: Record<string, string> = {
  FREE: "border-gray-200 bg-gray-50",
  BASIC: "border-blue-200 bg-blue-50",
  PROFESSIONAL: "border-purple-200 bg-purple-50",
  PREMIUM: "border-orange-200 bg-orange-50",
  ULTIMATE: "border-rose-200 bg-rose-50",
  ENTERPRISE: "border-yellow-200 bg-yellow-50",
};

const PLAN_BADGE_COLORS: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-700",
  BASIC: "bg-blue-100 text-blue-700",
  PROFESSIONAL: "bg-purple-100 text-purple-700",
  PREMIUM: "bg-orange-100 text-orange-700",
  ULTIMATE: "bg-rose-100 text-rose-700",
  ENTERPRISE: "bg-yellow-100 text-yellow-700",
};

const getEffectivePlanBenefits = (plan: SubscriptionPlanConfig) => {
  const benefits = [
    {
      enabled: true,
      label: `${plan.postsLimit === 999999 ? "Unlimited" : plan.postsLimit} posting produk/jasa`,
    },
    {
      enabled: true,
      label: "Toko online dan katalog produk/jasa",
    },
    {
      enabled: plan.canPublishToMarketplace,
      label: "Publish produk/jasa ke marketplace utama",
    },
    {
      enabled: plan.monthlyPrice > 0,
      label: "Kirim proposal ke job buyer",
    },
    {
      enabled: plan.monthlyPrice > 0,
      label: "Tombol Beli via WhatsApp di produk",
    },
    {
      enabled: plan.monthlyPrice > 0,
      label: "Akses tools rekomendasi seller",
    },
    {
      enabled: plan.monthlyPrice > 0,
      label: "Bisa jadi affiliate seller",
    },
    {
      enabled: plan.canVerifiedBadge,
      label: "Badge toko terverifikasi",
    },
    {
      enabled: plan.canFeaturedStore,
      label: "Toko tampil di featured homepage",
    },
    {
      enabled: plan.canHighlightProducts,
      label: "Boost / Top Ads produk dan jasa",
    },
    {
      enabled: plan.canFlashSale,
      label: "Ajukan produk/jasa ke Flash Sale",
    },
  ];

  return benefits.filter((benefit) => benefit.enabled);
};

export default function SellerSubscriptionPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlanConfig[]>([]);
  const [current, setCurrent] = useState<{
    tenant: TenantSubscriptionInfo;
    subscription: Record<string, unknown> | null;
    planConfig: SubscriptionPlanConfig;
  } | null>(null);
  const [history, setHistory] = useState<SubscriptionHistory[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [togglingAutoRenew, setTogglingAutoRenew] = useState(false);
  const [confirmPlan, setConfirmPlan] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<Record<string, 'monthly' | 'yearly'>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, currentRes, historyRes, paymentsRes] = await Promise.all([
          sellerApi.getSubscriptionPlans(),
          sellerApi.getCurrentSubscription(),
          sellerApi.getSubscriptionHistory().catch(() => ({ data: [] })),
          sellerApi.getSubscriptionPayments().catch(() => ({ data: [] })),
        ]);
        startTransition(() => {
          setPlans(plansRes.data);
          setCurrent(currentRes.data);
          setHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
          const paymentData = paymentsRes.data?.data || paymentsRes.data;
          setPayments(Array.isArray(paymentData) ? paymentData : []);
        });
      } catch {
        toast.error("Gagal memuat data subscription");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleChangePlan = (plan: string) => {
    // Redirect to payment page for paid plans
    const selectedPlan = plans.find((p) => p.plan === plan);
    if (selectedPlan && selectedPlan.monthlyPrice > 0) {
      const billingCycle = selectedBillingCycle[plan] || 'monthly';
      router.push(`/seller/dashboard/subscription/payment?plan=${plan}&duration=${billingCycle}`);
    } else {
      // Free plan - direct change
      handleDirectChangePlan(plan);
    }
  };

  const handleDirectChangePlan = async (plan: string) => {
    setConfirmPlan(null);
    setChangingPlan(plan);
    try {
      const { data } = await sellerApi.changePlan(plan);
      toast.success(
        (data as { message?: string }).message || "Paket berhasil diubah!",
      );
      // Refresh data
      const [currentRes, historyRes] = await Promise.all([
        sellerApi.getCurrentSubscription(),
        sellerApi.getSubscriptionHistory().catch(() => ({ data: [] })),
      ]);
      setCurrent(currentRes.data);
      setHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
    } catch (err: unknown) {
      const errObj = err as {
        response?: { data?: { message?: string } };
      };
      toast.error(
        errObj?.response?.data?.message || "Gagal mengubah paket",
      );
    } finally {
      setChangingPlan(null);
    }
  };

  const handleCancelSubscription = async () => {
    setConfirmCancel(false);
    setCancellingSubscription(true);
    try {
      await sellerApi.cancelSubscription();
      toast.success("Langganan berhasil dibatalkan");
      const [currentRes, historyRes] = await Promise.all([
        sellerApi.getCurrentSubscription(),
        sellerApi.getSubscriptionHistory().catch(() => ({ data: [] })),
      ]);
      setCurrent(currentRes.data);
      setHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
    } catch (err: unknown) {
      const errObj = err as {
        response?: { data?: { message?: string } };
      };
      toast.error(errObj?.response?.data?.message || "Gagal membatalkan langganan");
    } finally {
      setCancellingSubscription(false);
    }
  };

  const handleToggleAutoRenew = async () => {
    const currentAutoRenew = (current?.subscription as Record<string, unknown>)?.autoRenew === true;
    const newValue = !currentAutoRenew;
    setTogglingAutoRenew(true);
    try {
      await sellerApi.updateAutoRenew(newValue);
      toast.success(newValue ? "Auto-renew diaktifkan" : "Auto-renew dinonaktifkan");
      const currentRes = await sellerApi.getCurrentSubscription();
      setCurrent(currentRes.data);
    } catch (err: unknown) {
      const errObj = err as {
        response?: { data?: { message?: string } };
      };
      toast.error(errObj?.response?.data?.message || "Gagal mengubah auto-renew");
    } finally {
      setTogglingAutoRenew(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const currentPlan = current?.tenant?.subscriptionPlan || "FREE";
  const currentTier = current?.tenant?.sellerTier || "FREE";

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">
        Langganan &amp; Paket
      </h1>

      {/* Current Plan Summary */}
      {current?.tenant && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${PLAN_BADGE_COLORS[currentPlan]}`}
                >
                  {(() => {
                    const Icon = PLAN_ICONS[currentPlan] || Zap;
                    return <Icon className="h-4 w-4" />;
                  })()}
                  {currentPlan}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    currentTier === "MEMBER"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {currentTier === "MEMBER" ? "Member" : "Free"}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Kuota posting:{" "}
                <strong>{current.tenant.usedPosts}</strong> /{" "}
                {current.tenant.postsLimit === 999999
                  ? "Unlimited"
                  : current.tenant.postsLimit}
                {current.tenant.postsLimit !== 999999 && (
                  <span className="text-gray-400">
                    {" "}
                    ({current.tenant.postsRemaining} tersisa)
                  </span>
                )}
              </p>
              {current.tenant.subscriptionExpiresAt && (
                <p className="text-xs text-gray-400 mt-1">
                  <Clock className="inline h-3 w-3 mr-1" />
                  Berlaku hingga:{" "}
                  {new Date(
                    current.tenant.subscriptionExpiresAt,
                  ).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Auto-Renew Toggle */}
              {currentPlan !== "FREE" && (
                <button
                  onClick={handleToggleAutoRenew}
                  disabled={togglingAutoRenew}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  <div
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      (current?.subscription as Record<string, unknown>)?.autoRenew === true
                        ? "bg-emerald-500"
                        : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        (current?.subscription as Record<string, unknown>)?.autoRenew === true
                          ? "translate-x-4"
                          : "translate-x-0.5"
                      }`}
                    />
                  </div>
                  <span>Auto-Renew</span>
                </button>
              )}
              {/* Cancel Subscription */}
              {currentPlan !== "FREE" && !confirmCancel && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmCancel(true)}
                  isLoading={cancellingSubscription}
                >
                  Batalkan Langganan
                </Button>
              )}
              {confirmCancel && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <span className="text-sm text-red-700">
                    Yakin ingin membatalkan langganan?
                  </span>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleCancelSubscription}
                    isLoading={cancellingSubscription}
                  >
                    Konfirmasi
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmCancel(false)}
                  >
                    Batal
                  </Button>
                </div>
              )}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                <History className="h-4 w-4" />
                Riwayat
              </button>
            </div>
          </div>

          {/* Feature badges */}
          <div className="mt-4 flex flex-wrap gap-2">
            {currentPlan !== "FREE" && (
              <>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                  <Phone className="h-3 w-3" /> Beli via WhatsApp
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <Gift className="h-3 w-3" /> Affiliate Seller
                </span>
              </>
            )}
            {current.planConfig?.canPublishToMarketplace && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <Globe className="h-3 w-3" /> Publish Marketplace
              </span>
            )}
            {current.tenant?.features?.isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                <Shield className="h-3 w-3" /> Terverifikasi
              </span>
            )}
            {current.tenant?.features?.canHighlightProducts && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-medium text-yellow-700">
                <Star className="h-3 w-3" /> Highlight Produk
              </span>
            )}
            {current.planConfig?.canFlashSale && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">
                <Zap className="h-3 w-3" /> Flash Sale
              </span>
            )}
            {current.tenant?.features?.isFeatured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                <Globe className="h-3 w-3" /> Featured Store
              </span>
            )}
          </div>

          {currentPlan !== "FREE" && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Program Affiliate tersedia untuk akun Anda</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Bagikan kode referral untuk dapat bonus 20%, atau bonus 30% jika Anda ditetapkan sebagai affiliate khusus kota.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => router.push("/seller/dashboard/affiliate")}
                >
                  <Gift className="mr-1 h-4 w-4" />
                  Buka Affiliate
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {showHistory && history.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Riwayat Langganan
          </h2>
          <div className="space-y-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between text-sm border-b border-gray-50 pb-2"
              >
                <div className="flex items-center gap-2">
                  {h.fromPlan !== h.toPlan &&
                    (h.reason === "upgrade" ? (
                      <ArrowUp className="h-4 w-4 text-green-500" />
                    ) : h.reason === "downgrade" ? (
                      <ArrowDown className="h-4 w-4 text-red-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-400" />
                    ))}
                  <span className="text-gray-700">
                    {h.fromPlan} → {h.toPlan}
                  </span>
                  {h.reason && (
                    <span className="text-xs text-gray-400">({h.reason})</span>
                  )}
                </div>
                <div className="text-right">
                  {h.amount > 0 && (
                    <span className="text-xs font-medium text-gray-600">
                      {formatPrice(h.amount)}
                    </span>
                  )}
                  <p className="text-xs text-gray-400">
                    {new Date(h.createdAt).toLocaleDateString("id-ID")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6">
        <button
          onClick={() => setShowPayments(!showPayments)}
          className="flex items-center justify-between w-full"
        >
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Riwayat Pembayaran
            {payments.length > 0 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {payments.length}
              </span>
            )}
          </h2>
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform ${showPayments ? "" : "-rotate-90"}`}
          />
        </button>

        {showPayments && (
          <div className="mt-4">
            {payments.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Belum ada riwayat pembayaran
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 pr-4 font-medium text-gray-500">Paket</th>
                      <th className="text-left py-2 pr-4 font-medium text-gray-500">Durasi</th>
                      <th className="text-left py-2 pr-4 font-medium text-gray-500">Jumlah</th>
                      <th className="text-left py-2 pr-4 font-medium text-gray-500">Status</th>
                      <th className="text-left py-2 font-medium text-gray-500">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment: any) => (
                      <tr key={payment.id} className="border-b border-gray-50">
                        <td className="py-2.5 pr-4 text-gray-700 font-medium">
                          {payment.plan}
                        </td>
                        <td className="py-2.5 pr-4 text-gray-600">
                          {payment.durationDays === 365 ? (
                            <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                              Tahunan
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                              Bulanan
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 text-gray-700">
                          {formatPrice(payment.amount)}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              payment.status === "APPROVED"
                                ? "bg-green-100 text-green-700"
                                : payment.status === "REJECTED"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {payment.status === "APPROVED"
                              ? "Disetujui"
                              : payment.status === "REJECTED"
                                ? "Ditolak"
                                : "Menunggu"}
                          </span>
                        </td>
                        <td className="py-2.5 text-gray-500">
                          {new Date(payment.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Plan Cards */}
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Pilih Paket
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const isCurrent = plan.plan === currentPlan;
          const Icon = PLAN_ICONS[plan.plan] || Zap;
          const isUpgrade =
            plan.monthlyPrice > (current?.planConfig?.monthlyPrice || 0);
          const billingCycle = selectedBillingCycle[plan.plan] || 'monthly';
          const displayPrice = billingCycle === 'yearly' && plan.yearlyPrice 
            ? plan.yearlyPrice 
            : plan.monthlyPrice;

          return (
            <div
              key={plan.plan}
              className={`rounded-xl border-2 p-5 transition-shadow hover:shadow-md ${
                isCurrent
                  ? "border-blue-500 ring-2 ring-blue-200"
                  : PLAN_COLORS[plan.plan]
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className="h-5 w-5" />
                <h3 className="text-lg font-bold text-gray-900">{plan.name || plan.plan}</h3>
                {isCurrent && (
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    AKTIF
                  </span>
                )}
              </div>

              {/* Billing Cycle Toggle for plans with yearly price */}
              {plan.yearlyPrice && plan.yearlyPrice > 0 && plan.monthlyPrice > 0 && !isCurrent && (
                <div className="mb-3">
                  <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                    <button
                      type="button"
                      onClick={() => setSelectedBillingCycle(prev => ({ ...prev, [plan.plan]: 'monthly' }))}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        billingCycle === 'monthly'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Bulanan
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedBillingCycle(prev => ({ ...prev, [plan.plan]: 'yearly' }))}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        billingCycle === 'yearly'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Tahunan
                      <span className="ml-1 text-[10px] text-green-600">
                        -{Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100)}%
                      </span>
                    </button>
                  </div>
                </div>
              )}

              <p className="text-2xl font-bold text-gray-900">
                {displayPrice === 0
                  ? "Gratis"
                  : formatPrice(displayPrice)}
                {displayPrice > 0 && (
                  <span className="text-sm font-normal text-gray-500">
                    {" "}/ {billingCycle === 'yearly' ? 'tahun' : 'bulan'}
                  </span>
                )}
              </p>
              {billingCycle === 'yearly' && plan.yearlyPrice && plan.yearlyPrice > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  ~{formatPrice(Math.round(plan.yearlyPrice / 12))}/bulan
                </p>
              )}
              {billingCycle === 'monthly' && plan.yearlyPrice && plan.yearlyPrice > 0 && plan.monthlyPrice > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  atau {formatPrice(plan.yearlyPrice)}
                  <span className="text-gray-500"> / tahun</span>
                  <span className="ml-1 text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                    Hemat {Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100)}%
                  </span>
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">{plan.description}</p>

              <div className="mt-4 space-y-2">
                {getEffectivePlanBenefits(plan).map((feature) => (
                  <div
                    key={feature.label}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-gray-700">
                      {feature.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                {isCurrent ? (
                  <div className="w-full rounded-lg bg-blue-100 py-2 text-center text-sm font-medium text-blue-700">
                    Paket Aktif
                  </div>
                ) : confirmPlan === plan.plan ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700 text-center">
                      Yakin ingin mengubah paket ke {plan.plan}?
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleChangePlan(plan.plan)}
                        isLoading={changingPlan === plan.plan}
                        className="flex-1"
                        size="sm"
                      >
                        Konfirmasi
                      </Button>
                      <Button
                        onClick={() => setConfirmPlan(null)}
                        variant="outline"
                        className="flex-1"
                        size="sm"
                      >
                        Batal
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => setConfirmPlan(plan.plan)}
                    isLoading={changingPlan === plan.plan}
                    className="w-full"
                    variant={isUpgrade ? "primary" : "outline"}
                    size="sm"
                  >
                    {isUpgrade ? (
                      <>
                        <ArrowUp className="h-4 w-4 mr-1" /> Upgrade
                      </>
                    ) : (
                      <>
                        <ArrowDown className="h-4 w-4 mr-1" /> Downgrade
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
