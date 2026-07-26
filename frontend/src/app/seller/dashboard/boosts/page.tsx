"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { sellerApi } from "@/services/seller.service";
import { getErrorMessage } from "@/lib/api";
import { formatPrice, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import {
  Zap,
  Package,
  Briefcase,
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

interface BoostItem {
  id: string;
  type: "product" | "service" | "job";
  name?: string;
  title?: string;
  slug?: string;
  thumbnail?: string;
  price?: number;
  basePrice?: number;
  budget?: number;
  isBoosted: boolean;
  boostedUntil?: string;
  createdAt: string;
}

export default function BoostsPage() {
  const [boosts, setBoosts] = useState<BoostItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "expired">("all");

  useEffect(() => {
    fetchBoosts();
  }, []);

  const fetchBoosts = async () => {
    try {
      const response = await sellerApi.getBoosts();
      const items = Array.isArray(response.data) 
        ? response.data 
        : response.data?.data || [];
      setBoosts(items);
    } catch (error) {
      console.error("Failed to fetch boosts:", error);
      toast.error(getErrorMessage(error));
      setBoosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBoosts = Array.isArray(boosts) ? boosts.filter((boost) => {
    if (filter === "all") return true;
    
    const now = new Date();
    const isActive = boost.boostedUntil && new Date(boost.boostedUntil) > now;
    
    if (filter === "active") return isActive;
    if (filter === "expired") return !isActive;
    return true;
  }) : [];

  const activeBoosts = Array.isArray(boosts) 
    ? boosts.filter((b) => b.boostedUntil && new Date(b.boostedUntil) > new Date()).length 
    : 0;
  const totalSpent = 0; // Backend tidak mengembalikan harga boost, jadi set 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
      <PageTitle title="Boost & Top Ads" />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Boost & Top Ads
        </h1>
        <p className="text-gray-600">
          Tingkatkan visibilitas produk dan jasa Anda dengan boost
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Boosts</p>
              <p className="text-2xl font-bold text-gray-900">{activeBoosts}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Boosts</p>
              <p className="text-2xl font-bold text-gray-900">{boosts.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPrice(totalSpent)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "active"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Aktif
          </button>
          <button
            onClick={() => setFilter("expired")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "expired"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Expired
          </button>
        </div>

        <div className="flex gap-3">
          <Link href="/seller/dashboard/boost">
            <Button>
              <Zap className="h-4 w-4 mr-2" />
              Boost Produk/Jasa
            </Button>
          </Link>
        </div>
      </div>

      {/* Boost List */}
      {filteredBoosts.length === 0 ? (
        <EmptyState
          icon={<Zap className="h-16 w-16 text-gray-300" />}
          title={
            filter === "all"
              ? "Belum ada boost"
              : filter === "active"
              ? "Tidak ada boost aktif"
              : "Tidak ada boost expired"
          }
          description="Boost produk atau jasa Anda untuk meningkatkan visibilitas"
        />
      ) : (
        <div className="space-y-4">
          {filteredBoosts.map((boost) => {
            const isActive = boost.boostedUntil && new Date(boost.boostedUntil) > new Date();
            const itemName = boost.name || boost.title || "Untitled";
            const itemPrice = boost.price || boost.basePrice || boost.budget || 0;
            
            return (
              <div
                key={boost.id}
                className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full ${
                        boost.type === "product"
                          ? "bg-blue-100"
                          : "bg-purple-100"
                      }`}
                    >
                      {boost.type === "product" ? (
                        <Package className="h-6 w-6 text-blue-600" />
                      ) : (
                        <Briefcase className="h-6 w-6 text-purple-600" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {itemName}
                        </h3>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            <CheckCircle className="h-3 w-3" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                            <XCircle className="h-3 w-3" />
                            Expired
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Berakhir: {boost.boostedUntil ? formatDate(boost.boostedUntil) : "-"}
                        </span>
                      </div>

                      <p className="text-xs text-gray-400 mt-2">
                        Dibuat {formatDate(boost.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {formatPrice(itemPrice)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Harga item
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
