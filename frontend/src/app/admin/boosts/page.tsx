"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/services/admin.service";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { 
  Rocket, 
  Trash2, 
  Search, 
  Crown, 
  Package, 
  Briefcase, 
  Calendar,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";

interface PremiumSeller {
  id: string;
  name: string;
  subdomain: string;
  subscriptionPlan: string;
  owner: {
    email: string;
    firstName: string;
    lastName: string;
  };
  products: Array<{
    id: string;
    name: string;
    thumbnail?: string;
    price: number;
    isBoosted: boolean;
    boostedUntil?: string;
  }>;
  services: Array<{
    id: string;
    name: string;
    thumbnail?: string;
    basePrice: number;
    isBoosted: boolean;
    boostedUntil?: string;
  }>;
  jobs: Array<{
    id: string;
    title: string;
    budget: number;
    isBoosted: boolean;
    boostedUntil?: string;
  }>;
}

interface BoostItem {
  id?: string;
  listingId?: string;
  listingType?: string;
  type?: string;
  expiresAt?: string;
  product?: { name?: string };
  service?: { name?: string };
}

export default function AdminBoostsPage() {
  const [view, setView] = useState<"sellers" | "boosted">("sellers");
  const [sellers, setSellers] = useState<PremiumSeller[]>([]);
  const [boosts, setBoosts] = useState<BoostItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSeller, setSelectedSeller] = useState<PremiumSeller | null>(null);
  const [boostForm, setBoostForm] = useState({
    listingId: "",
    type: "product" as "product" | "service" | "job",
    days: 7,
  });
  const [boosting, setBoosting] = useState(false);

  useEffect(() => {
    if (view === "sellers") {
      fetchPremiumSellers();
    } else {
      fetchBoosts();
    }
  }, [view]);

  const fetchPremiumSellers = async () => {
    setIsLoading(true);
    try {
      const { data } = await adminApi.getPremiumSellersForBoost({ search });
      setSellers(data.data || []);
    } catch (error) {
      toast.error("Gagal memuat data seller");
      setSellers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBoosts = async () => {
    setIsLoading(true);
    try {
      const { data } = await adminApi.getBoosts();
      setBoosts(Array.isArray(data) ? data : data.data || []);
    } catch {
      setBoosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBoost = async (listingId: string, type: "product" | "service" | "job", days: number) => {
    setBoosting(true);
    try {
      await adminApi.createBoost({
        listingId,
        listingType: type.toUpperCase(),
        durationDays: days,
      });
      toast.success(`Listing berhasil di-boost untuk ${days} hari!`);
      
      // Refresh data
      if (selectedSeller) {
        fetchPremiumSellers();
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || "Gagal boost listing";
      toast.error(errorMsg);
    } finally {
      setBoosting(false);
    }
  };

  const handleRemove = async (listingId: string, listingType: string) => {
    if (!confirm("Yakin hapus boost ini?")) return;
    try {
      await adminApi.removeBoost({ listingId, listingType });
      toast.success("Boost dihapus");
      fetchBoosts();
    } catch {
      toast.error("Gagal menghapus");
    }
  };

  const renderSellerCard = (seller: PremiumSeller) => {
    const totalListings = seller.products.length + seller.services.length + seller.jobs.length;
    const activeBoosted = [
      ...seller.products.filter(p => p.isBoosted && p.boostedUntil && new Date(p.boostedUntil) > new Date()),
      ...seller.services.filter(s => s.isBoosted && s.boostedUntil && new Date(s.boostedUntil) > new Date()),
      ...seller.jobs.filter(j => j.isBoosted && j.boostedUntil && new Date(j.boostedUntil) > new Date()),
    ].length;

    return (
      <div
        key={seller.id}
        className="rounded-xl border-2 border-gray-200 bg-white p-6 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer"
        onClick={() => setSelectedSeller(seller)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-gray-900">{seller.name}</h3>
              <Badge className={`${
                seller.subscriptionPlan === "BUSINESS" 
                  ? "bg-purple-100 text-purple-700" 
                  : "bg-blue-100 text-blue-700"
              }`}>
                <Crown className="h-3 w-3 mr-1" />
                {seller.subscriptionPlan}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">@{seller.subdomain}</p>
            <p className="text-xs text-gray-500 mt-1">
              {seller.owner.firstName} {seller.owner.lastName} • {seller.owner.email}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 rounded-lg bg-gray-50">
            <div className="text-2xl font-bold text-gray-900">{totalListings}</div>
            <div className="text-xs text-gray-600">Total Listing</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-green-50">
            <div className="text-2xl font-bold text-green-600">{activeBoosted}</div>
            <div className="text-xs text-gray-600">Active Boost</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-blue-50">
            <div className="text-2xl font-bold text-blue-600">
              {totalListings - activeBoosted}
            </div>
            <div className="text-xs text-gray-600">Can Boost</div>
          </div>
        </div>

        <Button size="sm" className="w-full" variant="outline">
          <Zap className="h-4 w-4 mr-2" />
          Lihat & Boost Listings
        </Button>
      </div>
    );
  };

  const renderListingCard = (
    listing: any,
    type: "product" | "service" | "job"
  ) => {
    const isActive = listing.isBoosted && listing.boostedUntil && new Date(listing.boostedUntil) > new Date();
    const name = type === "job" ? listing.title : listing.name;
    const price = type === "product" ? listing.price : type === "service" ? listing.basePrice : listing.budget;

    return (
      <div
        key={listing.id}
        className={`rounded-lg border-2 p-4 ${
          isActive 
            ? "border-green-300 bg-green-50" 
            : "border-gray-200 bg-white hover:border-blue-300"
        } transition-all`}
      >
        <div className="flex items-start gap-3">
          {listing.thumbnail && (
            <div className="relative h-16 w-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
              <Image
                src={listing.thumbnail}
                alt={name}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-semibold text-gray-900 text-sm line-clamp-2">
                {name}
              </h4>
              {isActive && (
                <Badge className="bg-green-100 text-green-700 flex-shrink-0">
                  <Zap className="h-3 w-3 mr-1" />
                  Boosted
                </Badge>
              )}
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Rp {price.toLocaleString("id-ID")}
            </p>
            
            {isActive ? (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Calendar className="h-3 w-3" />
                Hingga {new Date(listing.boostedUntil).toLocaleDateString("id-ID")}
              </div>
            ) : (
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  onClick={() => handleBoost(listing.id, type, 7)}
                  disabled={boosting}
                  className="flex-1 text-xs"
                >
                  7 hari
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleBoost(listing.id, type, 14)}
                  disabled={boosting}
                  variant="outline"
                  className="flex-1 text-xs"
                >
                  14 hari
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleBoost(listing.id, type, 30)}
                  disabled={boosting}
                  variant="outline"
                  className="flex-1 text-xs"
                >
                  30 hari
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (selectedSeller) {
    return (
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedSeller(null)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali ke Daftar Seller
        </Button>

        <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-gray-900">{selectedSeller.name}</h2>
            <Badge className={`${
              selectedSeller.subscriptionPlan === "BUSINESS" 
                ? "bg-purple-100 text-purple-700" 
                : "bg-blue-100 text-blue-700"
            }`}>
              <Crown className="h-4 w-4 mr-1" />
              {selectedSeller.subscriptionPlan}
            </Badge>
          </div>
          <p className="text-gray-600">@{selectedSeller.subdomain}</p>
        </div>

        {/* Products */}
        {selectedSeller.products.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">
                Produk ({selectedSeller.products.length})
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedSeller.products.map((product) =>
                renderListingCard(product, "product")
              )}
            </div>
          </div>
        )}

        {/* Services */}
        {selectedSeller.services.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-bold text-gray-900">
                Jasa ({selectedSeller.services.length})
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedSeller.services.map((service) =>
                renderListingCard(service, "service")
              )}
            </div>
          </div>
        )}

        {/* Jobs */}
        {selectedSeller.jobs.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-bold text-gray-900">
                Job ({selectedSeller.jobs.length})
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedSeller.jobs.map((job) =>
                renderListingCard(job, "job")
              )}
            </div>
          </div>
        )}

        {selectedSeller.products.length === 0 &&
          selectedSeller.services.length === 0 &&
          selectedSeller.jobs.length === 0 && (
            <EmptyState
              icon={Package}
              title="Belum ada listing"
              description="Seller ini belum memiliki produk, jasa, atau job"
            />
          )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Boost Listing Management</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={view === "sellers" ? "default" : "outline"}
            onClick={() => setView("sellers")}
          >
            <Crown className="h-4 w-4 mr-2" />
            Premium Sellers
          </Button>
          <Button
            size="sm"
            variant={view === "boosted" ? "default" : "outline"}
            onClick={() => setView("boosted")}
          >
            <Rocket className="h-4 w-4 mr-2" />
            Active Boosts
          </Button>
        </div>
      </div>

      {view === "sellers" && (
        <>
          <div className="mb-6 rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-blue-100">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-2">
                  Boost Listing untuk Premium/Business Sellers
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Hanya seller dengan paket <span className="font-semibold">Premium</span> atau{" "}
                  <span className="font-semibold">Business</span> yang dapat di-boost.
                  Pilih seller, lalu pilih listing yang ingin di-boost.
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <AlertCircle className="h-4 w-4" />
                  Seller FREE/STARTER harus upgrade dulu untuk bisa di-boost
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari seller (nama atau subdomain)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchPremiumSellers()}
                className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner />
            </div>
          ) : sellers.length === 0 ? (
            <EmptyState
              icon={Crown}
              title="Tidak ada seller premium"
              description="Belum ada seller dengan paket Premium atau Business"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sellers.map(renderSellerCard)}
            </div>
          )}
        </>
      )}

      {view === "boosted" && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner />
            </div>
          ) : boosts.length === 0 ? (
            <EmptyState
              icon={Rocket}
              title="Tidak ada boosted listing"
              description="Belum ada listing yang di-boost"
            />
          ) : (
            <div className="space-y-4">
              {boosts.map((boost) => (
                <div
                  key={boost.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-gray-900">
                      {boost.product?.name || boost.service?.name || "Unknown"}
                    </div>
                    <div className="text-sm text-gray-600">
                      Type: {boost.listingType || boost.type}
                    </div>
                    {boost.expiresAt && (
                      <div className="text-xs text-gray-500 mt-1">
                        Expires: {new Date(boost.expiresAt).toLocaleDateString("id-ID")}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      handleRemove(
                        boost.listingId || "",
                        boost.listingType || boost.type || ""
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
