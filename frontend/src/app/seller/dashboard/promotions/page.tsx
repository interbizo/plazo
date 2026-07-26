"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { sellerApi } from "@/services/seller.service";
import { getErrorMessage } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { PageTitle } from "@/components/shared/page-title";
import type { Product, Service } from "@/types";
import {
  Briefcase,
  Calendar,
  Package,
  Percent,
  RefreshCw,
  Send,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";

type ListingType = "product" | "service";

interface FlashSaleItem {
  id: string;
  salePrice: number;
  originalPrice: number;
  discountPercent?: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  rejectedReason?: string;
  startDate?: string | null;
  endDate?: string | null;
  product?: Pick<Product, "id" | "name" | "slug" | "thumbnail" | "price"> | null;
  service?: Pick<Service, "id" | "name" | "slug" | "thumbnail" | "basePrice"> | null;
  createdAt: string;
}

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: T[] }).data;
  }
  return [];
}

function statusVariant(status: FlashSaleItem["status"]) {
  if (status === "APPROVED") return "success" as const;
  if (status === "REJECTED" || status === "EXPIRED") return "danger" as const;
  return "warning" as const;
}

export default function SellerPromotionsPage() {
  const [items, setItems] = useState<FlashSaleItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listingType, setListingType] = useState<ListingType>("product");
  const [listingId, setListingId] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const listings = listingType === "product" ? products : services;
  const selectedListing = useMemo(
    () => listings.find((listing) => listing.id === listingId),
    [listings, listingId],
  );

  const discountPercent = useMemo(() => {
    const original = Number(originalPrice);
    const sale = Number(salePrice);
    if (!original || !sale || sale >= original) return 0;
    return Math.round((1 - sale / original) * 100);
  }, [originalPrice, salePrice]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [flashSaleRes, productsRes, servicesRes] = await Promise.all([
        sellerApi.getFlashSaleItems(),
        sellerApi.getProducts({ page: 1, limit: 100 }),
        sellerApi.getServices({ page: 1, limit: 100 }),
      ]);

      setItems(normalizeList<FlashSaleItem>(flashSaleRes.data));
      setProducts(normalizeList<Product>(productsRes.data));
      setServices(normalizeList<Service>(servicesRes.data));
    } catch (error) {
      toast.error(getErrorMessage(error));
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleListingChange = (id: string) => {
    setListingId(id);
    const listing = listings.find((item) => item.id === id);
    const price =
      listingType === "product"
        ? (listing as Product | undefined)?.price
        : (listing as Service | undefined)?.basePrice;
    setOriginalPrice(price ? String(price) : "");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const original = Number(originalPrice);
    const sale = Number(salePrice);
    if (!listingId || !original || !sale) {
      toast.error("Pilih item dan isi harga flash sale");
      return;
    }
    if (sale >= original) {
      toast.error("Harga flash sale harus lebih kecil dari harga normal");
      return;
    }

    setIsSubmitting(true);
    try {
      await sellerApi.submitFlashSaleItem({
        productId: listingType === "product" ? listingId : undefined,
        serviceId: listingType === "service" ? listingId : undefined,
        originalPrice: original,
        salePrice: sale,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        position: "flash_sale",
      });

      toast.success("Pengajuan flash sale dikirim");
      setSalePrice("");
      await fetchData();
    } catch (error) {
      toast.error(getErrorMessage(error));
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
      <PageTitle title="Flash Sale" />

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flash Sale</h1>
          <p className="mt-1 text-sm text-gray-600">
            Ajukan produk atau jasa untuk tampil di flash sale marketplace.
          </p>
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px,1fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-6"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Pengajuan Baru</h2>
              <p className="text-sm text-gray-500">Perlu approval admin.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setListingType("product");
                  setListingId("");
                  setOriginalPrice("");
                }}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
                  listingType === "product"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                <Package className="h-4 w-4" />
                Produk
              </button>
              <button
                type="button"
                onClick={() => {
                  setListingType("service");
                  setListingId("");
                  setOriginalPrice("");
                }}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
                  listingType === "service"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                <Briefcase className="h-4 w-4" />
                Jasa
              </button>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                Pilih item
              </span>
              <select
                value={listingId}
                onChange={(event) => handleListingChange(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Pilih {listingType === "product" ? "produk" : "jasa"}</option>
                {listings.map((listing) => (
                  <option key={listing.id} value={listing.id}>
                    {listing.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Harga normal
                </span>
                <input
                  type="number"
                  min="0"
                  value={originalPrice}
                  onChange={(event) => setOriginalPrice(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Harga sale
                </span>
                <input
                  type="number"
                  min="0"
                  value={salePrice}
                  onChange={(event) => setSalePrice(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Mulai
                </span>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Selesai
                </span>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
            </div>

            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
              <div className="flex items-center gap-2 font-medium text-gray-900">
                <Percent className="h-4 w-4 text-orange-500" />
                Diskon {discountPercent}%
              </div>
              {selectedListing && (
                <p className="mt-1 truncate">Item: {selectedListing.name}</p>
              )}
            </div>

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              <Send className="mr-2 h-4 w-4" />
              Kirim Pengajuan
            </Button>
          </div>
        </form>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-5 font-semibold text-gray-900">Riwayat Flash Sale</h2>
          {items.length === 0 ? (
            <EmptyState
              icon={<Zap className="h-16 w-16 text-gray-300" />}
              title="Belum ada pengajuan"
              description="Ajukan produk atau jasa untuk mulai ikut flash sale."
            />
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const listing = item.product || item.service;
                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant={statusVariant(item.status)}>
                            {item.status}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatDate(item.createdAt)}
                          </span>
                        </div>
                        <h3 className="truncate font-semibold text-gray-900">
                          {listing?.name || "Item flash sale"}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                          <span className="line-through">
                            {formatPrice(item.originalPrice)}
                          </span>
                          <span className="font-semibold text-red-600">
                            {formatPrice(item.salePrice)}
                          </span>
                          <span>{item.discountPercent || 0}%</span>
                        </div>
                        {(item.startDate || item.endDate) && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                            <Calendar className="h-3.5 w-3.5" />
                            {item.startDate ? formatDate(item.startDate) : "-"} -{" "}
                            {item.endDate ? formatDate(item.endDate) : "-"}
                          </div>
                        )}
                        {item.rejectedReason && (
                          <p className="mt-2 text-sm text-red-600">
                            {item.rejectedReason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
