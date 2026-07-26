"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth.store";
import { adminApi } from "@/services/admin.service";
import { formatDate } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Edit, Eye, EyeOff, Plus, Trash2, Wrench } from "lucide-react";
import toast from "react-hot-toast";

interface ServiceItem {
  id: string;
  title?: string;
  name?: string;
  isPublished?: boolean;
  publishToMarketplace?: boolean;
  createdAt?: string;
  tenant?: { name?: string };
}

type ServiceTab = "all" | "internal";

function ServicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const page = Number(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const tab = (searchParams.get("tab") as ServiceTab) || "all";
  const [searchInput, setSearchInput] = useState(search);

  const activeTab: ServiceTab =
    tab === "internal" && isSuperAdmin ? "internal" : "all";

  const getErrorText = (error: unknown) => {
    if (
      typeof error === "object" &&
      error &&
      "response" in error &&
      typeof (error as { response?: unknown }).response === "object"
    ) {
      const response = (error as { response?: { data?: { message?: string } } })
        .response;
      if (response?.data?.message) return response.data.message;
    }
    return "Gagal memuat daftar layanan";
  };

  const fetchServices = useCallback(async () => {
    setIsLoading(true);
    try {
      const request =
        activeTab === "internal"
          ? adminApi.getInternalServices({
              page,
              limit: 20,
              search: search || undefined,
            })
          : adminApi.getServices({
              page,
              limit: 20,
              search: search || undefined,
            });
      const { data } = await request;
      setServices(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.pages || 0);
    } catch (error: unknown) {
      setServices([]);
      toast.error(getErrorText(error));
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, page, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchServices();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchServices]);

  const updateURL = (params: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value) sp.set(key, value);
      else sp.delete(key);
    });
    router.push(`/admin/services?${sp.toString()}`, { scroll: false });
  };

  const handleModerate = async (id: string, publish: boolean) => {
    try {
      await adminApi.moderateService(id, { isPublished: publish });
      toast.success("Status layanan berhasil diperbarui");
      void fetchServices();
    } catch {
      toast.error("Gagal memperbarui layanan");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus layanan ini?")) return;
    try {
      if (activeTab === "internal") {
        await adminApi.deleteInternalService(id);
      } else {
        await adminApi.deleteService(id);
      }
      toast.success("Layanan berhasil dihapus");
      void fetchServices();
    } catch {
      toast.error("Gagal menghapus layanan");
    }
  };

  const heading = useMemo(() => {
    if (activeTab === "internal") {
      return {
        title: "Jasa Internal",
        desc: "Kelola layanan resmi platform untuk website utama.",
      };
    }
    return {
      title: "Moderasi Layanan",
      desc: "Review, publish, unpublish, dan hapus layanan seller.",
    };
  }, [activeTab]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{heading.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {heading.desc} Total: {total} layanan.
          </p>
        </div>
        {isSuperAdmin && activeTab === "internal" && (
          <Link
            href="/admin/services/create"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Tambah Jasa Internal
          </Link>
        )}
      </div>

      {isSuperAdmin && (
        <div className="mb-5 flex gap-2">
          {[
            { value: "all" as const, label: "Semua Layanan" },
            { value: "internal" as const, label: "Jasa Internal" },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => updateURL({ tab: item.value, page: "1" })}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === item.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {item.label}
            </button>
          ))}
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
          placeholder={
            activeTab === "internal"
              ? "Cari jasa internal..."
              : "Cari layanan seller..."
          }
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
      </form>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : services.length === 0 ? (
        <EmptyState
          icon={<Wrench className="h-12 w-12 text-gray-300" />}
          title={
            activeTab === "internal"
              ? "Belum ada jasa internal"
              : "Tidak ada layanan"
          }
          description={
            activeTab === "internal"
              ? "Super admin dapat menambahkan layanan resmi platform untuk website utama."
              : "Belum ada layanan yang sesuai dengan filter."
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Layanan
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">
                      Marketplace
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Sumber
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {services.map((service) => (
                    <tr key={service.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-gray-900">
                          {service.title || service.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(service.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={service.isPublished ? "success" : "warning"}>
                          {service.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={
                            service.publishToMarketplace ? "success" : "info"
                          }
                        >
                          {service.publishToMarketplace ? "Utama" : "Nonaktif"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {service.tenant?.name || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {activeTab === "internal" && (
                            <Link
                              href={`/admin/services/${service.id}/edit`}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                              title="Edit jasa internal"
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                          )}
                          <button
                            onClick={() =>
                              handleModerate(service.id, !service.isPublished)
                            }
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            {service.isPublished ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(service.id)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
              onPageChange={(nextPage) => updateURL({ page: String(nextPage) })}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminServicesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      }
    >
      <ServicesContent />
    </Suspense>
  );
}
