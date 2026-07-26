"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/services/admin.service";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Wallet,
  Star,
  AlertTriangle,
  Save,
  X,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

// ============================================
// TYPES
// ============================================

interface PaymentAccount {
  id: string;
  type: "BANK_TRANSFER" | "E_WALLET";
  bankName?: string;
  accountNumber: string;
  accountName: string;
  walletType?: string;
  phoneNumber?: string;
  isActive: boolean;
  isPrimary: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AccountForm {
  type: "BANK_TRANSFER" | "E_WALLET";
  bankName: string;
  accountNumber: string;
  accountName: string;
  walletType: string;
  phoneNumber: string;
  isActive: boolean;
  isPrimary: boolean;
}

const EMPTY_FORM: AccountForm = {
  type: "BANK_TRANSFER",
  bankName: "",
  accountNumber: "",
  accountName: "",
  walletType: "",
  phoneNumber: "",
  isActive: true,
  isPrimary: false,
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function AdminPaymentAccountsPage() {
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountForm>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<PaymentAccount | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await adminApi.getPlatformPaymentAccounts();
      setAccounts(data?.data || []);
    } catch {
      toast.error("Gagal memuat data rekening");
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // ============ OPEN CREATE FORM ============

  const openCreateForm = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  // ============ OPEN EDIT FORM ============

  const openEditForm = (account: PaymentAccount) => {
    setEditingId(account.id);
    setForm({
      type: account.type,
      bankName: account.bankName || "",
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      walletType: account.walletType || "",
      phoneNumber: account.phoneNumber || "",
      isActive: account.isActive,
      isPrimary: account.isPrimary,
    });
    setShowForm(true);
  };

  // ============ CLOSE FORM ============

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  };

  // ============ SAVE ============

  const handleSave = async () => {
    // Validation
    if (!form.accountNumber.trim()) {
      toast.error("Nomor rekening wajib diisi");
      return;
    }
    if (!form.accountName.trim()) {
      toast.error("Nama pemilik rekening wajib diisi");
      return;
    }
    if (form.type === "BANK_TRANSFER" && !form.bankName.trim()) {
      toast.error("Nama bank wajib diisi");
      return;
    }
    if (form.type === "E_WALLET" && !form.walletType.trim()) {
      toast.error("Jenis e-wallet wajib diisi");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        type: form.type,
        bankName: form.type === "BANK_TRANSFER" ? form.bankName : form.walletType,
        accountNumber: form.accountNumber,
        accountName: form.accountName,
        walletType: form.type === "E_WALLET" ? form.walletType : undefined,
        phoneNumber: form.type === "E_WALLET" ? form.phoneNumber : undefined,
        isActive: form.isActive,
        isPrimary: form.isPrimary,
      };

      if (editingId) {
        await adminApi.updatePlatformPaymentAccount(editingId, payload as any);
        toast.success("Rekening berhasil diperbarui");
      } else {
        await adminApi.createPlatformPaymentAccount(payload as any);
        toast.success("Rekening berhasil ditambahkan");
      }

      closeForm();
      fetchAccounts();
    } catch {
      toast.error(editingId ? "Gagal memperbarui rekening" : "Gagal menambahkan rekening");
    } finally {
      setSaving(false);
    }
  };

