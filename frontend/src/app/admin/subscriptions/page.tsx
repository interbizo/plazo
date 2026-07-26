"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/services/admin.service";
import { formatPrice, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Layers,
  Settings,
  Users,
  Check,
  Save,
  RefreshCw,
  AlertTriangle,
  Crown,
  Shield,
  Star,
  Zap,
  Plus,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

// ============================================
// TYPES
// ============================================

interface PlanConfig {
  id: string;
  plan: string;
  name: string;
  description?: string;
  badge?: string;
  monthlyPrice: number;
  yearlyPrice?: number;
  postsLimit: number;
  maxImagesPerPost: number;
  maxFileSize: number;
  sortOrder: number;
  isActive: boolean;
  canPublishToMarketplace: boolean;
  canVerifiedBadge: boolean;
  canFeaturedStore: boolean;
  canHighlightProducts: boolean;
  canPriorityListing: boolean;
  canAdvancedAnalytics: boolean;
  canBulkUpload: boolean;
  canExportData: boolean;
  canFlashSale: boolean;
  canCustomTheme: boolean;
  canRemoveBranding: boolean;
  canRequestPhysicalVerification: boolean;
  canSubmitProposal: boolean;
  canWhatsappCheckout: boolean;
  canToolsRecommendation: boolean;
  canBecomeAffiliate: boolean;
  canBoostListing: boolean;
  features?: string[];
}

interface TenantSub {
  id: string;
  name: string;
  subdomain: string;
  subscriptionPlan: string;
  sellerTier: string;
  isActive: boolean;
  subscriptionExpiresAt?: string;
  usedPosts: number;
  postsLimit: number;
  owner?: { firstName: string; lastName: string; email: string };
}

type Tab = "plans" | "tenants";

const PLAN_ICONS: Record<string, typeof Zap> = {
  FREE: Zap,
  BASIC: Shield,
  PREMIUM: Star,
  PROFESSIONAL: Crown,
  ENTERPRISE: Crown,
  ULTIMATE: Crown,
};

const FEATURE_LABELS: Record<string, string> = {
  canPublishToMarketplace: "Publish Marketplace",
  canVerifiedBadge: "Badge Terverifikasi",
  canFeaturedStore: "Featured Homepage",
  canHighlightProducts: "Highlight Produk",
  canPriorityListing: "Priority Listing",
  canFlashSale: "Flash Sale",
  canBoostListing: "Boost / Top Ads",
  canSubmitProposal: "Kirim Proposal Job",
  canWhatsappCheckout: "Beli via WhatsApp",
  canToolsRecommendation: "Tools Rekomendasi Seller",
  canBecomeAffiliate: "Bisa Jadi Affiliate Seller",
  canRequestPhysicalVerification: "Verifikasi Kunjungan Fisik",
  canAdvancedAnalytics: "Advanced Analytics",
  canBulkUpload: "Bulk Upload",
  canExportData: "Export Data",
  canCustomTheme: "Custom Theme",
  canRemoveBranding: "Remove Branding",
};

const MEMBER_RULE_LABELS = [
  "Kirim proposal job",
  "Beli via WhatsApp di produk",
  "Tools rekomendasi seller",
  "Bisa jadi affiliate seller",
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function AdminSubscriptionsPage() {
  const [tab, setTab] = useState<Tab>("plans");
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [tenants, setTenants] = useState<TenantSub[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checkingExpired, setCheckingExpired] = useState(false);

  // Edit state
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PlanConfig>>({});
  const [saving, setSaving] = useState(false);

  // Create state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<Partial<PlanConfig>>({
    plan: "BASIC",
    name: "",
    description: "",
    monthlyPrice: 0,
    yearlyPrice: undefined,
    postsLimit: 10,
    maxImagesPerPost: 5,
    maxFileSize: 5,
    sortOrder: 0,
    isActive: true,
    canPublishToMarketplace: false,
    canVerifiedBadge: false,
    canFeaturedStore: false,
    canHighlightProducts: false,
    canPriorityListing: false,
    canAdvancedAnalytics: false,
    canBulkUpload: false,
    canExportData: false,
    canFlashSale: false,
    canCustomTheme: false,
    canRemoveBranding: false,
    canRequestPhysicalVerification: false,
    canSubmitProposal: false,
    canWhatsappCheckout: false,
    canToolsRecommendation: false,
    canBecomeAffiliate: false,
    canBoostListing: false,
    features: [],
  });
  const [creating, setCreating] = useState(false);

  // Delete state
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Tenant edit
  const [editTenantId, setEditTenantId] = useState<string | null>(null);
  const [editTenantPlan, setEditTenantPlan] = useState("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [plansRes, tenantsRes] = await Promise.allSettled([
        adminApi.getSubscriptionPlans(),
        adminApi.getSubscriptions({ page: 1, limit: 100 }),
      ]);

      if (plansRes.status === "fulfilled") {
        setPlans(plansRes.value.data || []);
      }
      if (tenantsRes.status === "fulfilled") {
        const raw = tenantsRes.value.data;
        setTenants(raw?.data || []);
      }
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============ PLAN EDITING ============

  const startEditPlan = (plan: PlanConfig) => {
    setEditingPlanId(plan.id);
    // Exclude timestamp fields and id/plan from edit form
    const { id, plan: planType, createdAt, updatedAt, ...editableFields } = plan as any;
    setEditForm(editableFields);
  };

  const cancelEditPlan = () => {
    setEditingPlanId(null);
    setEditForm({});
  };

  const savePlan = async () => {
    if (!editingPlanId) return;
    
    // Validasi data sebelum kirim
    if (!editForm.name || editForm.name.trim() === "") {
      toast.error("Nama paket wajib diisi");
      return;
    }
    
    if (editForm.monthlyPrice !== undefined && editForm.monthlyPrice < 0) {
      toast.error("Harga bulanan tidak boleh negatif");
      return;
    }
    
    if (editForm.postsLimit !== undefined && editForm.postsLimit < 1) {
      toast.error("Limit posting minimal 1");
      return;
    }
    
    setSaving(true);
    try {
      // Clean data - remove undefined values and non-editable fields
      const { id, plan, createdAt, updatedAt, ...dataToSend } = editForm as any;
      const cleanData = Object.fromEntries(
        Object.entries(dataToSend).filter(([_, value]) => value !== undefined)
      );
      
      console.log("Sending update data:", cleanData);
      
      await adminApi.updateSubscriptionPlan(editingPlanId, cleanData);
      toast.success("Paket berhasil diperbarui");
      setEditingPlanId(null);
      setEditForm({});
      fetchData();
    } catch (error: any) {
      console.error("Update plan error:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Gagal menyimpan";
      if (Array.isArray(errorMessage)) {
        toast.error(errorMessage[0]);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = (key: string) => {
    setEditForm((prev) => ({ ...prev, [key]: !prev[key as keyof PlanConfig] }));
  };

  const toggleCreateFeature = (key: string) => {
    setCreateForm((prev) => ({ ...prev, [key]: !prev[key as keyof PlanConfig] }));
  };

  // ============ CREATE PLAN ============

  const handleCreatePlan = async () => {
    if (!createForm.name || !createForm.plan) {
      toast.error("Nama paket dan tipe plan wajib diisi");
      return;
    }
    
    if (createForm.monthlyPrice !== undefined && createForm.monthlyPrice < 0) {
      toast.error("Harga bulanan tidak boleh negatif");
      return;
    }
    
    if (createForm.postsLimit !== undefined && createForm.postsLimit < 1) {
      toast.error("Limit posting minimal 1");
      return;
    }
    
    setCreating(true);
    try {
      // Clean data - remove undefined values
      const cleanData = Object.fromEntries(
        Object.entries(createForm).filter(([_, value]) => value !== undefined)
      );
      
      console.log("Creating plan with data:", cleanData);
      
      await adminApi.createSubscriptionPlan(cleanData);
      toast.success("Paket baru berhasil dibuat");
      setShowCreateForm(false);
      setCreateForm({
        plan: "BASIC",
        name: "",
        description: "",
        monthlyPrice: 0,
        yearlyPrice: undefined,
        postsLimit: 10,
        maxImagesPerPost: 5,
        maxFileSize: 5,
        sortOrder: 0,
        isActive: true,
        canPublishToMarketplace: false,
        canVerifiedBadge: false,
        canFeaturedStore: false,
        canHighlightProducts: false,
        canPriorityListing: false,
        canAdvancedAnalytics: false,
        canBulkUpload: false,
        canExportData: false,
        canFlashSale: false,
        canCustomTheme: false,
        canRemoveBranding: false,
        features: [],
      });
      fetchData();
    } catch (error: any) {
      console.error("Create plan error:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Gagal membuat paket baru";
      if (Array.isArray(errorMessage)) {
        toast.error(errorMessage[0]);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setCreating(false);
    }
  };

  // ============ DELETE PLAN ============

  const handleDeletePlan = async (planId: string) => {
    setDeleting(true);
    try {
      await adminApi.deleteSubscriptionPlan(planId);
      toast.success("Paket berhasil dihapus");
      setDeletingPlanId(null);
      fetchData();
    } catch {
      toast.error("Gagal menghapus paket. Paket mungkin masih digunakan oleh tenant.");
    } finally {
      setDeleting(false);
    }
  };

  // ============ YEARLY SAVINGS CALC ============

  const calcYearlySavings = (monthly: number, yearly: number): number => {
    if (!monthly || !yearly) return 0;
    const fullYearly = monthly * 12;
    if (fullYearly <= 0) return 0;
    return Math.round(((fullYearly - yearly) / fullYearly) * 100);
  };

  // ============ TENANT PLAN CHANGE ============

  const handleChangeTenantPlan = async (tenantId: string) => {
    try {
      await adminApi.changeTenantSubscription(tenantId, editTenantPlan);
      toast.success("Plan tenant berhasil diubah");
      setEditTenantId(null);
      fetchData();
    } catch {
      toast.error("Gagal mengubah plan");
    }
  };

  // ============ CHECK EXPIRED ============

  const handleCheckExpired = async () => {
    setCheckingExpired(true);
    try {
      const { data } = await adminApi.checkExpiredSubscriptions();
      const count = data?.expired || 0;
      if (count > 0) {
        toast.success(`${count} subscription expired telah di-revert ke FREE`);
        fetchData();
      } else {
        toast.success("Tidak ada subscription yang expired");
      }
    } catch {
      toast.error("Gagal check expired");
    } finally {
      setCheckingExpired(false);
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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kelola Subscription</h1>
          <p className="text-sm text-gray-500">
            Atur paket langganan, harga, dan fitur per tier
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCheckExpired}
          isLoading={checkingExpired}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Cek Expired
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 rounded-lg bg-gray-100 p-1 w-fit">
        <button
          onClick={() => setTab("plans")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "plans"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Settings className="h-4 w-4 inline mr-1.5" />
          Setting Paket
        </button>
        <button
          onClick={() => setTab("tenants")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "tenants"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Users className="h-4 w-4 inline mr-1.5" />
          Daftar Tenant ({tenants.length})
        </button>
      </div>

      {/* ============ TAB: SETTING PAKET ============ */}
      {tab === "plans" && (
        <div className="space-y-4">
          {/* Tambah Paket Baru Button */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-600">
              {plans.length} paket tersedia
            </h2>
            <Button
              size="sm"
              onClick={() => setShowCreateForm(!showCreateForm)}
              variant={showCreateForm ? "outline" : "primary"}
            >
              <Plus className="h-4 w-4 mr-1" />
              {showCreateForm ? "Tutup Form" : "Tambah Paket Baru"}
            </Button>
          </div>

          {/* ============ CREATE PLAN FORM ============ */}
          {showCreateForm && (
            <div className="rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/30 overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-indigo-200">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                    <Plus className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Buat Paket Baru</h3>
                    <p className="text-xs text-gray-500">Isi detail paket langganan baru</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" onClick={handleCreatePlan} isLoading={creating}>
                    <Save className="h-3.5 w-3.5 mr-1" />
                    Buat Paket
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowCreateForm(false)}>
                    Batal
                  </Button>
                </div>
              </div>
              <div className="p-5 space-y-4 bg-white/50">
                {/* Plan Type + Basic Info */}
                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipe Plan</label>
                    <select
                      value={createForm.plan || "BASIC"}
                      onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      {["FREE", "BASIC", "PREMIUM", "PROFESSIONAL", "ENTERPRISE", "ULTIMATE"].map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nama Paket</label>
                    <input
                      type="text"
                      value={createForm.name || ""}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      placeholder="e.g. Paket Premium"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Harga / Bulan (Rp)</label>
                    <input
                      type="number"
                      value={createForm.monthlyPrice || 0}
                      onChange={(e) => setCreateForm({ ...createForm, monthlyPrice: Number(e.target.value) })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Harga / Tahun (Rp) <span className="text-gray-400 font-normal">opsional</span></label>
                    <input
                      type="number"
                      value={createForm.yearlyPrice ?? ""}
                      onChange={(e) => setCreateForm({ ...createForm, yearlyPrice: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="Kosongkan jika tidak ada"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Limit Posting</label>
                    <input
                      type="number"
                      value={createForm.postsLimit || 0}
                      onChange={(e) => setCreateForm({ ...createForm, postsLimit: Number(e.target.value) })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Max Gambar / Posting (display)</label>
                    <input
                      type="number"
                      min={1}
                      value={createForm.maxImagesPerPost || 0}
                      onChange={(e) => setCreateForm({ ...createForm, maxImagesPerPost: Number(e.target.value) })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Max File Size (display)</label>
                    <input
                      type="number"
                      min={1}
                      value={createForm.maxFileSize || 0}
                      onChange={(e) => setCreateForm({ ...createForm, maxFileSize: Number(e.target.value) })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Sort Order</label>
                    <input
                      type="number"
                      value={createForm.sortOrder || 0}
                      onChange={(e) => setCreateForm({ ...createForm, sortOrder: Number(e.target.value) })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi</label>
                    <textarea
                      rows={2}
                      value={createForm.description || ""}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Badge Label</label>
                      <input
                        type="text"
                        value={createForm.badge || ""}
                        onChange={(e) => setCreateForm({ ...createForm, badge: e.target.value || undefined })}
                        placeholder="Populer, Best Value..."
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createForm.isActive ?? true}
                        onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                      />
                      <span className="text-sm text-gray-700">Aktif (tampil di listing)</span>
                    </label>
                  </div>
                </div>

                {/* Feature Toggles */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Fitur aktif di sistem</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                      <label
                        key={key}
                        className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                          createForm[key as keyof PlanConfig]
                            ? "border-indigo-300 bg-indigo-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!createForm[key as keyof PlanConfig]}
                          onChange={() => toggleCreateFeature(key)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600"
                        />
                        <span className="text-xs text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Features Display Strings */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Fitur display tambahan (opsional, tidak dipakai seller pricing)
                  </label>
                  <div className="space-y-2">
                    {(createForm.features || []).map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={feat}
                          onChange={(e) => {
                            const updated = [...(createForm.features || [])];
                            updated[idx] = e.target.value;
                            setCreateForm({ ...createForm, features: updated });
                          }}
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          placeholder="e.g. 10 Produk, Analytics Dasar..."
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (createForm.features || []).filter((_, i) => i !== idx);
                            setCreateForm({ ...createForm, features: updated });
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setCreateForm({ ...createForm, features: [...(createForm.features || []), ""] });
                      }}
                      className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Tambah fitur display
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {plans.length === 0 && !showCreateForm ? (
            <EmptyState
              icon={<Layers className="h-12 w-12 text-gray-300" />}
              title="Belum ada paket"
              description="Paket akan otomatis dibuat saat server pertama kali dijalankan"
            />
          ) : (
            plans.map((plan) => {
              const isEditing = editingPlanId === plan.id;
              const Icon = PLAN_ICONS[plan.plan] || Zap;

              return (
                <div
                  key={plan.id}
                  className={`rounded-xl border bg-white overflow-hidden transition-shadow ${
                    isEditing ? "border-indigo-300 shadow-lg" : "border-gray-200 hover:shadow-sm"
                  }`}
                >
                  {/* Plan Header */}
                  <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        plan.plan === "FREE" ? "bg-gray-100" : "bg-indigo-100"
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          plan.plan === "FREE" ? "text-gray-500" : "text-indigo-600"
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900">{plan.name}</h3>
                          <Badge variant={plan.isActive ? "success" : "danger"}>
                            {plan.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                          {plan.badge && (
                            <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">
                              {plan.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{plan.plan}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {plan.monthlyPrice === 0 ? "Gratis" : formatPrice(plan.monthlyPrice)}
                        </p>
                        <p className="text-xs text-gray-500">/ bulan</p>
                        {plan.yearlyPrice != null && plan.yearlyPrice > 0 && (
                          <div className="mt-0.5">
                            <p className="text-xs font-medium text-indigo-600">
                              {formatPrice(plan.yearlyPrice)} / tahun
                            </p>
                            {plan.monthlyPrice > 0 && (
                              <p className="text-[10px] text-emerald-600 font-medium">
                                hemat {calcYearlySavings(plan.monthlyPrice, plan.yearlyPrice)}%
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      {!isEditing ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => startEditPlan(plan)}>
                            Edit
                          </Button>
                          {plan.plan !== "FREE" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => setDeletingPlanId(plan.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button size="sm" onClick={savePlan} isLoading={saving}>
                            <Save className="h-3.5 w-3.5 mr-1" />
                            Simpan
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEditPlan}>
                            Batal
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Delete Confirmation Dialog */}
                    {deletingPlanId === plan.id && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                        <div className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4 w-full">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                              <AlertTriangle className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900">Hapus Paket</h3>
                              <p className="text-sm text-gray-500">Tindakan ini tidak bisa dibatalkan</p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 mb-6">
                            Yakin ingin menghapus paket <strong>{plan.name}</strong>? Paket yang masih digunakan oleh tenant tidak bisa dihapus.
                          </p>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeletingPlanId(null)}
                              disabled={deleting}
                            >
                              Batal
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleDeletePlan(plan.id)}
                              isLoading={deleting}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Hapus Paket
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Plan Details / Edit Form */}
                  {isEditing ? (
                    <div className="p-5 space-y-4 bg-gray-50">
                      {/* Basic Info */}
                      <div className="grid gap-4 sm:grid-cols-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Nama Paket</label>
                          <input
                            type="text"
                            value={editForm.name || ""}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Harga / Bulan (Rp)</label>
                          <input
                            type="number"
                            value={editForm.monthlyPrice || 0}
                            onChange={(e) => setEditForm({ ...editForm, monthlyPrice: Number(e.target.value) })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Harga / Tahun (Rp) <span className="text-gray-400 font-normal">opsional</span></label>
                          <input
                            type="number"
                            value={editForm.yearlyPrice ?? ""}
                            onChange={(e) => setEditForm({ ...editForm, yearlyPrice: e.target.value ? Number(e.target.value) : undefined })}
                            placeholder="Kosongkan jika tidak ada"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Limit Posting</label>
                          <input
                            type="number"
                            value={editForm.postsLimit || 0}
                            onChange={(e) => setEditForm({ ...editForm, postsLimit: Number(e.target.value) })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi</label>
                          <textarea
                            rows={2}
                            value={editForm.description || ""}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                          />
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Badge Label</label>
                            <input
                              type="text"
                              value={editForm.badge || ""}
                              onChange={(e) => setEditForm({ ...editForm, badge: e.target.value || undefined })}
                              placeholder="Populer, Best Value..."
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editForm.isActive ?? true}
                              onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                            />
                            <span className="text-sm text-gray-700">Aktif (tampil di listing)</span>
                          </label>
                        </div>
                      </div>

                      {/* Limits */}
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Max Gambar / Posting (display)</label>
                          <input
                            type="number"
                            min={1}
                            value={editForm.maxImagesPerPost || 0}
                            onChange={(e) => setEditForm({ ...editForm, maxImagesPerPost: Number(e.target.value) })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Max File Size (display)</label>
                          <input
                            type="number"
                            min={1}
                            value={editForm.maxFileSize || 0}
                            onChange={(e) => setEditForm({ ...editForm, maxFileSize: Number(e.target.value) })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Feature Toggles */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">Fitur aktif di sistem</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                          {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                            <label
                              key={key}
                              className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                                editForm[key as keyof PlanConfig]
                                  ? "border-indigo-300 bg-indigo-50"
                                  : "border-gray-200 bg-white hover:border-gray-300"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={!!editForm[key as keyof PlanConfig]}
                                onChange={() => toggleFeature(key)}
                                className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600"
                              />
                              <span className="text-xs text-gray-700">{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Features Display Strings */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">
                          Fitur display tambahan (opsional, tidak dipakai seller pricing)
                        </label>
                        <div className="space-y-2">
                          {(editForm.features || []).map((feat, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={feat}
                                onChange={(e) => {
                                  const updated = [...(editForm.features || [])];
                                  updated[idx] = e.target.value;
                                  setEditForm({ ...editForm, features: updated });
                                }}
                                className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                placeholder="e.g. 10 Produk, Analytics Dasar..."
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (editForm.features || []).filter((_, i) => i !== idx);
                                  setEditForm({ ...editForm, features: updated });
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setEditForm({ ...editForm, features: [...(editForm.features || []), ""] });
                            }}
                            className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                            Tambah fitur display
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5">
                      {/* Billing Period Display */}
                      <div className="flex flex-wrap items-center gap-3 text-xs mb-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-gray-700 font-medium">
                          {plan.monthlyPrice === 0 ? "Gratis" : `${formatPrice(plan.monthlyPrice)} / bulan`}
                        </span>
                        {plan.yearlyPrice != null && plan.yearlyPrice > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700 font-medium">
                            {formatPrice(plan.yearlyPrice)} / tahun
                            {plan.monthlyPrice > 0 && (
                              <span className="text-emerald-600 ml-1">
                                (hemat {calcYearlySavings(plan.monthlyPrice, plan.yearlyPrice)}%)
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs mb-2">
                        <span className="text-gray-500">
                          Limit: <strong className="text-gray-900">{plan.postsLimit >= 999999 ? "Unlimited" : plan.postsLimit} posting</strong>
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-500">
                          Gambar display: <strong className="text-gray-900">{plan.maxImagesPerPost}/post</strong>
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-500">
                          File display: <strong className="text-gray-900">{plan.maxFileSize} MB</strong>
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        {plan.monthlyPrice > 0 &&
                          MEMBER_RULE_LABELS.map((label) => (
                            <span key={label} className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                              <Check className="h-2.5 w-2.5" />
                              {label}
                            </span>
                          ))}
                        {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                          plan[key as keyof PlanConfig] ? (
                            <span key={key} className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                              <Check className="h-2.5 w-2.5" />
                              {label}
                            </span>
                          ) : null
                        ))}
                        {plan.monthlyPrice === 0 && !Object.keys(FEATURE_LABELS).some((k) => plan[k as keyof PlanConfig]) && (
                          <span className="text-gray-400 italic">Fitur dasar saja</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ============ TAB: DAFTAR TENANT ============ */}
      {tab === "tenants" && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Tenant</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Plan</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Posting</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Expired</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      Belum ada tenant
                    </td>
                  </tr>
                ) : (
                  tenants.map((t) => {
                    const isExpired =
                      t.subscriptionExpiresAt &&
                      new Date(t.subscriptionExpiresAt) < new Date() &&
                      t.subscriptionPlan !== "FREE";

                    return (
                      <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{t.name}</p>
                          <p className="text-xs text-gray-500">{t.subdomain}</p>
                          {t.owner && (
                            <p className="text-xs text-gray-400">
                              {t.owner.firstName} {t.owner.lastName}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editTenantId === t.id ? (
                            <select
                              value={editTenantPlan}
                              onChange={(e) => setEditTenantPlan(e.target.value)}
                              className="rounded border border-gray-300 px-2 py-1 text-xs"
                            >
                              {plans.map((p) => (
                                <option key={p.plan} value={p.plan}>
                                  {p.name} ({p.plan})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Badge
                              variant={
                                t.subscriptionPlan === "FREE"
                                  ? "warning"
                                  : t.subscriptionPlan === "ENTERPRISE" || t.subscriptionPlan === "ULTIMATE"
                                    ? "success"
                                    : "info"
                              }
                            >
                              {t.subscriptionPlan}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-xs">
                          <span className="font-medium">{t.usedPosts}</span>
                          <span className="text-gray-400">/{t.postsLimit >= 999999 ? "∞" : t.postsLimit}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={t.isActive ? "success" : "danger"}>
                            {t.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center text-xs">
                          {t.subscriptionPlan === "FREE" ? (
                            <span className="text-gray-400">-</span>
                          ) : isExpired ? (
                            <span className="flex items-center justify-center gap-1 text-red-600 font-medium">
                              <AlertTriangle className="h-3 w-3" />
                              Expired
                            </span>
                          ) : t.subscriptionExpiresAt ? (
                            <span className="text-gray-600">{formatDate(t.subscriptionExpiresAt)}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editTenantId === t.id ? (
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => handleChangeTenantPlan(t.id)}
                                className="rounded bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                              >
                                Simpan
                              </button>
                              <button
                                onClick={() => setEditTenantId(null)}
                                className="rounded bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditTenantId(t.id);
                                setEditTenantPlan(t.subscriptionPlan);
                              }}
                              className="rounded bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                            >
                              Ubah Plan
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
