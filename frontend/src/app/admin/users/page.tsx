"use client";

import {
  useEffect,
  useState,
  Suspense,
  useCallback,
  startTransition,
  useRef,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { adminApi } from "@/services/admin.service";
import { formatDate } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuthStore } from "@/stores/auth.store";
import { tokenStorage } from "@/lib/api";
import {
  Users,
  Ban,
  CheckCircle,
  Plus,
  Pencil,
  Trash2,
  X as XIcon,
  Eye,
  ShieldCheck,
  Store,
  UserCheck,
  Crown,
  ChevronDown,
  MapPin,
  Home,
  Mail,
  Phone,
  MessageCircle,
  Calendar,
  Clock,
  Award,
  Briefcase,
  Link as LinkIcon,
  Globe,
  FileText,
  Star,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Shield,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Download,
} from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// Local interfaces
// ---------------------------------------------------------------------------

type UserRole = "BUYER" | "SELLER" | "ADMIN" | "SUPER_ADMIN";
type SubscriptionPlan =
  | "FREE"
  | "BASIC"
  | "PREMIUM"
  | "PROFESSIONAL"
  | "ENTERPRISE"
  | "ULTIMATE";
type SellerTier = "FREE" | "MEMBER";

interface UserItem {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  avatar?: string;
  bio?: string;
  phone?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  whatsappNumber?: string;
  createdAt?: string;
  updatedAt?: string;
  lastActiveAt?: string;
  lastLoginAt?: string;
  
  // Email & KYC Verification
  isEmailVerified?: boolean;
  kycStatus?: string;
  kycVerifiedAt?: string;
  
  // 2FA
  twoFactorEnabled?: boolean;
  twoFactorVerified?: boolean;
  
  // Seller Profile
  sellerProfile?: {
    id?: string;
    bio?: string;
    skills?: string[];
    certifications?: string;
    portfolio?: string;
    portfolioFiles?: string[];
    cvUrl?: string;
    cvFileName?: string;
    website?: string;
    linkedin?: string;
    github?: string;
    totalEarnings?: number;
    totalOrders?: number;
    totalReviews?: number;
    averageRating?: number;
    level?: string;
    levelUpdatedAt?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  
  // Tenant (Store)
  tenant?: {
    id?: string;
    name?: string;
    subdomain?: string;
    description?: string;
    tagline?: string;
    logo?: string;
    banner?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactWhatsapp?: string;
    address?: string;
    city?: string;
    subscriptionPlan?: SubscriptionPlan;
    sellerTier?: SellerTier;
    postsLimit?: number;
    usedPosts?: number;
    subscriptionExpiresAt?: string;
    isActive?: boolean;
    isVerified?: boolean;
    verifiedAt?: string;
    isFeatured?: boolean;
    createdAt?: string;
  };
  
  // Affiliate Profile
  affiliateProfile?: {
    id?: string;
    referralCode?: string;
    totalReferrals?: number;
    totalEarnings?: number;
    createdAt?: string;
  };
}

interface RoleStats {
  BUYER: number;
  SELLER: number;
  ADMIN: number;
  SUPER_ADMIN: number;
  total: number;
}

interface SubscriptionStats {
  FREE: number;
  BASIC: number;
  PREMIUM: number;
  PROFESSIONAL: number;
  ENTERPRISE: number;
  ULTIMATE: number;
  sellerTiers?: {
    FREE: number;
    MEMBER: number;
  };
}

interface RoleChangeTarget {
  userId: string;
  currentRole: string;
  userName: string;
}

// ---------------------------------------------------------------------------
// Role badge helpers
// ---------------------------------------------------------------------------

const ROLE_BADGE_STYLES: Record<string, string> = {
  SUPER_ADMIN: "bg-rose-100 text-rose-700 border border-rose-200",
  ADMIN: "bg-purple-100 text-purple-700 border border-purple-200",
  SELLER: "bg-blue-100 text-blue-700 border border-blue-200",
  BUYER: "bg-green-100 text-green-700 border border-green-200",
};

const PLAN_BADGE_STYLES: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-600",
  BASIC: "bg-sky-100 text-sky-700",
  PREMIUM: "bg-fuchsia-100 text-fuchsia-700",
  PROFESSIONAL: "bg-amber-100 text-amber-700",
  ENTERPRISE: "bg-violet-100 text-violet-700",
  ULTIMATE: "bg-rose-100 text-rose-700",
};

