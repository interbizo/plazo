"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth.store";
import { adminApi } from "@/services/admin.service";
import { formatDate, formatPrice } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Edit, Eye, EyeOff, Package, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface Product {
  id: string;
  name?: string;
  price?: number;
  isPublished?: boolean;
  publishToMarketplace?: boolean;
  createdAt?: string;
  tenant?: { name?: string; subdomain?: string };
}

type ProductTab = "all" | "internal";

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const page = Number(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const tab = (searchParams.get("tab") as ProductTab) || "all";
  const [searchInput, setSearchInput] = useState(search);

  const canManageInternal = isSuperAdmin;
  const activeTab: ProductTab =
    tab === "internal" && canManageInternal ? "internal" : "all";

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const request =
        activeTab === "internal"
          ? adminApi.getInternalProducts({
              page,
              limit: 20,
              search: search || undefined,
            })
          : adminApi.getProducts({
              page,
              limit: 20,
              search: search || undefined,
            });
      const { data } = await request;
      setProducts(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.pages || 0);
    } catch (error: unknown) {
      setProducts([]);
      toast.error(getErrorText(error));
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, page, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchProducts();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchProducts]);

  const updateURL = (params: Record<string, string>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    router.push(`/admin/products?${next.toString()}`, { scroll: false });
  };

  const handleModerate = async (id: string, publish: boolean) => {
    try {
      await adminApi.moderateProduct(id, { isPublished: publish });
      toast.success("Status produk berhasil diperbarui");
      fetchProducts();
    } catch {
      toast.error("Gagal memperbarui status produk");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus produk ini?")) return;
    try {
      if (activeTab === "internal") {
        await adminApi.deleteInternalProduct(id);
      } else {
        await adminApi.deleteProduct(id);
      }
      toast.success("Produk berhasil dihapus");
      fetchProducts();
    } catch {
      toast.error("Gagal menghapus produk");
    }
  };

  const heading = useMemo(() => {
    if (activeTab === "internal") {
      return {
        title: "Produk Internal",
        desc: "Kelola produk resmi milik platform untuk website utama.",
      };
    }
    return {
      title: "Moderasi Produk",
      desc: "Review, publish, unpublish, dan hapus listing seller.",
    };
  }, [activeTab]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{heading.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {heading.desc} Total: {total} produk.
          </p>
        </div>
        {canManageInternal && activeTab === "internal" && (
          <Link
            href="/admin/products/create"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Tambah Produk Internal
          </Link>
        )}
      </div>

      {canManageInternal && (
        <div className="mb-5 flex gap-2">
          {[
            { value: "all" as const, label: "Semua Produk" },
            { value: "internal" as const, label: "Produk Internal" },
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
              ? "Cari produk internal..."
              : "Cari produk seller..."
          }
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
      </form>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Package className="h-12 w-12 text-gray-300" />}
          title={
            activeTab === "internal"
              ? "Belum ada produk internal"
              : "Tidak ada produk"
          }
          description={
            activeTab === "internal"
              ? "Super admin dapat menambahkan produk resmi platform untuk website utama."
              : "Belum ada produk yang sesuai dengan filter."
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
                      Produk
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">
                      Harga
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
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-gray-900">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(product.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold">
                        {formatPrice(product.price)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={product.isPublished ? "success" : "warning"}>
                          {product.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={
                            product.publishToMarketplace ? "success" : "info"
                          }
                        >
                          {product.publishToMarketplace ? "Utama" : "Nonaktif"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {product.tenant?.name || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {activeTab === "internal" && (
                            <Link
                              href={`/admin/products/${product.id}/edit`}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                              title="Edit produk internal"
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                          )}
                          <button
                            onClick={() =>
                              handleModerate(product.id, !product.isPublished)
                            }
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600"
                            title={
                              product.isPublished ? "Unpublish produk" : "Publish produk"
                            }
                          >
                            {product.isPublished ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            title="Hapus produk"
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

export default function AdminProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
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
    return "Gagal memuat daftar produk";
  };
