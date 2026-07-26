"use client";

import { useCallback, useEffect, useState, startTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { sellerApi } from "@/services/seller.service";
import { formatPrice, formatDate } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/shared/pagination";
import {
  Briefcase,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Globe,
  Store,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Service } from "@/types";

export default function SellerServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [togglingMarketplace, setTogglingMarketplace] = useState<string | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "published" | "draft"
  >("all");
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>("FREE");
  const [usedPosts, setUsedPosts] = useState<number>(0);
  const [postsLimit, setPostsLimit] = useState<number>(10);

  const fetchServices = useCallback(
    async (p: number) => {
      setIsLoading(true);
      try {
        const { data } = await sellerApi.getServices({
          page: p,
          limit: 10,
          search: search || undefined,
        });
        startTransition(() => {
          // Ensure gallery is always an array
          const servicesWithGallery = (data.data || []).map(service => ({
            ...service,
            gallery: service.gallery || []
          }));
          setServices(servicesWithGallery);
          setTotal(data.total || 0);
          setTotalPages(data.pages || 0);
        });
      } catch (err) {
        startTransition(() => {
          setServices([]);
        });
        toast.error(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [search],
  );

  useEffect(() => {
    fetchServices(page);
  }, [page, fetchServices]);

  useEffect(() => {
    sellerApi
      .getStoreSettings()
      .then(({ data }) => {
        // data is already the store settings object (not wrapped in data.data)
        setSubscriptionPlan(data.subscriptionPlan || "FREE");
        setUsedPosts(data.usedPosts || 0);
        setPostsLimit(data.postsLimit || 10);
      })
      .catch(() => {
        // ignore - default to FREE
      });
  }, []);

  const isFreeTier = subscriptionPlan === "FREE";

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus layanan "${name}"?`)) return;
    setDeleting(id);
    try {
      await sellerApi.deleteService(id);
      toast.success("Layanan berhasil dihapus");
      fetchServices(page);
    } catch {
      toast.error("Gagal menghapus layanan");
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleMarketplace = async (service: Service) => {
    // Seller FREE dan Member sama-sama bisa publish ke marketplace
    const newValue = !service.publishToMarketplace;
    setTogglingMarketplace(service.id);
    try {
      await sellerApi.toggleServiceMarketplace(service.id, newValue);
      setServices((prev) =>
        prev.map((s) =>
          s.id === service.id ? { ...s, publishToMarketplace: newValue } : s,
        ),
      );
      toast.success(
        newValue
          ? "Layanan ditampilkan di marketplace"
          : "Layanan hanya tampil di toko",
      );
    } catch {
      toast.error("Gagal mengubah visibilitas marketplace");
    } finally {
      setTogglingMarketplace(null);
    }
  };

  const filteredServices = services.filter((s: Service) => {
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "published" && s.isPublished) ||
      (statusFilter === "draft" && !s.isPublished);
    return matchStatus;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Layanan Saya</h1>
          <p className="text-sm text-gray-500">
            {total} layanan • Kuota: {usedPosts}/{postsLimit === 999999 ? "∞" : postsLimit}
          </p>
        </div>
        <Link
          href="/seller/dashboard/services/create"
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Tambah Layanan
        </Link>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari layanan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "published", "draft"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "all"
                ? "Semua"
                : s === "published"
                  ? "Published"
                  : "Draft"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : filteredServices.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-12 w-12 text-gray-300" />}
          title={
            search || statusFilter !== "all"
              ? "Tidak ada layanan ditemukan"
              : "Belum ada layanan"
          }
          description={
            search || statusFilter !== "all"
              ? "Coba ubah filter atau kata kunci pencarian."
              : "Mulai tambahkan layanan pertama Anda."
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {filteredServices.map((s: Service) => (
              <div
                key={s.id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  {s.thumbnail ? (
                    <Image
                      src={s.thumbnail}
                      alt={s.name}
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <Briefcase className="h-6 w-6 text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {s.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {s.category?.name || "\u2014"} •{" "}
                          {formatDate(s.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleToggleMarketplace(s)}
                          disabled={togglingMarketplace === s.id || isFreeTier}
                          title={
                            s.publishToMarketplace
                              ? "Tampil di Marketplace"
                              : "Hanya di Toko"
                          }
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                            s.publishToMarketplace
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {s.publishToMarketplace ? (
                            <Globe className="h-3 w-3" />
                          ) : (
                            <Store className="h-3 w-3" />
                          )}
                          {togglingMarketplace === s.id
                            ? "..."
                            : s.publishToMarketplace
                              ? "Marketplace"
                              : "Toko"}
                        </button>
                        <Badge variant={s.isPublished ? "success" : "default"}>
                          {s.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </div>
                    </div>
                    <p className="mt-1 text-sm font-bold text-gray-900">
                      Mulai {formatPrice(s.basePrice)}
                    </p>
                    {s.tags?.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {s.tags.slice(0, 4).map((tag: string) => (
                          <span
                            key={tag}
                            className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
                  {s.slug && (
                    <Link
                      href={`/services/${s.slug}`}
                      className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      <Eye className="h-3 w-3" />
                      Lihat
                    </Link>
                  )}
                  <Link
                    href={`/seller/dashboard/boost?itemId=${s.id}&type=service`}
                    className="flex items-center gap-1 rounded-lg border border-orange-300 px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50"
                    title="Boost jasa ini"
                  >
                    <Zap className="h-3 w-3" />
                    Boost
                  </Link>
                  <Link
                    href={`/seller/dashboard/services/${s.id}/edit`}
                    className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    <Edit className="h-3 w-3" />
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(s.id, s.name)}
                    disabled={deleting === s.id}
                    className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  );
}
