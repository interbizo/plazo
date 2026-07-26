"use client";

import {
  useEffect,
  useState,
  Suspense,
  useCallback,
  startTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { sellerApi } from "@/services/seller.service";
import { formatPrice, formatDate } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Globe,
  Store,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Product } from "@/types";

export default function SellerProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
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

  const fetchProducts = useCallback(
    async (p: number) => {
      setIsLoading(true);
      try {
        const { data } = await sellerApi.getProducts({
          page: p,
          limit: 10,
          search: search || undefined,
        });
        startTransition(() => {
          setProducts(data.data || []);
          setTotal(data.total || 0);
          setTotalPages(data.pages || 0);
        });
      } catch (err) {
        startTransition(() => {
          setProducts([]);
        });
        toast.error(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [search],
  );

  useEffect(() => {
    fetchProducts(page);
  }, [page, fetchProducts]);

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

  const getDisplayStock = (product: Product) => {
    if (!product.hasVariants || !Array.isArray(product.variants)) {
      return product.stock;
    }

    return product.variants
      .filter((variant) => variant.isActive !== false)
      .reduce((totalStock, variant) => totalStock + (variant.stock || 0), 0);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus produk "${name}"?`)) return;
    setDeleting(id);
    try {
      await sellerApi.deleteProduct(id);
      toast.success("Produk berhasil dihapus");
      fetchProducts(page);
    } catch {
      toast.error("Gagal menghapus produk");
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleMarketplace = async (product: Product) => {
    // Seller FREE dan Member sama-sama bisa publish ke marketplace
    const newValue = !product.publishToMarketplace;
    setTogglingMarketplace(product.id);
    try {
      await sellerApi.toggleProductMarketplace(product.id, newValue);
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, publishToMarketplace: newValue } : p,
        ),
      );
      toast.success(
        newValue
          ? "Produk ditampilkan di marketplace"
          : "Produk hanya tampil di toko",
      );
    } catch {
      toast.error("Gagal mengubah visibilitas marketplace");
    } finally {
      setTogglingMarketplace(null);
    }
  };

  const filteredProducts = products.filter((p: Product) => {
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "published" && p.isPublished) ||
      (statusFilter === "draft" && !p.isPublished);
    return matchStatus;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Produk Saya</h1>
          <p className="text-sm text-gray-500">
            {total} produk • Kuota: {usedPosts}/{postsLimit === 999999 ? "∞" : postsLimit}
          </p>
        </div>
        <Link
          href="/seller/dashboard/products/create"
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Tambah Produk
        </Link>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari produk..."
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
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon={<Package className="h-12 w-12 text-gray-300" />}
          title={
            search || statusFilter !== "all"
              ? "Tidak ada produk ditemukan"
              : "Belum ada produk"
          }
          description={
            search || statusFilter !== "all"
              ? "Coba ubah filter atau kata kunci pencarian."
              : "Mulai tambahkan produk pertama Anda."
          }
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-xl border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Produk
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Kategori
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">
                    Harga
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">
                    Stok
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">
                    Marketplace
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProducts.map((p: Product) => {
                  const displayStock = getDisplayStock(p);
                  return (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.thumbnail || p.images?.[0] ? (
                          <img
                            src={p.thumbnail || p.images?.[0]}
                            alt={p.name}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Package className="h-5 w-5 text-gray-300" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 truncate max-w-50">
                            {p.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatDate(p.createdAt)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.category?.name || "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatPrice(p.price)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-medium ${displayStock <= 0 ? "text-red-600" : displayStock < 5 ? "text-yellow-600" : "text-gray-900"}`}
                      >
                        {displayStock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={p.isPublished ? "success" : "default"}>
                        {p.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleMarketplace(p)}
                        disabled={togglingMarketplace === p.id || isFreeTier}
                        title={
                          p.publishToMarketplace
                            ? "Tampil di Marketplace"
                            : "Hanya di Toko"
                        }
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          p.publishToMarketplace
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {p.publishToMarketplace ? (
                          <Globe className="h-3.5 w-3.5" />
                        ) : (
                          <Store className="h-3.5 w-3.5" />
                        )}
                        {togglingMarketplace === p.id
                          ? "..."
                          : p.publishToMarketplace
                            ? "Marketplace"
                            : "Toko"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {p.slug && (
                          <Link
                            href={`/products/${p.slug}`}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            title="Lihat"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        )}
                        <Link
                          href={`/seller/dashboard/boost?itemId=${p.id}&type=product`}
                          className="rounded-lg p-1.5 text-orange-400 hover:bg-orange-50 hover:text-orange-600"
                          title="Boost"
                        >
                          <Zap className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/seller/dashboard/products/${p.id}/edit`}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          disabled={deleting === p.id}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredProducts.map((p: Product) => {
              const displayStock = getDisplayStock(p);
              return (
              <div
                key={p.id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  {p.thumbnail || p.images?.[0] ? (
                    <img
                      src={p.thumbnail || p.images?.[0]}
                      alt={p.name}
                      className="h-14 w-14 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <Package className="h-6 w-6 text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {p.name}
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatPrice(p.price)}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <span>Stok: {displayStock}</span>
                      <Badge variant={p.isPublished ? "success" : "default"}>
                        {p.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
                  <button
                    onClick={() => handleToggleMarketplace(p)}
                    disabled={togglingMarketplace === p.id}
                    title={
                      p.publishToMarketplace
                        ? "Tampil di Marketplace"
                        : "Hanya di Toko"
                    }
                    className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                      p.publishToMarketplace
                        ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        : "border-gray-300 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {p.publishToMarketplace ? (
                      <Globe className="h-3 w-3" />
                    ) : (
                      <Store className="h-3 w-3" />
                    )}
                    {togglingMarketplace === p.id
                      ? "..."
                      : p.publishToMarketplace
                        ? "Marketplace"
                        : "Toko"}
                  </button>
                  <Link
                    href={`/seller/dashboard/products/${p.id}/edit`}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-center text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    disabled={deleting === p.id}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Hapus
                  </button>
                </div>
              </div>
              );
            })}
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
