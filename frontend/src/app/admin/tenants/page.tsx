"use client";

import { useEffect, useState, Suspense, useCallback, startTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { adminApi } from "@/services/admin.service";
import { formatDate } from "@/lib/utils";
import { getSubdomainUrl } from "@/lib/domain";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Store,
  ShieldCheck,
  Star,
  Pause,
  Play,
  Pencil,
  Eye,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";

interface Tenant {
  id: string;
  name?: string;
  subdomain?: string;
  description?: string;
  subscriptionPlan?: string;
  isActive?: boolean;
  isVerified?: boolean;
  isFeatured?: boolean;
  isSeoActive?: boolean;
  seoActivatedAt?: string;
  createdAt?: string;
  owner?: { firstName?: string; lastName?: string; email?: string };
  _count?: { products?: number; orders?: number };
}

function TenantsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const page = Number(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";

  const fetchTenants = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await adminApi.getTenants({
        page,
        limit: 20,
        search: search || undefined,
      });
      setTenants(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.pages || 0);
    } catch {
      setTenants([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    startTransition(() => { fetchTenants(); });
  }, [fetchTenants]);

  const updateURL = (params: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v);
      else sp.delete(k);
    });
    router.push(`/admin/tenants?${sp.toString()}`, { scroll: false });
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      if (isActive) {
        await adminApi.suspendTenant(id);
        toast.success("Tenant disuspend");
      } else {
        await adminApi.activateTenant(id);
        toast.success("Tenant diaktifkan");
      }
      fetchTenants();
    } catch {
      toast.error("Gagal memproses");
    }
  };

  const handleVerify = async (id: string, isVerified: boolean) => {
    try {
      await adminApi.verifyStore(id, { isVerified: !isVerified });
      toast.success(isVerified ? "Verifikasi dicabut" : "Toko diverifikasi");
      fetchTenants();
    } catch {
      toast.error("Gagal memproses");
    }
  };

  const [searchInput, setSearchInput] = useState(search);

  // Edit modal
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  // Detail
  const [detailTenant, setDetailTenant] = useState<Tenant | null>(null);

  const handleEdit = (t: Tenant) => {
    setEditForm({ name: t.name || "", description: t.description || "" });
    setEditId(t.id);
  };

  const handleSaveEdit = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      await adminApi.updateTenant(editId, editForm);
      toast.success("Tenant diupdate");
      setEditId(null);
      fetchTenants();
    } catch {
      toast.error("Gagal update");
    } finally {
      setSaving(false);
    }
  };

  const viewDetail = async (id: string) => {
    try {
      const { data } = await adminApi.getTenantDetail(id);
      setDetailTenant(data);
    } catch {
      toast.error("Gagal memuat detail");
    }
  };

  const handleFeature = async (id: string, isFeatured: boolean) => {
    try {
      await adminApi.featureStore(id, { isFeatured: !isFeatured });
      toast.success(isFeatured ? "Dihapus dari featured" : "Ditambahkan ke featured");
      fetchTenants();
    } catch {
      toast.error("Gagal memproses");
    }
  };

  const handleToggleSeo = async (id: string, isSeoActive: boolean, isVerified: boolean) => {
    if (!isVerified && !isSeoActive) {
      toast.error("Toko harus diverifikasi terlebih dahulu sebelum mengaktifkan SEO");
      return;
    }

    try {
      await adminApi.updateTenantSeo(id, { isSeoActive: !isSeoActive });
      toast.success(isSeoActive ? "SEO dinonaktifkan" : "SEO diaktifkan");
      fetchTenants();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Gagal memproses");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Kelola Tenant</h1>
        <p className="text-sm text-gray-500">{total} tenant</p>
      </div>

      {/* Edit inline form */}
      {editId && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Edit Tenant</h3>
          <input
            type="text"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            placeholder="Nama Toko"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <textarea
            value={editForm.description}
            onChange={(e) =>
              setEditForm({ ...editForm, description: e.target.value })
            }
            placeholder="Deskripsi"
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Update"}
            </button>
            <button
              onClick={() => setEditId(null)}
              className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDetailTenant(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <button
              onClick={() => setDetailTenant(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 text-lg"
            >
              &times;
            </button>
            <h3 className="font-semibold text-gray-900 text-lg mb-3">
              {detailTenant.name}
            </h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-500">Subdomain:</span>{" "}
                {detailTenant.subdomain}
              </p>
              <p>
                <span className="text-gray-500">Deskripsi:</span>{" "}
                {detailTenant.description || "-"}
              </p>
              <p>
                <span className="text-gray-500">Plan:</span>{" "}
                {detailTenant.subscriptionPlan || "FREE"}
              </p>
              <p>
                <span className="text-gray-500">Status:</span>{" "}
                {detailTenant.isActive ? "Aktif" : "Suspend"}
              </p>
              <p>
                <span className="text-gray-500">Verified:</span>{" "}
                {detailTenant.isVerified ? "Ya" : "Tidak"}
              </p>
              <p>
                <span className="text-gray-500">Featured:</span>{" "}
                {detailTenant.isFeatured ? "Ya" : "Tidak"}
              </p>
              <p>
                <span className="text-gray-500">Owner:</span>{" "}
                {detailTenant.owner?.firstName} {detailTenant.owner?.lastName} (
                {detailTenant.owner?.email})
              </p>
              <p>
                <span className="text-gray-500">Dibuat:</span>{" "}
                {formatDate(detailTenant.createdAt)}
              </p>
              {detailTenant._count && (
                <p>
                  <span className="text-gray-500">Produk:</span>{" "}
                  {detailTenant._count.products || 0} |{" "}
                  <span className="text-gray-500">Order:</span>{" "}
                  {detailTenant._count.orders || 0}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateURL({ search: searchInput, page: "1" });
        }}
        className="mb-6"
      >
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Cari nama atau subdomain..."
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
      </form>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : tenants.length === 0 ? (
        <EmptyState
          icon={<Store className="h-12 w-12 text-gray-300" />}
          title="Tidak ada tenant"
          description=""
        />
      ) : (
        <>
          <div className="space-y-3">
            {tenants.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {t.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {t.subdomain ? getSubdomainUrl(t.subdomain) : '-'} • {formatDate(t.createdAt)}
                    </p>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <Badge variant={t.isActive ? "success" : "danger"}>
                        {t.isActive ? "Aktif" : "Suspend"}
                      </Badge>
                      <Badge variant="info">
                        {t.subscriptionPlan || "FREE"}
                      </Badge>
                      {t.isVerified && (
                        <Badge variant="success">Verified</Badge>
                      )}
                      {t.isFeatured && (
                        <Badge variant="warning">Featured</Badge>
                      )}
                      {t.isSeoActive && (
                        <Badge 
                          variant="success"
                          className="bg-green-100 text-green-700 ring-1 ring-green-200"
                        >
                          <Search className="h-3 w-3 mr-1" />
                          SEO Active
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      Owner: {t.owner?.firstName} {t.owner?.lastName} (
                      {t.owner?.email})
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => viewDetail(t.id)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                      title="Detail"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(t)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleToggleSeo(t.id, !!t.isSeoActive, !!t.isVerified)}
                      className={`rounded-lg p-1.5 ${
                        t.isSeoActive
                          ? "text-green-500 hover:bg-green-50"
                          : t.isVerified
                            ? "text-gray-400 hover:bg-green-50 hover:text-green-500"
                            : "text-gray-300 cursor-not-allowed"
                      }`}
                      title={
                        !t.isVerified
                          ? "Verifikasi toko terlebih dahulu"
                          : t.isSeoActive
                            ? "Nonaktifkan SEO"
                            : "Aktifkan SEO"
                      }
                      disabled={!t.isVerified && !t.isSeoActive}
                    >
                      <Search className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleFeature(t.id, !!t.isFeatured)}
                      className={`rounded-lg p-1.5 ${t.isFeatured ? "text-yellow-500 hover:bg-yellow-50" : "text-gray-400 hover:bg-yellow-50 hover:text-yellow-500"}`}
                      title={t.isFeatured ? "Un-feature" : "Feature"}
                    >
                      <Star className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleVerify(t.id, !!t.isVerified)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600"
                      title={t.isVerified ? "Cabut verifikasi" : "Verifikasi"}
                    >
                      <ShieldCheck className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleToggle(t.id, !!t.isActive)}
                      className={`rounded-lg p-1.5 ${
                        t.isActive
                          ? "text-red-400 hover:bg-red-50 hover:text-red-600"
                          : "text-green-400 hover:bg-green-50 hover:text-green-600"
                      }`}
                      title={t.isActive ? "Suspend" : "Aktifkan"}
                    >
                      {t.isActive ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
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

export default function AdminTenantsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      }
    >
      <TenantsContent />
    </Suspense>
  );
}
