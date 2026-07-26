"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sellerApi } from "@/services/seller.service";
import { getErrorMessage } from "@/lib/api";
import { formatPrice, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PageTitle } from "@/components/shared/page-title";
import {
  Zap,
  TrendingUp,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Package,
  Briefcase,
  ArrowRight,
  Info,
  Star,
  Eye,
  Target,
} from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";

interface BoostPlan {
  days: number;
  price: number;
  discount?: number;
  popular?: boolean;
  badge?: string;
}

const BOOST_PLANS: BoostPlan[] = [
  { days: 7, price: 50000, badge: "Coba Dulu" },
  { days: 14, price: 90000, discount: 10, badge: "Hemat 10%" },
  { days: 30, price: 150000, discount: 25, popular: true, badge: "TERPOPULER" },
  { days: 60, price: 250000, discount: 35, badge: "Hemat 35%" },
];

interface BoostableItem {
  id: string;
  name: string;
  type: "PRODUCT" | "SERVICE";
  isBoosted: boolean;
  boostedUntil?: string;
  thumbnail?: string;
  price?: number;
  basePrice?: number;
}

export default function BoostPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<BoostableItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<BoostableItem | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<BoostPlan | null>(null);
  const [boosting, setBoosting] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>("FREE");
  const [hasBoostAccess, setHasBoostAccess] = useState(false);

  useEffect(() => {
    fetchBoostableItems();
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const res = await sellerApi.getCurrentSubscription();
      const plan = res.data?.tenant?.subscriptionPlan || "FREE";
      const features = res.data?.features || {};
      
      setSubscriptionPlan(plan);
      
      // ✅ Cek dari FEATURE, bukan dari nama paket
      setHasBoostAccess(features.canBoostListing === true);
      
      console.log('Subscription check:', { plan, canBoostListing: features.canBoostListing });
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  useEffect(() => {
    // Auto-select item from URL params
    const itemId = searchParams.get("itemId");
    const itemType = searchParams.get("type");
    
    if (itemId && itemType && items.length > 0) {
      const item = items.find(i => i.id === itemId && i.type === itemType.toUpperCase());
      if (item) {
        setSelectedItem(item);
        // Scroll to plans
        setTimeout(() => {
          document.getElementById("boost-plans")?.scrollIntoView({ behavior: "smooth" });
        }, 500);
      }
    }
  }, [searchParams, items]);

  const fetchBoostableItems = async () => {
    setIsLoading(true);
    try {
      const [productsRes, servicesRes] = await Promise.all([
        sellerApi.getProducts({ page: 1, limit: 100 }),
        sellerApi.getServices({ page: 1, limit: 100 }),
      ]);

      const products: BoostableItem[] = (productsRes.data.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        type: "PRODUCT" as const,
        isBoosted: p.isBoosted || false,
        boostedUntil: p.boostedUntil,
        thumbnail: p.thumbnail || p.images?.[0],
        price: p.price,
      }));

      const services: BoostableItem[] = (servicesRes.data.data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        type: "SERVICE" as const,
        isBoosted: s.isBoosted || false,
        boostedUntil: s.boostedUntil,
        thumbnail: s.thumbnail || s.gallery?.[0],
        basePrice: s.basePrice,
      }));

      setItems([...products, ...services]);
    } catch (error) {
      console.error("Failed to fetch items:", error);
      toast.error("Gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBoost = async () => {
    if (!selectedItem) {
      toast.error("Pilih item yang ingin di-boost");
      return;
    }

    // Jika user tidak punya akses boost, redirect ke upgrade
    if (!hasBoostAccess) {
      toast.error("Fitur Boost Listing hanya untuk paket Premium dan Business");
      router.push("/seller/dashboard/subscription");
      return;
    }

    // Untuk user premium, tidak perlu pilih plan (default 7 hari)
    const days = hasBoostAccess ? 7 : (selectedPlan?.days || 7);

    setBoosting(true);
    try {
      if (selectedItem.type === "PRODUCT") {
        await sellerApi.boostProduct(selectedItem.id, days);
      } else {
        await sellerApi.boostService(selectedItem.id, days);
      }

      toast.success(`${selectedItem.name} berhasil di-boost untuk ${days} hari!`);
      
      // Redirect to boosts page
      setTimeout(() => {
        router.push("/seller/dashboard/boosts");
      }, 1500);
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || getErrorMessage(error);
      
      // Jika error 403 (tidak punya akses), redirect ke upgrade
      if (error?.response?.status === 403) {
        toast.error("Upgrade ke Premium untuk menggunakan fitur Boost");
        setTimeout(() => {
          router.push("/seller/dashboard/subscription");
        }, 2000);
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setBoosting(false);
    }
  };

  const displayedItems = showAllItems ? items : items.slice(0, 6);
  const activeBoosts = items.filter(i => i.isBoosted).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <PageTitle title="Boost Produk & Jasa" />

      {/* Hero Header */}
      <div className="mb-8 rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 p-8 md:p-10 text-white shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <Zap className="h-8 w-8" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">Boost Listing Anda</h1>
            </div>
            <p className="text-orange-50 text-lg max-w-2xl leading-relaxed">
              Tingkatkan visibilitas hingga <span className="font-bold text-white">10x lipat</span>! 
              Listing yang di-boost muncul di posisi teratas dan mendapat badge khusus.
            </p>
            {activeBoosts > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">{activeBoosts} listing sedang aktif</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-white/90">
              <Eye className="h-5 w-5" />
              <span className="text-sm">Lebih banyak views</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <Target className="h-5 w-5" />
              <span className="text-sm">Prioritas tampil</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <Star className="h-5 w-5" />
              <span className="text-sm">Badge khusus</span>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          {
            icon: TrendingUp,
            title: "Prioritas Tampil",
            desc: "Muncul di posisi teratas hasil pencarian dan kategori",
            color: "blue",
          },
          {
            icon: Zap,
            title: "Badge Khusus",
            desc: "Mendapat badge 'Boosted' yang menarik perhatian pembeli",
            color: "orange",
          },
          {
            icon: Eye,
            title: "Lebih Banyak View",
            desc: "Meningkatkan kemungkinan dilihat hingga 10x lipat",
            color: "green",
          },
        ].map((benefit, i) => (
          <div key={i} className="rounded-2xl border-2 border-gray-100 bg-white p-6 hover:border-orange-200 hover:shadow-lg transition-all">
            <div className={`inline-flex p-3 rounded-xl mb-4 ${
              benefit.color === "blue" ? "bg-blue-100" :
              benefit.color === "orange" ? "bg-orange-100" :
              "bg-green-100"
            }`}>
              <benefit.icon className={`h-7 w-7 ${
                benefit.color === "blue" ? "text-blue-600" :
                benefit.color === "orange" ? "text-orange-600" :
                "text-green-600"
              }`} />
            </div>
            <h3 className="font-bold text-gray-900 mb-2 text-lg">{benefit.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{benefit.desc}</p>
          </div>
        ))}
      </div>

      {/* Step 1: Select Item */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600 font-bold">
            1
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Pilih Produk atau Jasa
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Pilih item yang ingin Anda boost untuk meningkatkan visibilitas
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">Belum ada produk atau jasa</p>
            <p className="text-sm text-gray-500 mb-6">Buat produk atau jasa terlebih dahulu untuk menggunakan fitur boost</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => router.push("/seller/dashboard/products/create")}>
                <Package className="h-4 w-4 mr-2" />
                Buat Produk
              </Button>
              <Button variant="outline" onClick={() => router.push("/seller/dashboard/services/create")}>
                <Briefcase className="h-4 w-4 mr-2" />
                Buat Jasa
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedItems.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                const itemPrice = item.price || item.basePrice || 0;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`group text-left rounded-2xl border-2 p-4 transition-all hover:shadow-lg ${
                      isSelected
                        ? "border-orange-500 bg-orange-50 shadow-md"
                        : "border-gray-200 hover:border-orange-300"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Thumbnail */}
                      <div className="relative flex-shrink-0">
                        {item.thumbnail ? (
                          <Image
                            src={item.thumbnail}
                            alt={item.name}
                            width={80}
                            height={80}
                            className="w-20 h-20 rounded-xl object-cover"
                          />
                        ) : (
                          <div className={`w-20 h-20 rounded-xl flex items-center justify-center ${
                            item.type === "PRODUCT" ? "bg-blue-100" : "bg-purple-100"
                          }`}>
                            {item.type === "PRODUCT" ? (
                              <Package className="h-10 w-10 text-blue-500" />
                            ) : (
                              <Briefcase className="h-10 w-10 text-purple-500" />
                            )}
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute -top-2 -right-2 bg-orange-500 rounded-full p-1">
                            <CheckCircle className="h-5 w-5 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate mb-1 group-hover:text-orange-600 transition-colors">
                          {item.name}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            item.type === "PRODUCT" 
                              ? "bg-blue-100 text-blue-700" 
                              : "bg-purple-100 text-purple-700"
                          }`}>
                            {item.type === "PRODUCT" ? "Produk" : "Jasa"}
                          </span>
                          {item.isBoosted && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              Aktif
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-gray-900">
                          {formatPrice(itemPrice)}
                        </p>
                        {item.isBoosted && item.boostedUntil && (
                          <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Hingga {formatDate(item.boostedUntil)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Show More Button */}
            {items.length > 6 && (
              <div className="text-center mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowAllItems(!showAllItems)}
                >
                  {showAllItems ? "Tampilkan Lebih Sedikit" : `Tampilkan Semua (${items.length})`}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Step 2: Select Plan OR Premium Info */}
      {selectedItem && (
        <div className="mb-10" id="boost-plans">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600 font-bold">
              2
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {hasBoostAccess ? "Boost Gratis untuk Anda" : "Pilih Paket Boost"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {hasBoostAccess 
                  ? "Fitur boost sudah termasuk dalam paket langganan Anda" 
                  : "Semakin lama durasi, semakin hemat biaya per hari"}
              </p>
            </div>
          </div>

          {hasBoostAccess ? (
            /* Premium User - No Payment Required */
            <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-8 shadow-lg">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 rounded-xl bg-blue-100">
                  <CheckCircle className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Boost Unlimited - Gratis!
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Sebagai member <span className="font-bold text-blue-600">{subscriptionPlan}</span>, 
                    Anda dapat boost listing tanpa biaya tambahan.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 text-gray-700">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm">Durasi 7 hari</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm">Unlimited boost</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-700">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm">Tanpa biaya</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Boost Button for Premium */}
              <Button
                onClick={handleBoost}
                disabled={boosting}
                size="lg"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-6 text-lg"
              >
                {boosting ? (
                  <>
                    <Spinner className="mr-2" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-5 w-5" />
                    Boost Sekarang (Gratis)
                  </>
                )}
              </Button>
            </div>
          ) : (
            /* Free User - Show Upgrade Prompt */
            <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <div className="mx-auto w-fit rounded-full bg-gradient-to-br from-blue-500 to-blue-600 p-4 mb-4">
                <Zap className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Fitur Premium
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Boost Listing hanya tersedia untuk paket <span className="font-bold">Premium</span> dan <span className="font-bold">Business</span>.
                <br />
                Upgrade sekarang untuk boost unlimited tanpa biaya tambahan!
              </p>
              <Button
                onClick={() => router.push("/seller/dashboard/subscription")}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                <TrendingUp className="mr-2 h-5 w-5" />
                Upgrade ke Premium
              </Button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