const TIER_BADGE_STYLES: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-500",
  MEMBER: "bg-emerald-100 text-emerald-700",
};

function RoleBadge({ role, className }: { role: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE_STYLES[role] || "bg-gray-100 text-gray-700"} ${className || ""}`}
    >
      {role === "SUPER_ADMIN" ? "Super Admin" : role}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Stats cards component
// ---------------------------------------------------------------------------

function StatsCards({
  roleStats,
  subscriptionStats,
  isLoading,
}: {
  roleStats: RoleStats | null;
  subscriptionStats: SubscriptionStats | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse"
          >
            <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
            <div className="h-7 w-12 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!roleStats) return null;

  const sellerFree = subscriptionStats?.sellerTiers?.FREE ?? 0;
  const sellerMember = subscriptionStats?.sellerTiers?.MEMBER ?? 0;

  const cards = [
    {
      label: "Total Users",
      value: roleStats.total,
      icon: Users,
      color: "text-gray-600 bg-gray-100",
    },
    {
      label: "Buyers",
      value: roleStats.BUYER,
      icon: UserCheck,
      color: "text-green-600 bg-green-100",
    },
    {
      label: "Sellers",
      value: roleStats.SELLER,
      icon: Store,
      color: "text-blue-600 bg-blue-100",
      sub: `Free: ${sellerFree} · Member: ${sellerMember}`,
    },
    {
      label: "Admins",
      value: (roleStats.ADMIN || 0) + (roleStats.SUPER_ADMIN || 0),
      icon: ShieldCheck,
      color: "text-purple-600 bg-purple-100",
      sub: roleStats.SUPER_ADMIN
        ? `Super: ${roleStats.SUPER_ADMIN}`
        : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={`rounded-lg p-1.5 ${card.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-gray-500">
                {card.label}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            {card.sub && (
              <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Role change dropdown component
// ---------------------------------------------------------------------------

function RoleChangeDropdown({
  target,
  onClose,
  onSuccess,
}: {
  target: RoleChangeTarget;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedRole, setSelectedRole] = useState<UserRole | "">("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const availableRoles: UserRole[] = ["BUYER", "SELLER", "ADMIN"];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!selectedRole || selectedRole === target.currentRole) return;
    setSaving(true);
    try {
      await adminApi.changeUserRole(
        target.userId,
        selectedRole,
        reason || undefined,
      );
      toast.success(
        `Role ${target.userName} berhasil diubah ke ${selectedRole}`,
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } };
      toast.error(errObj?.response?.data?.message || "Gagal mengubah role");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 mt-1 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-xl"
    >
      <p className="text-xs font-semibold text-gray-700 mb-2">
        Ubah Role: {target.userName}
      </p>
      <div className="space-y-2">
        {availableRoles.map((r) => (
          <button
            key={r}
            onClick={() => setSelectedRole(r)}
            disabled={r === target.currentRole}
            className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
              r === target.currentRole
                ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                : selectedRole === r
                  ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                  : "hover:bg-gray-50 text-gray-700"
            }`}
          >
            <RoleBadge role={r} />
            {r === target.currentRole && (
              <span className="text-xs text-gray-400 ml-auto">(current)</span>
            )}
          </button>
        ))}
      </div>
      {selectedRole && selectedRole !== target.currentRole && (
        <div className="mt-2">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Alasan perubahan (opsional)"
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs outline-none focus:border-indigo-500"
          />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={handleSubmit} isLoading={saving}>
              Simpan
            </Button>
            <Button size="sm" variant="outline" onClick={onClose}>
              Batal
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Seller info badges
// ---------------------------------------------------------------------------

function SellerInfoBadges({ tenant }: { tenant?: UserItem["tenant"] }) {
  if (!tenant) return null;

  const plan = tenant.subscriptionPlan;
  const tier = tenant.sellerTier;

  return (
    <span className="inline-flex items-center gap-1 ml-1">
      {plan && (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${PLAN_BADGE_STYLES[plan] || "bg-gray-100 text-gray-600"}`}
        >
          {plan}
        </span>
      )}
      {tier && (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${TIER_BADGE_STYLES[tier] || "bg-gray-100 text-gray-500"}`}
        >
          {tier === "MEMBER" ? (
            <>
              <Crown className="h-3 w-3 mr-0.5" />
              Member
            </>
          ) : (
            "Free"
          )}
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main content
// ---------------------------------------------------------------------------

function UsersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Stats
  const [roleStats, setRoleStats] = useState<RoleStats | null>(null);
  const [subscriptionStats, setSubscriptionStats] =
    useState<SubscriptionStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Role change
  const [roleChangeTarget, setRoleChangeTarget] =
    useState<RoleChangeTarget | null>(null);

  const page = Number(searchParams.get("page") || "1");
  const role = searchParams.get("role") || "";
  const search = searchParams.get("search") || "";

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await adminApi.getUsers({
        page,
        limit: 20,
        role: role || undefined,
        search: search || undefined,
      });
      setUsers(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.pages || 0);
    } catch {
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, role, search]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [roleRes, subRes] = await Promise.all([
        adminApi.getRoleStats(),
        adminApi.getSubscriptionPlanStats(),
      ]);
      setRoleStats(roleRes.data as RoleStats);
      setSubscriptionStats(subRes.data as SubscriptionStats);
    } catch {
      // Stats are non-critical, silently fail
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      fetchUsers();
    });
  }, [fetchUsers]);

  useEffect(() => {
    startTransition(() => {
      fetchStats();
    });
  }, [fetchStats]);

  const updateURL = (params: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v);
      else sp.delete(k);
    });
    router.push(`/admin/users?${sp.toString()}`, { scroll: false });
  };

  const handleBan = async (id: string, isActive: boolean) => {
    try {
      if (isActive) {
        await adminApi.banUser(id);
        toast.success("User dibanned");
      } else {
        await adminApi.unbanUser(id);
        toast.success("User di-unbanned");
      }
      fetchUsers();
      fetchStats();
    } catch {
      toast.error("Gagal memproses");
    }
  };

  const handleSuspend = async (id: string) => {
    const reason = prompt("Alasan suspend (wajib diisi):");
    if (!reason || !reason.trim()) {
      toast.error("Alasan suspend wajib diisi");
      return;
    }
    try {
      await api.post(`/api/account-appeal/admin/suspend/${id}`, { reason: reason.trim() });
      toast.success("User berhasil di-suspend. Grace period 30 hari dimulai.");
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Gagal suspend user");
    }
  };

  const [searchInput, setSearchInput] = useState(search);
  const { user: currentUser } = useAuthStore();
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  // Create / Edit modal
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "BUYER",
  });
  const [saving, setSaving] = useState(false);
  // Detail modal
  const [detailUser, setDetailUser] = useState<UserItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const resetForm = () => {
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "BUYER",
    });
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (u: UserItem) => {
    setForm({
      firstName: u.firstName || "",
      lastName: u.lastName || "",
      email: u.email || "",
      password: "",
      role: u.role || "BUYER",
    });
    setEditId(u.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.email.trim() || !form.firstName.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        const payload: Record<string, unknown> = {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          role: form.role,
        };
        if (form.password) payload.password = form.password;
        await adminApi.updateUser(editId, payload);
        toast.success("User diupdate");
      } else {
        if (!form.password) {
          toast.error("Password wajib diisi");
          setSaving(false);
          return;
        }
        await adminApi.createUser({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          role: form.role,
        });
        toast.success("User dibuat");
      }
      resetForm();
      fetchUsers();
      fetchStats();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } };
      toast.error(errObj?.response?.data?.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus user ini? Tindakan ini tidak bisa dibatalkan."))
      return;
    try {
      await adminApi.deleteUser(id);
      toast.success("User dihapus");
      fetchUsers();
      fetchStats();
    } catch {
      toast.error("Gagal menghapus");
    }
  };

  const viewDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const { data } = await adminApi.getUserDetail(id);
      setDetailUser(data);
    } catch {
      toast.error("Gagal memuat detail");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleRoleChangeSuccess = () => {
    fetchUsers();
    fetchStats();
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = tokenStorage.getAccessToken();
      
      if (!token) {
        toast.error('Token tidak ditemukan. Silakan login kembali.');
        setIsExporting(false);
        return;
      }
      
      const response = await fetch(`${API_URL}/api/admin/export/users?format=${format}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      a.download = `users-export-${timestamp}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Data berhasil diexport ke ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kelola Pengguna</h1>
          <p className="text-sm text-gray-500">{total} pengguna</p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <>
              {/* Export Button */}
              <div className="relative" ref={exportMenuRef}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <>
                      <Spinner className="h-4 w-4 mr-1" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-1" />
                      Export Data
                    </>
                  )}
                </Button>
                
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg z-10">
                    <div className="p-2">
                      <button
                        onClick={() => handleExport('csv')}
                        className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <FileText className="h-4 w-4 inline mr-2" />
                        Export as CSV
                      </button>
                      <button
                        onClick={() => handleExport('excel')}
                        className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <FileText className="h-4 w-4 inline mr-2" />
                        Export as Excel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Add User Button */}
              <Button
                size="sm"
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Tambah User
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards
        roleStats={roleStats}
        subscriptionStats={subscriptionStats}
        isLoading={statsLoading}
      />

      {/* Create/Edit Form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">
            {editId ? "Edit User" : "Buat User Baru"}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              placeholder="First Name"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              placeholder="Last Name"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={
                editId ? "Password (kosongkan jika tidak diubah)" : "Password"
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
          >
            <option value="BUYER">Buyer</option>
            <option value="SELLER">Seller</option>
            <option value="ADMIN">Admin</option>
            {isSuperAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
          </select>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} isLoading={saving}>
              {editId ? "Update" : "Simpan"}
            </Button>
            <Button size="sm" variant="outline" onClick={resetForm}>
              Batal
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDetailUser(null)}
          />
          <div className="relative z-10 w-full max-w-3xl max-h-[90vh] rounded-2xl bg-white shadow-xl overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Detail Pengguna</h2>
              <button
                onClick={() => setDetailUser(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Header - User Info */}
                  <div className="flex items-start gap-4 pb-6 border-b border-gray-200">
                    <Avatar
                      src={detailUser.avatar}
                      firstName={detailUser.firstName}
                      lastName={detailUser.lastName}
                      size="lg"
                    />
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">
                        {detailUser.firstName} {detailUser.lastName}
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                        <Mail className="h-3.5 w-3.5" />
                        {detailUser.email}
                        {detailUser.isEmailVerified && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" title="Email Terverifikasi" />
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <RoleBadge role={detailUser.role || "BUYER"} />
                        {detailUser.role === "SELLER" && (
                          <SellerInfoBadges tenant={detailUser.tenant} />
                        )}
                        <Badge variant={detailUser.isActive ? "success" : "danger"}>
                          {detailUser.isActive ? "Aktif" : "Banned"}
                        </Badge>
                        {detailUser.twoFactorEnabled && (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700">
                            <Shield className="h-3 w-3" />
                            2FA Aktif
                          </span>
                        )}
                      </div>
                      {detailUser.bio && (
                        <p className="text-sm text-gray-600 mt-2 italic">{detailUser.bio}</p>
                      )}
                    </div>
                  </div>

                  {/* Basic Info */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-indigo-600" />
                      Informasi Dasar
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-start gap-2">
                        <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <span className="text-gray-500 block text-xs">Telepon</span>
                          <span className="text-gray-900">{detailUser.phone || "-"}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MessageCircle className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <span className="text-gray-500 block text-xs">WhatsApp</span>
                          <span className="text-gray-900">{detailUser.whatsappNumber || "-"}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <span className="text-gray-500 block text-xs">Bergabung</span>
                          <span className="text-gray-900">{formatDate(detailUser.createdAt)}</span>
                        </div>
                      </div>
                      {detailUser.lastActiveAt && (
                        <div className="flex items-start gap-2">
                          <Clock className="h-4 w-4 text-green-500 mt-0.5" />
                          <div>
                            <span className="text-gray-500 block text-xs">Terakhir Online</span>
                            <span className="text-gray-900">{formatDate(detailUser.lastActiveAt)}</span>
                          </div>
                        </div>
                      )}
                      {detailUser.lastLoginAt && (
                        <div className="flex items-start gap-2">
                          <Clock className="h-4 w-4 text-blue-500 mt-0.5" />
                          <div>
                            <span className="text-gray-500 block text-xs">Login Terakhir</span>
                            <span className="text-gray-900">{formatDate(detailUser.lastLoginAt)}</span>
                          </div>
                        </div>
                      )}
                      {detailUser.updatedAt && (
                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                          <div>
                            <span className="text-gray-500 block text-xs">Update Terakhir</span>
                            <span className="text-gray-900">{formatDate(detailUser.updatedAt)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Verification Status */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-indigo-600" />
                      Status Verifikasi
                    </h4>
                    
                    {/* Verification Method Badge */}
                    {detailUser.verificationMethod && detailUser.verificationMethod !== 'NONE' && (
                      <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">
                          Diverifikasi via {detailUser.verificationMethod === 'EMAIL' ? 'Email' : 'WhatsApp OTP'}
                        </span>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        {detailUser.isEmailVerified ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-gray-700">
                          Email {detailUser.isEmailVerified ? "Terverifikasi" : "Belum Terverifikasi"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {detailUser.isPhoneVerified ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-gray-700">
                          WhatsApp {detailUser.isPhoneVerified ? "Terverifikasi" : "Belum Terverifikasi"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {detailUser.kycStatus === "APPROVED" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : detailUser.kycStatus === "PENDING" ? (
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                        ) : detailUser.kycStatus === "REJECTED" ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-gray-700">
                          KYC: {detailUser.kycStatus || "NOT_SUBMITTED"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {detailUser.isActive ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-gray-700">
                          Akun {detailUser.isActive ? "Aktif" : "Tidak Aktif"}
                        </span>
                      </div>
                      {(detailUser.emailVerifiedAt || detailUser.phoneVerifiedAt) && (
                        <div className="col-span-2 text-xs text-gray-500 space-y-1">
                          {detailUser.verificationMethod === 'EMAIL' && detailUser.emailVerifiedAt && (
                            <div>Diverifikasi via Email: {formatDate(detailUser.emailVerifiedAt)}</div>
                          )}
                          {detailUser.verificationMethod === 'WHATSAPP' && detailUser.phoneVerifiedAt && (
                            <div>Diverifikasi via WhatsApp: {formatDate(detailUser.phoneVerifiedAt)}</div>
                          )}
                        </div>
                      )}
                      {detailUser.kycVerifiedAt && (
                        <div className="col-span-2 text-xs text-gray-500">
                          KYC diverifikasi: {formatDate(detailUser.kycVerifiedAt)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Address Information */}
                  {(detailUser.address || detailUser.city || detailUser.province) && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-indigo-600" />
                        Alamat Lengkap
                      </h4>
                      {detailUser.address && (
                        <p className="text-sm text-gray-900 mb-2">{detailUser.address}</p>
                      )}
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        {detailUser.city && (
                          <div>
                            <span className="text-gray-500 block text-xs">Kota</span>
                            <span className="text-gray-900">{detailUser.city}</span>
                          </div>
                        )}
                        {detailUser.province && (
                          <div>
                            <span className="text-gray-500 block text-xs">Provinsi</span>
                            <span className="text-gray-900">{detailUser.province}</span>
                          </div>
                        )}
                        {detailUser.postalCode && (
                          <div>
                            <span className="text-gray-500 block text-xs">Kode Pos</span>
                            <span className="text-gray-900">{detailUser.postalCode}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Seller Profile */}
                  {detailUser.sellerProfile && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-indigo-600" />
                        Profil Seller
                      </h4>
                      <div className="space-y-3">

                        {/* Bio */}
                        {detailUser.sellerProfile.bio && (
                          <div>
                            <span className="text-xs text-gray-500 block mb-1">Bio</span>
                            <p className="text-sm text-gray-900">{detailUser.sellerProfile.bio}</p>
                          </div>
                        )}

                        {/* Skills */}
                        {detailUser.sellerProfile.skills && detailUser.sellerProfile.skills.length > 0 && (
                          <div>
                            <span className="text-xs text-gray-500 block mb-2">Keahlian</span>
                            <div className="flex flex-wrap gap-1.5">
                              {detailUser.sellerProfile.skills.map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Links */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {detailUser.sellerProfile.website && (
                            <a
                              href={detailUser.sellerProfile.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                            >
                              <Globe className="h-4 w-4" />
                              <span className="truncate">Website</span>
                            </a>
                          )}
                          {detailUser.sellerProfile.linkedin && (
                            <a
                              href={detailUser.sellerProfile.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span className="truncate">LinkedIn</span>
                            </a>
                          )}
                          {detailUser.sellerProfile.github && (
                            <a
                              href={detailUser.sellerProfile.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span className="truncate">GitHub</span>
                            </a>
                          )}
                          {detailUser.sellerProfile.cvUrl && (
                            <a
                              href={detailUser.sellerProfile.cvUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                            >
                              <FileText className="h-4 w-4" />
                              <span className="truncate">CV/Resume</span>
                            </a>
                          )}
                        </div>

                        {/* Certifications */}
                        {detailUser.sellerProfile.certifications && (
                          <div>
                            <span className="text-xs text-gray-500 block mb-1">Sertifikasi</span>
                            <p className="text-sm text-gray-900">{detailUser.sellerProfile.certifications}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tenant/Store Info */}
                  {detailUser.tenant && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Store className="h-4 w-4 text-indigo-600" />
                        Informasi Toko
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          {detailUser.tenant.logo && (
                            <img
                              src={detailUser.tenant.logo}
                              alt={detailUser.tenant.name}
                              className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h5 className="font-semibold text-gray-900">{detailUser.tenant.name}</h5>
                              {detailUser.tenant.isVerified && (
                                <CheckCircle2 className="h-4 w-4 text-blue-600" title="Toko Terverifikasi" />
                              )}
                              {detailUser.tenant.isFeatured && (
                                <Crown className="h-4 w-4 text-yellow-600" title="Toko Featured" />
                              )}
                            </div>
                            {detailUser.tenant.tagline && (
                              <p className="text-xs text-gray-500 italic">{detailUser.tenant.tagline}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              <LinkIcon className="h-3 w-3 inline mr-1" />
                              {detailUser.tenant.subdomain}
                            </p>
                          </div>
                        </div>

                        {detailUser.tenant.description && (
                          <p className="text-sm text-gray-700">{detailUser.tenant.description}</p>
                        )}

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {detailUser.tenant.subscriptionPlan && (
                            <div>
                              <span className="text-gray-500 block text-xs mb-1">Paket Langganan</span>
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${PLAN_BADGE_STYLES[detailUser.tenant.subscriptionPlan] || ""}`}
                              >
                                {detailUser.tenant.subscriptionPlan}
                              </span>
                            </div>
                          )}
                          {detailUser.tenant.sellerTier && (
                            <div>
                              <span className="text-gray-500 block text-xs mb-1">Tier Seller</span>
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TIER_BADGE_STYLES[detailUser.tenant.sellerTier] || ""}`}
                              >
                                {detailUser.tenant.sellerTier === "MEMBER" && <Crown className="h-3 w-3 mr-1" />}
                                {detailUser.tenant.sellerTier}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500 block text-xs">Limit Post</span>
                            <span className="text-gray-900">
                              {detailUser.tenant.usedPosts || 0} / {detailUser.tenant.postsLimit || 0}
                            </span>
                          </div>
                          {detailUser.tenant.subscriptionExpiresAt && (
                            <div>
                              <span className="text-gray-500 block text-xs">Berakhir</span>
                              <span className="text-gray-900">
                                {formatDate(detailUser.tenant.subscriptionExpiresAt)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Contact Info */}
                        {(detailUser.tenant.contactEmail || detailUser.tenant.contactPhone || detailUser.tenant.contactWhatsapp) && (
                          <div>
                            <span className="text-xs text-gray-500 block mb-2">Kontak Toko</span>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {detailUser.tenant.contactEmail && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                                  <span className="text-gray-900 truncate">{detailUser.tenant.contactEmail}</span>
                                </div>
                              )}
                              {detailUser.tenant.contactPhone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                                  <span className="text-gray-900">{detailUser.tenant.contactPhone}</span>
                                </div>
                              )}
                              {detailUser.tenant.contactWhatsapp && (
                                <div className="flex items-center gap-2">
                                  <MessageCircle className="h-3.5 w-3.5 text-gray-400" />
                                  <span className="text-gray-900">{detailUser.tenant.contactWhatsapp}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Store Address */}
                        {(detailUser.tenant.address || detailUser.tenant.city) && (
                          <div>
                            <span className="text-xs text-gray-500 block mb-1">Alamat Toko</span>
                            {detailUser.tenant.address && (
                              <p className="text-sm text-gray-900">{detailUser.tenant.address}</p>
                            )}
                            {detailUser.tenant.city && (
                              <p className="text-sm text-gray-600">{detailUser.tenant.city}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Affiliate Profile */}
                  {detailUser.affiliateProfile && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-indigo-600" />
                        Profil Afiliasi
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <span className="text-xs text-gray-500 block mb-1">Kode Referral</span>
                          <p className="text-sm font-mono font-bold text-gray-900">
                            {detailUser.affiliateProfile.referralCode || "-"}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <span className="text-xs text-gray-500 block mb-1">Total Referral</span>
                          <p className="text-lg font-bold text-gray-900">
                            {detailUser.affiliateProfile.totalReferrals || 0}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <span className="text-xs text-gray-500 block mb-1">Total Komisi</span>
                          <p className="text-sm font-bold text-gray-900">
                            Rp {(detailUser.affiliateProfile.totalEarnings || 0).toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateURL({ search: searchInput, page: "1" });
          }}
          className="flex-1 min-w-50"
        >
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari nama atau email..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
        </form>
        <select
          value={role}
          onChange={(e) => updateURL({ role: e.target.value, page: "1" })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
        >
          <option value="">Semua Role</option>
          <option value="BUYER">Buyer</option>
          <option value="SELLER">Seller</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12 text-gray-300" />}
          title="Tidak ada pengguna"
          description="Tidak ditemukan pengguna yang cocok."
        />
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      User
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Role
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Tanggal
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={u.avatar}
                            firstName={u.firstName}
                            lastName={u.lastName}
                            size="sm"
                          />
                          <div>
                            <p className="font-medium text-gray-900">
                              {u.firstName} {u.lastName}
                            </p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <div className="flex items-center gap-1 flex-wrap">
                            {isSuperAdmin && u.role !== "SUPER_ADMIN" ? (
                              <button
                                onClick={() =>
                                  setRoleChangeTarget(
                                    roleChangeTarget?.userId === u.id
                                      ? null
                                      : {
                                          userId: u.id,
                                          currentRole: u.role || "BUYER",
                                          userName:
                                            `${u.firstName || ""} ${u.lastName || ""}`.trim(),
                                        },
                                  )
                                }
                                className="inline-flex items-center gap-0.5 group cursor-pointer"
                                title="Klik untuk ubah role"
                              >
                                <RoleBadge
                                  role={u.role || "BUYER"}
                                  className="group-hover:ring-2 group-hover:ring-indigo-200 transition-shadow"
                                />
                                <ChevronDown className="h-3 w-3 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                              </button>
                            ) : (
                              <RoleBadge role={u.role || "BUYER"} />
                            )}
                            {u.role === "SELLER" && (
                              <SellerInfoBadges tenant={u.tenant} />
                            )}
                          </div>
                          {roleChangeTarget?.userId === u.id && (
                            <RoleChangeDropdown
                              target={roleChangeTarget}
                              onClose={() => setRoleChangeTarget(null)}
                              onSuccess={handleRoleChangeSuccess}
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={u.isActive ? "success" : "danger"}>
                          {u.isActive ? "Aktif" : "Banned"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => viewDetail(u.id)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                            title="Detail"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(u)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleBan(u.id, !!u.isActive)}
                            className={`rounded-lg p-1.5 ${
                              u.isActive
                                ? "text-red-400 hover:bg-red-50 hover:text-red-600"
                                : "text-green-400 hover:bg-green-50 hover:text-green-600"
                            }`}
                            title={u.isActive ? "Ban" : "Unban"}
                          >
                            {u.isActive ? (
                              <Ban className="h-4 w-4" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </button>
                          {isSuperAdmin && (
                            <button
                              onClick={() => handleSuspend(u.id)}
                              className="rounded-lg p-1.5 text-orange-400 hover:bg-orange-50 hover:text-orange-600"
                              title="Suspend (30 hari grace period)"
                            >
                              <ShieldAlert className="h-4 w-4" />
                            </button>
                          )}
                          {isSuperAdmin && (
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                              title="Hapus"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      }
    >
      <UsersContent />
    </Suspense>
  );
}
