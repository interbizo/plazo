"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sellerApi } from "@/services/seller.service";
import { uploadApi } from "@/services/upload.service";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Upload, CheckCircle, XCircle, Clock, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

interface PlanConfig {
  id: string;
  plan: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice?: number;
  description?: string;
  [key: string]: unknown;
}

interface PaymentAccount {
  id: string;
  type: string;
  bankName?: string;
  accountNumber: string;
  accountName: string;
  walletType?: string;
  phoneNumber?: string;
  isPrimary: boolean;
}

function SubscriptionPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const refParam = searchParams.get("ref");
  const durationParam = searchParams.get("duration"); // 'monthly' or 'yearly'
  
  const [plan, setPlan] = useState<PlanConfig | null>(null);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
    durationParam === 'yearly' ? 'yearly' : 'monthly'
  );
  const proofInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    proofImageUrl: "",
    accountName: "",
    accountNumber: "",
    transferDate: "",
    notes: "",
    referralCode: refParam || "",
  });

  useEffect(() => {
    if (refParam || typeof window === "undefined") return;
    const storedCode = window.localStorage.getItem("affiliateReferralCode");
    if (storedCode) {
      setForm((prev) =>
        prev.referralCode ? prev : { ...prev, referralCode: storedCode },
      );
    }
  }, [refParam]);

  useEffect(() => {
    const loadData = async () => {
      if (!planParam) {
        router.push("/seller/dashboard/subscription");
        return;
      }

      try {
        const [plansRes, accountsRes] = await Promise.all([
          sellerApi.getSubscriptionPlans(),
          api.get("/api/subscription/payment-accounts").then((r: any) => r.data),
        ]);
        
        const selectedPlan = plansRes.data.find((p: PlanConfig) => p.plan === planParam);
        
        if (!selectedPlan) {
          toast.error("Paket tidak ditemukan");
          router.push("/seller/dashboard/subscription");
          return;
        }

        setPlan(selectedPlan);
        setPaymentAccounts(accountsRes?.data || accountsRes || []);
      } catch {
        toast.error("Gagal memuat data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [planParam, router]);

  useEffect(() => {
    if (refParam) {
      setForm((prev) => ({ ...prev, referralCode: refParam }));
    }
  }, [refParam]);

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 10MB");
      return;
    }

    setIsUploadingProof(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data } = await uploadApi.uploadFile(formData, "ATTACHMENT");
      setForm((prev) => ({ ...prev, proofImageUrl: data.file.url }));
      toast.success("Bukti transfer berhasil diupload");
    } catch {
      toast.error("Gagal upload bukti transfer");
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.proofImageUrl) {
      toast.error("Harap upload bukti transfer");
      return;
    }

    if (!plan) return;

    // Calculate amount and duration based on billing cycle
    const amount = billingCycle === 'yearly' && plan.yearlyPrice 
      ? plan.yearlyPrice 
      : plan.monthlyPrice;
    const durationDays = billingCycle === 'yearly' ? 365 : 30;

    setIsSubmitting(true);
    try {
      await sellerApi.createSubscriptionPayment({
        plan: plan.plan,
        amount,
        durationDays,
        proofImageUrl: form.proofImageUrl,
        accountName: form.accountName,
        accountNumber: form.accountNumber,
        transferDate: form.transferDate,
        notes: form.notes,
        referralCode: form.referralCode || undefined,
      });

      if (typeof window !== "undefined" && form.referralCode) {
        window.localStorage.removeItem("affiliateReferralCode");
      }
      toast.success("Bukti pembayaran berhasil dikirim!");
      router.push("/seller/dashboard/subscription");
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      toast.error(apiErr?.response?.data?.message || "Gagal mengirim bukti pembayaran");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/seller/dashboard/subscription"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Subscription
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Pembayaran Langganan
      </h1>
      <p className="text-gray-600 mb-6">
        Kirim bukti transfer untuk mengaktifkan paket {plan.name}
      </p>

      {/* Plan Summary */}
      <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-emerald-600">
              Rp {(billingCycle === 'yearly' && plan.yearlyPrice 
                ? plan.yearlyPrice 
                : plan.monthlyPrice).toLocaleString("id-ID")}
            </p>
            <p className="text-xs text-gray-500">
              per {billingCycle === 'yearly' ? 'tahun' : 'bulan'}
            </p>
          </div>
        </div>

        {/* Billing Cycle Toggle */}
        {plan.yearlyPrice && plan.yearlyPrice > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Pilih Periode Langganan:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`relative rounded-lg border-2 p-3 text-left transition-all ${
                  billingCycle === 'monthly'
                    ? 'border-emerald-500 bg-white shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {billingCycle === 'monthly' && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  </div>
                )}
                <p className="font-semibold text-gray-900">Bulanan</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  Rp {plan.monthlyPrice.toLocaleString("id-ID")}
                </p>
                <p className="text-xs text-gray-500">per bulan</p>
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`relative rounded-lg border-2 p-3 text-left transition-all ${
                  billingCycle === 'yearly'
                    ? 'border-emerald-500 bg-white shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {billingCycle === 'yearly' && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  </div>
                )}
                <div className="absolute -top-2 -right-2">
                  <span className="inline-block rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    HEMAT {Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100)}%
                  </span>
                </div>
                <p className="font-semibold text-gray-900">Tahunan</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  Rp {plan.yearlyPrice.toLocaleString("id-ID")}
                </p>
                <p className="text-xs text-gray-500">per tahun</p>
                <p className="text-xs text-emerald-600 font-medium mt-1">
                  ~Rp {Math.round(plan.yearlyPrice / 12).toLocaleString("id-ID")}/bulan
                </p>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Instructions */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Instruksi Pembayaran
        </h3>
        <ol className="space-y-3 text-sm text-gray-600">
          <li className="flex gap-3">
            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 font-semibold text-xs">
              1
            </span>
              <div className="flex-1">
                <p className="mb-2">
                  Transfer sejumlah <strong>Rp {(billingCycle === 'yearly' && plan.yearlyPrice 
                    ? plan.yearlyPrice 
                    : plan.monthlyPrice).toLocaleString("id-ID")}</strong> ke salah satu rekening berikut:
                </p>
              {paymentAccounts.length > 0 ? (
                <div className="space-y-2">
                  {paymentAccounts.map((account) => (
                    <div key={account.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      {account.type === "BANK_TRANSFER" ? (
                        <>
                          <p className="font-semibold text-gray-900">{account.bankName}</p>
                          <p className="text-sm">No. Rekening: <strong>{account.accountNumber}</strong></p>
                          <p className="text-sm">Atas Nama: <strong>{account.accountName}</strong></p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-gray-900">{account.walletType}</p>
                          <p className="text-sm">No. HP: <strong>{account.phoneNumber}</strong></p>
                          <p className="text-sm">Atas Nama: <strong>{account.accountName}</strong></p>
                        </>
                      )}
                      {account.isPrimary && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded">
                          Rekening Utama
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Rekening pembayaran belum tersedia. Hubungi admin.</p>
                </div>
              )}
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 font-semibold text-xs">
              2
            </span>
            <span>Upload bukti transfer pada form di bawah</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 font-semibold text-xs">
              3
            </span>
            <span>Tunggu konfirmasi dari admin (maksimal 1x24 jam)</span>
          </li>
        </ol>
      </div>

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Upload Bukti Transfer
          </h3>

          {/* Proof Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bukti Transfer <span className="text-red-500">*</span>
            </label>
            {form.proofImageUrl ? (
              <div className="relative">
                <img
                  src={form.proofImageUrl}
                  alt="Bukti Transfer"
                  className="w-full max-w-md rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, proofImageUrl: "" }))}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <XCircle className="h-4 w-4" />
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

          <Input
            label="Nama Pengirim"
            value={form.accountName}
            onChange={(e) => setForm((prev) => ({ ...prev, accountName: e.target.value }))}
            placeholder="Nama sesuai rekening"
          />

          <Input
            label="Nomor Rekening Pengirim"
            value={form.accountNumber}
            onChange={(e) => setForm((prev) => ({ ...prev, accountNumber: e.target.value }))}
            placeholder="Nomor rekening yang digunakan"
          />

          <Input
            label="Tanggal Transfer"
            type="date"
            value={form.transferDate}
            onChange={(e) => setForm((prev) => ({ ...prev, transferDate: e.target.value }))}
          />

          <Input
            label="Kode Referral Affiliate (Opsional)"
            value={form.referralCode}
            onChange={(e) => setForm((prev) => ({ ...prev, referralCode: e.target.value.toUpperCase() }))}
            placeholder="Contoh: RIZKY-ABC123"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catatan (Opsional)
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="Catatan tambahan untuk admin"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/seller/dashboard/subscription")}
            className="flex-1"
          >
            Batal
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={!form.proofImageUrl}
            className="flex-1"
          >
            Kirim Bukti Pembayaran
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function SubscriptionPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      }
    >
      <SubscriptionPaymentContent />
    </Suspense>
  );
}