  // ============ DELETE ============

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deletePlatformPaymentAccount(deleteTarget.id);
      toast.success("Rekening berhasil dihapus");
      setDeleteTarget(null);
      fetchAccounts();
    } catch {
      toast.error("Gagal menghapus rekening");
    } finally {
      setDeleting(false);
    }
  };

  // ============ RENDER ============

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Rekening Perusahaan
          </h1>
          <p className="text-sm text-gray-500">
            Kelola rekening bank dan e-wallet platform untuk menerima pembayaran
            langganan
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAccounts}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreateForm}>
            <Plus className="h-4 w-4 mr-1" />
            Tambah Rekening
          </Button>
        </div>
      </div>

      {/* ============ CREATE / EDIT FORM ============ */}
      {showForm && (
        <div className="mb-6 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/30 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-indigo-200">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                {editingId ? (
                  <Pencil className="h-5 w-5 text-indigo-600" />
                ) : (
                  <Plus className="h-5 w-5 text-indigo-600" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">
                  {editingId ? "Edit Rekening" : "Tambah Rekening Baru"}
                </h3>
                <p className="text-xs text-gray-500">
                  {editingId
                    ? "Perbarui informasi rekening"
                    : "Isi detail rekening bank atau e-wallet"}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" onClick={handleSave} isLoading={saving}>
                <Save className="h-3.5 w-3.5 mr-1" />
                {editingId ? "Simpan" : "Tambah"}
              </Button>
              <Button size="sm" variant="ghost" onClick={closeForm}>
                Batal
              </Button>
            </div>
          </div>

          <div className="p-5 space-y-4 bg-white/50">
            {/* Type Selection */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Tipe Rekening
                </label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      type: e.target.value as "BANK_TRANSFER" | "E_WALLET",
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="E_WALLET">E-Wallet</option>
                </select>
              </div>

              {form.type === "BANK_TRANSFER" ? (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Nama Bank <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.bankName}
                    onChange={(e) =>
                      setForm({ ...form, bankName: e.target.value })
                    }
                    placeholder="e.g. BCA, Mandiri, BNI, BRI"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Jenis E-Wallet <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.walletType}
                    onChange={(e) =>
                      setForm({ ...form, walletType: e.target.value })
                    }
                    placeholder="e.g. OVO, GOPAY, DANA, ShopeePay"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* Account Details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {form.type === "BANK_TRANSFER"
                    ? "Nomor Rekening"
                    : "Nomor Akun / HP"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.accountNumber}
                  onChange={(e) =>
                    setForm({ ...form, accountNumber: e.target.value })
                  }
                  placeholder={
                    form.type === "BANK_TRANSFER"
                      ? "e.g. 1234567890"
                      : "e.g. 081234567890"
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Atas Nama <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.accountName}
                  onChange={(e) =>
                    setForm({ ...form, accountName: e.target.value })
                  }
                  placeholder="Nama pemilik rekening"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* E-Wallet Phone Number */}
            {form.type === "E_WALLET" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Nomor HP (opsional)
                  </label>
                  <input
                    type="text"
                    value={form.phoneNumber}
                    onChange={(e) =>
                      setForm({ ...form, phoneNumber: e.target.value })
                    }
                    placeholder="e.g. 081234567890"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Checkboxes */}
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPrimary}
                  onChange={(e) =>
                    setForm({ ...form, isPrimary: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                />
                <span className="text-sm text-gray-700">
                  Rekening Utama (Primary)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                />
                <span className="text-sm text-gray-700">Aktif</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ============ ACCOUNTS LIST ============ */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : accounts.length === 0 && !showForm ? (
        <EmptyState
          icon={<Building2 className="h-12 w-12 text-gray-300" />}
          title="Belum ada rekening"
          description="Tambahkan rekening bank atau e-wallet untuk menerima pembayaran langganan dari seller"
          action={
            <Button size="sm" onClick={openCreateForm}>
              <Plus className="h-4 w-4 mr-1" />
              Tambah Rekening
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={`rounded-xl border bg-white overflow-hidden transition-shadow hover:shadow-sm ${
                account.isPrimary
                  ? "border-indigo-200 ring-1 ring-indigo-100"
                  : "border-gray-200"
              } ${!account.isActive ? "opacity-60" : ""}`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      account.type === "BANK_TRANSFER"
                        ? "bg-blue-100"
                        : "bg-purple-100"
                    }`}
                  >
                    {account.type === "BANK_TRANSFER" ? (
                      <Building2
                        className={`h-5 w-5 ${
                          account.type === "BANK_TRANSFER"
                            ? "text-blue-600"
                            : "text-purple-600"
                        }`}
                      />
                    ) : (
                      <Wallet className="h-5 w-5 text-purple-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 text-sm">
                        {account.type === "BANK_TRANSFER"
                          ? account.bankName || "Bank"
                          : account.walletType || "E-Wallet"}
                      </h3>
                      {account.isPrimary && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                          <Star className="h-2.5 w-2.5" />
                          Utama
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {account.type === "BANK_TRANSFER"
                        ? "Bank Transfer"
                        : "E-Wallet"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={account.isActive ? "success" : "danger"}>
                    {account.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-2">
                <div>
                  <p className="text-xs text-gray-500">
                    {account.type === "BANK_TRANSFER"
                      ? "Nomor Rekening"
                      : "Nomor Akun"}
                  </p>
                  <p className="font-mono text-sm font-medium text-gray-900">
                    {account.accountNumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Atas Nama</p>
                  <p className="text-sm font-medium text-gray-900">
                    {account.accountName}
                  </p>
                </div>
                {account.type === "E_WALLET" && account.phoneNumber && (
                  <div>
                    <p className="text-xs text-gray-500">Nomor HP</p>
                    <p className="text-sm text-gray-700">
                      {account.phoneNumber}
                    </p>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-end gap-1 px-4 py-3 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={() => openEditForm(account)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-white hover:text-indigo-600 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5 inline mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(account)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-white hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5 inline mr-1" />
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============ DELETE CONFIRMATION MODAL ============ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4 w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Hapus Rekening</h3>
                <p className="text-sm text-gray-500">
                  Tindakan ini tidak bisa dibatalkan
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm space-y-1">
              <p>
                <span className="text-gray-500">Tipe:</span>{" "}
                <strong>
                  {deleteTarget.type === "BANK_TRANSFER"
                    ? deleteTarget.bankName || "Bank Transfer"
                    : deleteTarget.walletType || "E-Wallet"}
                </strong>
              </p>
              <p>
                <span className="text-gray-500">Nomor:</span>{" "}
                <strong>{deleteTarget.accountNumber}</strong>
              </p>
              <p>
                <span className="text-gray-500">Atas Nama:</span>{" "}
                <strong>{deleteTarget.accountName}</strong>
              </p>
            </div>

            <p className="text-sm text-gray-700 mb-6">
              Yakin ingin menghapus rekening ini? Seller tidak akan bisa melihat
              rekening ini lagi untuk pembayaran.
            </p>

            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Batal
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={handleDelete}
                isLoading={deleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Hapus Rekening
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
