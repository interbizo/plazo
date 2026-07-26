"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ShoppingBag,
  Briefcase,
  Palette,
  ChevronRight,
  ChevronLeft,
  Star,
  Zap,
  Globe,
  Smartphone,
  PenTool,
  BarChart3,
  FileText,
  Video,
  Image as ImageIcon,
  Building2,
  UtensilsCrossed,
  Coffee,
  Shirt,
  Cpu,
  Heart,
  GraduationCap,
  Camera,
  Music,
  Clock,
  Truck,
  Shield,
  MapPin,
  Store,
  Headphones,
  HelpCircle,
} from "lucide-react";
import { marketplaceApi } from "@/services/marketplace.service";
import { getSubdomainLink } from "@/lib/domain";
import type { Product, Service, Category } from "@/types";
import { ProductCard } from "@/components/shared/product-card";
import { ServiceCard } from "@/components/shared/service-card";
import { Spinner } from "@/components/ui/spinner";
import { SafeHtml } from "@/components/ui/safe-html";
import { CategoryGrid } from "@/components/shared/category-grid";
import { ReportFloat } from "@/components/shared/report-float";
import toast from "react-hot-toast";

// Category icon mapping (fallback icons)
const categoryIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  "food-culinary": UtensilsCrossed,
  "beverage": Coffee,
  "fashion-apparel": Shirt,
  "electronics-gadget": Cpu,
  "health-beauty": Heart,
  "education-course": GraduationCap,
  "photography": Camera,
  "music-audio": Music,
  "web-development": Globe,
  "mobile-development": Smartphone,
  "ui-ux-design": PenTool,
  "digital-marketing": BarChart3,
  "content-writing": FileText,
  "video-production": Video,
  "graphics-design": ImageIcon,
  "business-consulting": Building2,
  // Default icons
  "default-product": ShoppingBag,
  "default-service": Briefcase,
};

// Banner slides (fallback if no CMS banners)
// Ultimate fallback banners (jika API gagal dan tidak ada banner di database)
// Sekarang fallback banners dikelola dari CMS Admin dengan flag isFallback=true
const fallbackBannerSlides = [
  {
    title: "Produk Digital Terlengkap",
    subtitle: "Temukan ribuan produk digital berkualitas dengan harga terbaik",
    cta: "Belanja Sekarang",
    href: "/products",
    bg: "from-blue-600 to-blue-800",
  },
  {
    title: "Jasa Profesional Terpercaya",
    subtitle: "Freelancer dan agensi siap membantu proyek Anda",
    cta: "Cari Jasa",
    href: "/services",
    bg: "from-indigo-600 to-purple-700",
  },
  {
    title: "Buka Toko Gratis",
    subtitle: "Mulai jual produk dan jasa digital Anda hari ini",
    cta: "Daftar Seller",
    href: "/register?role=SELLER",
    bg: "from-blue-700 to-cyan-600",
  },
];

interface CmsBanner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  position: string;
  sortOrder: number;
  isActive?: boolean;
  status?: string;
}

interface FlashSaleEvent {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface FlashSaleItem {
  id: string;
  salePrice: number;
  originalPrice: number;
  discountPercent?: number;
  startDate?: string;
  endDate?: string;
  product?: Product & { tenant?: { id: string; name: string; subdomain: string } };
  service?: Service & { tenant?: { id: string; name: string; subdomain: string } };
}

interface NearbySeller {
  id?: string;
  subdomain: string;
  name: string;
  logo?: string;
  isVerified?: boolean;
  city?: string;
  description?: string;
  owner?: {
    sellerProfile?: {
      averageRating?: number | null;
      totalReviews?: number | null;
    };
  };
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [cmsBanners, setCmsBanners] = useState<CmsBanner[]>([]);
  const [flashSaleItems, setFlashSaleItems] = useState<FlashSaleItem[]>([]);
  const [flashSaleEvent, setFlashSaleEvent] = useState<FlashSaleEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [productCategories, setProductCategories] = useState<Category[]>([]);
  const [serviceCategories, setServiceCategories] = useState<Category[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // City filter state
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("plazo_selected_city") || "";
  });
  const [nearbySellers, setNearbySellers] = useState<NearbySeller[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [cityList, setCityList] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  const siteName = siteSettings.site_name || "Plazo Marketplace";

  // Fetch cities from API
  useEffect(() => {
    const fetchCities = async () => {
      setLoadingCities(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        console.log('[Location] Fetching cities from:', `${apiUrl}/api/location/cities`);
        
        const response = await fetch(`${apiUrl}/api/location/cities`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('[Location] Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[Location] Response data:', data);
          
          // Handle different response formats
          let cities: string[] = [];
          
          if (data.data && Array.isArray(data.data)) {
            // Extract unique city names
            cities = [...new Set(data.data.map((city: any) => city.name))].sort();
            console.log('[Location] Parsed cities:', cities.length, 'cities');
          } else if (Array.isArray(data)) {
            cities = [...new Set(data.map((city: any) => city.name))].sort();
          }
          
          setCityList(cities);
          
          if (cities.length === 0) {
            console.warn('[Location] No cities found in response');
            toast.error("Data kota tidak ditemukan. Silakan hubungi admin.");
          }
        } else {
          console.error('[Location] Failed to fetch cities, status:', response.status);
          const errorText = await response.text();
          console.error('[Location] Error response:', errorText);
          toast.error("Gagal memuat data kota. Silakan refresh halaman.");
          setCityList([]);
        }
      } catch (error) {
        console.error("[Location] Failed to fetch cities:", error);
        toast.error("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
        setCityList([]);
      } finally {
        setLoadingCities(false);
      }
    };

    fetchCities();
  }, []);

  // Handle city change
  const handleCityChange = useCallback((city: string) => {
    setSelectedCity(city);
    if (city) {
      localStorage.setItem("plazo_selected_city", city);
    } else {
      localStorage.removeItem("plazo_selected_city");
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const cityParam = selectedCity || undefined;
        const [prodRes, svcRes, bannersRes, flashRes, settingsRes, prodCatsRes, svcCatsRes, faqsRes] = await Promise.all([
          marketplaceApi.getProducts({ page: 1, limit: 24, sortBy: "newest", city: cityParam }),
          marketplaceApi.getServices({ page: 1, limit: 16, sortBy: "newest", city: cityParam }),
          marketplaceApi
            .getCmsBanners("homepage_hero")
            .catch(() => ({ data: [] })),
          marketplaceApi
            .getFlashSaleItems("flash_sale")
            .catch(() => ({ data: [] })),
          marketplaceApi
            .getSiteSettings()
            .catch(() => ({ data: [] })),
          marketplaceApi
            .getCategories("PRODUCT")
            .catch(() => ({ data: [] })),
          marketplaceApi
            .getCategories("SERVICE")
            .catch(() => ({ data: [] })),
          marketplaceApi
            .getFaqs()
            .catch(() => ({ data: [] })),
        ]);
        setProducts(prodRes.data.data || []);
        setServices(svcRes.data.data || []);
        
        // Parse banners - handle different response formats
        const bannersData = bannersRes.data;
        let parsedBanners: CmsBanner[] = [];
        
        if (Array.isArray(bannersData)) {
          parsedBanners = bannersData;
        } else if (bannersData && typeof bannersData === 'object') {
          // Check if data is wrapped in a 'data' property
          if (Array.isArray(bannersData.data)) {
            parsedBanners = bannersData.data;
          } else if (bannersData.banners && Array.isArray(bannersData.banners)) {
            parsedBanners = bannersData.banners;
          }
        }
        
        // Filter only active banners
        const activeBanners = parsedBanners.filter((b: CmsBanner) => {
          // Check if banner is active using status field
          const isActive = b.status === 'ACTIVE' || (!b.status && b.isActive !== false);
          return isActive && b.imageUrl; // Must have imageUrl
        });
        
        console.log('[Homepage] Banners loaded:', {
          raw: bannersData,
          parsed: parsedBanners,
          active: activeBanners,
          count: activeBanners.length
        });
        
        setCmsBanners(activeBanners);
        
        // Site settings
        const settingsArray = Array.isArray(settingsRes.data) ? settingsRes.data : settingsRes.data?.data || [];
        const settingsMap: Record<string, string> = {};
        settingsArray.forEach((item: { key: string; value: string }) => {
          settingsMap[item.key] = item.value;
        });
        setSiteSettings(settingsMap);
        
        // Categories
        const prodCatsData = prodCatsRes.data as Category[] | { categories?: Category[] };
        const svcCatsData = svcCatsRes.data as Category[] | { categories?: Category[] };
        const prodCats = Array.isArray(prodCatsData) ? prodCatsData : prodCatsData?.categories || [];
        const svcCats = Array.isArray(svcCatsData) ? svcCatsData : svcCatsData?.categories || [];
        setProductCategories(prodCats.slice(0, 8));
        setServiceCategories(svcCats.slice(0, 8));
        
        // FAQs
        const faqsData = Array.isArray(faqsRes.data) ? faqsRes.data : faqsRes.data?.data || [];
        setFaqs(faqsData.slice(0, 6));
        
        // Flash sale response: { event, items} or legacy array
        const flashData = flashRes.data;
        if (flashData && typeof flashData === 'object' && 'items' in flashData) {
          setFlashSaleEvent(flashData.event || null);
          setFlashSaleItems(Array.isArray(flashData.items) ? flashData.items : []);
        } else {
          setFlashSaleEvent(null);
          setFlashSaleItems(Array.isArray(flashData) ? flashData : []);
        }
      } catch (error) {
        console.error("Failed to load homepage data:", error);
        toast.error("Gagal memuat data. Silakan refresh halaman.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedCity]);

  // Fetch nearby sellers when city changes
  useEffect(() => {
    if (!selectedCity) {
      return;
    }
    const fetchNearby = async () => {
      setLoadingNearby(true);
      try {
        const res = await marketplaceApi.getSellers({ page: 1, limit: 10, city: selectedCity });
        const sellersData = res.data?.data || res.data?.sellers || [];
        setNearbySellers(Array.isArray(sellersData) ? sellersData : []);
      } catch {
        setNearbySellers([]);
      } finally {
        setLoadingNearby(false);
      }
    };
    fetchNearby();
  }, [selectedCity]);

  // Flash sale countdown timer
  const [flashCountdown, setFlashCountdown] = useState<string>("00:00:00");
  const [flashSaleEnded, setFlashSaleEnded] = useState(false);

  useEffect(() => {
    // Use event endDate (global), fallback to first item's endDate (legacy)
    const endDateStr = flashSaleEvent?.endDate || flashSaleItems[0]?.endDate;
    
    if (!endDateStr) {
      const timer = window.setTimeout(() => {
        setFlashCountdown("00:00:00");
        setFlashSaleEnded(false);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    
    const endDate = new Date(endDateStr).getTime();

    const updateCountdown = () => {
      const now = Date.now();
      const diff = endDate - now;

      if (diff <= 0) {
        setFlashCountdown("00:00:00");
        setFlashSaleEnded(true);
        return false; // signal to clear interval
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setFlashCountdown(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      );
      setFlashSaleEnded(false);
      return true; // still running
    };

    // Run immediately, then every second
    const stillRunning = updateCountdown();
    if (!stillRunning) {
      // Already ended, no need to set interval
      return;
    }
    
    const interval = setInterval(() => {
      const running = updateCountdown();
      if (!running) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [flashSaleItems, flashSaleEvent]);

  // Banner slides: use CMS banners if available, fallback to static
  const hasCmsBanners = cmsBanners.length > 0;
  const bannerCount = hasCmsBanners
    ? cmsBanners.length
    : fallbackBannerSlides.length;

  // Debug logging
  useEffect(() => {
    console.log('[Banner Slider] State:', {
      hasCmsBanners,
      cmsBannersCount: cmsBanners.length,
      bannerCount,
      currentSlide,
      fallbackCount: fallbackBannerSlides.length
    });
  }, [hasCmsBanners, cmsBanners.length, bannerCount, currentSlide]);

  // Reset slide when banners change
  useEffect(() => {
    console.log('[Banner Slider] Resetting slide to 0, banners changed:', cmsBanners.length);
    setCurrentSlide(0);
  }, [cmsBanners.length]);

  // Auto-slide banner
  useEffect(() => {
    if (bannerCount <= 1) {
      console.log('[Banner Slider] Auto-slide disabled, only', bannerCount, 'banner(s)');
      return;
    }
    
    console.log('[Banner Slider] Auto-slide enabled, interval: 5s, banners:', bannerCount);
    const timer = setInterval(() => {
      setCurrentSlide((prev) => {
        const next = (prev + 1) % bannerCount;
        console.log('[Banner Slider] Auto-slide:', prev, '→', next);
        return next;
      });
    }, 5000);
    return () => {
      console.log('[Banner Slider] Auto-slide cleanup');
      clearInterval(timer);
    };
  }, [bannerCount]);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => {
      const next = (prev + 1) % bannerCount;
      console.log('[Banner Slider] Next clicked:', prev, '→', next);
      return next;
    });
  }, [bannerCount]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => {
      const next = (prev - 1 + bannerCount) % bannerCount;
      console.log('[Banner Slider] Prev clicked:', prev, '→', next);
      return next;
    });
  }, [bannerCount]);

  return (
    <div className="min-h-screen bg-white">
      {/* ========== HERO: Banner + Categories ========== */}
      <section className="bg-blue-600">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Banner Carousel */}
            <div className="lg:col-span-3 relative overflow-hidden rounded-lg shadow-md bg-white min-h-[12rem] sm:min-h-[16rem] lg:min-h-[20rem]">
              <div
                className="flex transition-transform duration-500 ease-out h-full"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {hasCmsBanners
                  ? cmsBanners.map((banner, i) => (
                      <div key={banner.id} className="w-full shrink-0 relative">
                        {banner.imageUrl ? (
                          <div className="relative w-full h-48 sm:h-64 lg:h-80">
                            <Image
                              src={banner.imageUrl}
                              alt={banner.title || "Banner"}
                              fill
                              className="object-cover"
                              priority={i === 0}
                              unoptimized
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
                            <div className="absolute inset-0 flex flex-col justify-center px-8 sm:px-12 lg:px-16">
                              <h2 className="text-2xl sm:text-4xl font-bold text-white leading-tight max-w-xl">
                                {banner.title}
                              </h2>
                              {banner.subtitle && (
                                <p className="mt-3 text-sm sm:text-base text-white/90 max-w-md">
                                  {banner.subtitle}
                                </p>
                              )}
                              {/* Button CTA - prioritas tertinggi */}
                              {banner.buttonText && banner.buttonUrl ? (
                                <Link
                                  href={banner.buttonUrl}
                                  className="mt-6 inline-block w-fit rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-all hover:scale-105 shadow-lg"
                                >
                                  {banner.buttonText}
                                </Link>
                              ) : banner.linkUrl ? (
                                <Link
                                  href={banner.linkUrl}
                                  className="mt-6 inline-block w-fit rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                                >
                                  Lihat Selengkapnya
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          <div className="w-full bg-blue-600 p-8 sm:p-12 lg:p-16 h-48 sm:h-64 lg:h-80 flex flex-col justify-center">
                            <h2 className="text-2xl sm:text-4xl font-bold text-white leading-tight max-w-xl">
                              {banner.title}
                            </h2>
                            {banner.subtitle && (
                              <p className="mt-3 text-sm sm:text-base text-white/90 max-w-md">
                                {banner.subtitle}
                              </p>
                            )}
                            {/* Button CTA - prioritas tertinggi */}
                            {banner.buttonText && banner.buttonUrl ? (
                              <Link
                                href={banner.buttonUrl}
                                className="mt-6 inline-block w-fit rounded-lg bg-white px-6 py-3 text-sm font-semibold text-emerald-600 hover:bg-gray-50 transition-all hover:scale-105 shadow-lg"
                              >
                                {banner.buttonText}
                              </Link>
                            ) : banner.linkUrl ? (
                              <Link
                                href={banner.linkUrl}
                                className="mt-6 inline-block w-fit rounded-lg bg-white px-6 py-3 text-sm font-semibold text-blue-600 hover:bg-gray-50 transition-colors"
                              >
                                Lihat Selengkapnya
                              </Link>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ))
                  : fallbackBannerSlides.map((slide, i) => (
                      <div
                        key={i}
                        className="w-full shrink-0 bg-blue-600 p-8 sm:p-12 lg:p-16 h-48 sm:h-64 lg:h-80 flex flex-col justify-center"
                      >
                        <h2 className="text-2xl sm:text-4xl font-bold text-white leading-tight max-w-xl">
                          {slide.title}
                        </h2>
                        <p className="mt-3 text-sm sm:text-base text-white/90 max-w-md">
                          {slide.subtitle}
                        </p>
                        <Link
                          href={slide.href}
                          className="mt-6 inline-block w-fit rounded-lg bg-white px-6 py-3 text-sm font-semibold text-blue-600 hover:bg-gray-50 transition-colors"
                        >
                          {slide.cta}
                        </Link>
                      </div>
                    ))}
              </div>
              
              {/* Navigation - only show if more than 1 banner */}
              {bannerCount > 1 && (
                <>
                  {/* Arrows */}
                  <button
                    onClick={prevSlide}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 backdrop-blur-sm p-2 text-blue-600 hover:bg-white transition-colors shadow-lg z-10"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 backdrop-blur-sm p-2 text-blue-600 hover:bg-white transition-colors shadow-lg z-10"
                    aria-label="Next slide"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  
                  {/* Dots */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {Array.from({ length: bannerCount }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        className={`h-2 rounded-full transition-all ${
                          i === currentSlide ? "w-8 bg-white" : "w-2 bg-white/50"
                        }`}
                        aria-label={`Go to slide ${i + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Side cards */}
            <div className="hidden lg:flex flex-col gap-4">
              <Link
                href="/products?sortBy=popular"
                className="group flex-1 rounded-lg bg-white p-5 hover:shadow-lg transition-all border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50">
                    <Zap className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-900">Flash Sale</span>
                    <p className="text-xs text-gray-500">Diskon hingga 70%</p>
                  </div>
                </div>
              </Link>
              <Link
                href="/services?sortBy=rating"
                className="group flex-1 rounded-lg bg-white p-5 hover:shadow-lg transition-all border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-50">
                    <Star className="h-6 w-6 text-yellow-600 fill-yellow-600" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-900">Top Rated</span>
                    <p className="text-xs text-gray-500">Jasa terbaik</p>
                  </div>
                </div>
              </Link>
              <Link
                href="/jobs"
                className="group flex-1 rounded-lg bg-white p-5 hover:shadow-lg transition-all border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                    <Briefcase className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-900">Job Board</span>
                    <p className="text-xs text-gray-500">Cari pekerjaan</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SEARCH BAR ========== */}
      <section className="bg-white border-b border-gray-200 py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const q = (formData.get("q") as string)?.trim();
              const type = formData.get("type") as string;
              if (q) {
                window.location.href = `/${type}?search=${encodeURIComponent(q)}`;
              }
            }}
            className="flex items-center gap-2 max-w-2xl mx-auto"
          >
            <select
              name="type"
              className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="products">Produk</option>
              <option value="services">Jasa</option>
              <option value="jobs">Cari Vendor</option>
            </select>
            <input
              name="q"
              type="text"
              placeholder="Cari produk, jasa, atau vendor..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Cari
            </button>
          </form>
        </div>
      </section>

      {/* ========== TRUST BADGES ========== */}
      <section className="bg-white border-y border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200">
            {[
              {
                icon: Truck,
                label: "Pengiriman Instan",
                sub: "Produk digital langsung",
              },
              {
                icon: Shield,
                label: "Pembayaran Aman",
                sub: "Transaksi terjamin",
              },
              { 
                icon: Clock, 
                label: "Layanan 24/7", 
                sub: "Bantuan kapan saja",
              },
              {
                icon: Headphones,
                label: "Support Responsif",
                sub: "Tim siap membantu",
              },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-center gap-3 py-5 px-4">
                <item.icon className="h-8 w-8 text-blue-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-500">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CITY FILTER BAR ========== */}
      <section className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                <MapPin className="h-4 w-4 text-blue-600" />
              </div>
              <span>Lokasi Anda</span>
            </div>
            <select
              value={selectedCity}
              onChange={(e) => handleCityChange(e.target.value)}
              disabled={loadingCities}
              className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">📍 Semua Kota</option>
              {loadingCities ? (
                <option disabled>Memuat data kota...</option>
              ) : cityList.length === 0 ? (
                <option disabled>Data kota tidak tersedia</option>
              ) : (
                cityList.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))
              )}
            </select>
            {selectedCity && (
              <button
                onClick={() => handleCityChange("")}
                className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
              >
                ✕ Reset lokasi
              </button>
            )}
            {selectedCity && (
              <span className="ml-auto text-xs text-gray-400">
                Menampilkan produk & toko di <span className="font-semibold text-gray-600">{selectedCity}</span>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ========== TOKO DI KOTA ANDA ========== */}
      {selectedCity && (
        <section className="mt-2">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                    <Store className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Toko di {selectedCity}
                    </h2>
                    <p className="text-xs text-emerald-100">Seller terdekat di kotamu</p>
                  </div>
                </div>
                <Link
                  href={`/services?city=${encodeURIComponent(selectedCity)}`}
                  className="group hidden sm:flex items-center gap-1 rounded-lg bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-all"
                >
                  Lihat Semua
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              <div className="bg-emerald-600/50 px-6 py-4">
                {loadingNearby ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner />
                  </div>
                ) : nearbySellers.length > 0 ? (
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {nearbySellers.map((seller) => (
                      <Link
                        key={seller.id || seller.subdomain}
                        href={getSubdomainLink(seller.subdomain)}
                        className="group shrink-0 w-48 rounded-xl bg-white p-4 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0 overflow-hidden">
                            {seller.logo ? (
                              <Image src={seller.logo} alt={seller.name} width={40} height={40} className="rounded-full object-cover" />
                            ) : (
                              seller.name?.charAt(0)?.toUpperCase() || "S"
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate group-hover:text-emerald-600 transition-colors">
                              {seller.name}
                            </p>
                            {seller.isVerified && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                                ✓ Verified
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{seller.city || selectedCity}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                          <Star
                            className={`h-3 w-3 ${
                              (seller.owner?.sellerProfile?.totalReviews ?? 0) > 0
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                          {(seller.owner?.sellerProfile?.totalReviews ?? 0) > 0
                            ? `${Number(seller.owner?.sellerProfile?.averageRating ?? 0).toFixed(1)} (${seller.owner?.sellerProfile?.totalReviews} ulasan)`
                            : "Belum ada ulasan"}
                        </div>
                        {seller.description && (
                          <p className="mt-2 text-[11px] text-gray-400 line-clamp-2">{seller.description}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-white/70">
                    Belum ada toko di {selectedCity}. Jadilah yang pertama!
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========== KATEGORI PRODUK - NESTED SUPPORT ========== */}
      <CategoryGrid
        categories={productCategories}
        type="PRODUCT"
        title="Kategori Produk"
        description="Jelajahi berbagai kategori produk digital"
        viewAllHref="/products"
      />

      {/* ========== FLASH SALE PRODUK & JASA - REDESIGNED ========== */}
      {/* Only show if there's an active event or flash sale items */}
      {(flashSaleEvent || flashSaleItems.length > 0) && (
        <section className="mt-2">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="bg-red-500 rounded-xl shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm animate-pulse">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-wide flex items-center gap-2">
                      {flashSaleEvent?.name || "Flash Sale"}
                      <span className="inline-flex items-center rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white">
                        HOT
                      </span>
                    </h2>
                    {flashSaleEnded ? (
                      <span className="text-sm font-semibold text-white/80">
                        Sale telah berakhir
                      </span>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-white/90">Berakhir dalam:</span>
                        <div className="flex items-center gap-1">
                          <span className="bg-white text-red-600 rounded-md px-2 py-1 font-mono font-bold text-sm shadow-sm">
                            {flashCountdown.split(":")[0]}
                          </span>
                          <span className="text-white font-bold">:</span>
                          <span className="bg-white text-red-600 rounded-md px-2 py-1 font-mono font-bold text-sm shadow-sm">
                            {flashCountdown.split(":")[1]}
                          </span>
                          <span className="text-white font-bold">:</span>
                          <span className="bg-white text-red-600 rounded-md px-2 py-1 font-mono font-bold text-sm shadow-sm">
                            {flashCountdown.split(":")[2]}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <Link
                  href="/products?sortBy=popular"
                  className="group hidden sm:flex items-center gap-1 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-gray-50 transition-all shadow-md"
                >
                  Lihat Semua 
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12 bg-red-600">
                  <Spinner />
                </div>
              ) : flashSaleItems.length > 0 ? (
                <div className="bg-red-600 px-6 py-4">
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {flashSaleItems.map((item) => {
                      if (item.product) {
                        const flashProduct: Product = {
                          ...item.product,
                          price: item.salePrice,
                          comparePrice: item.originalPrice,
                          tenantId: item.product.tenant?.id || "",
                          description: "",
                          stock: item.product.stock ?? 0,
                          categoryId: item.product.category?.id || "",
                          images: item.product.images || [],
                          tags: [],
                          isPublished: true,
                          isBoosted: false,
                          createdAt: "",
                          updatedAt: "",
                        };
                        return (
                          <div key={item.id} className="w-40 sm:w-44 shrink-0 transform hover:scale-105 transition-transform duration-300">
                            <ProductCard product={flashProduct} />
                          </div>
                        );
                      }
                      if (item.service) {
                        const flashService: Service = {
                          ...item.service,
                          basePrice: item.salePrice,
                          comparePrice: item.originalPrice,
                        };
                        return (
                          <div key={item.id} className="w-40 sm:w-44 shrink-0 transform hover:scale-105 transition-transform duration-300">
                            <ServiceCard service={flashService} />
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-white/70 bg-red-600">
                  Belum ada item flash sale
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ========== PRODUK TERBARU - REDESIGNED ========== */}
      <section className="mt-6 mb-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section header with modern design */}
          <div className="bg-blue-600 rounded-t-xl shadow-md">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                  <ShoppingBag className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Produk Untuk Anda
                  </h2>
                  <p className="text-xs text-blue-100">Pilihan terbaik hari ini</p>
                </div>
              </div>
              <Link
                href="/products"
                className="group flex items-center gap-1 rounded-lg bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-all"
              >
                Lihat Semua 
                <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 bg-white rounded-b-xl shadow-md">
              <Spinner />
            </div>
          ) : products.length > 0 ? (
            <div className="bg-white rounded-b-xl shadow-md p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {products.map((product) => (
                  <div key={product.id} className="group">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-b-xl shadow-md py-12 text-center text-sm text-gray-400">
              Belum ada produk
            </div>
          )}

          {products.length > 0 && (
            <div className="mt-6 text-center">
              <Link
                href="/products"
                className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-700 hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                Lihat Semua Produk 
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ========== SEPARATOR ========== */}
      <div className="h-3 bg-gray-100" />

      {/* ========== KATEGORI JASA - NESTED SUPPORT ========== */}
      <CategoryGrid
        categories={serviceCategories}
        type="SERVICE"
        title="Kategori Jasa"
        description="Temukan jasa profesional untuk kebutuhan Anda"
        viewAllHref="/services"
      />

      {/* ========== JASA POPULER - REDESIGNED ========== */}
      <section className="mt-6 mb-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="bg-purple-600 rounded-t-xl shadow-md">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Jasa Untuk Anda
                  </h2>
                  <p className="text-xs text-purple-100">Freelancer terbaik siap membantu</p>
                </div>
              </div>
              <Link
                href="/services"
                className="group flex items-center gap-1 rounded-lg bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-all"
              >
                Lihat Semua 
                <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 bg-white rounded-b-xl shadow-md">
              <Spinner />
            </div>
          ) : services.length > 0 ? (
            <div className="bg-white rounded-b-xl shadow-md p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {services.map((service) => (
                  <div key={service.id} className="group">
                    <ServiceCard service={service} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-b-xl shadow-md py-12 text-center text-sm text-gray-400">
              Belum ada jasa
            </div>
          )}

          {services.length > 0 && (
            <div className="mt-6 text-center">
              <Link
                href="/services"
                className="group inline-flex items-center gap-2 rounded-xl bg-purple-600 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:bg-purple-700 hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                Lihat Semua Jasa 
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ========== FAQ SECTION ========== */}
      {faqs.length > 0 && (
        <section className="mt-8 mb-6">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 mb-3">
                <HelpCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-600">Pertanyaan Umum</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Frequently Asked Questions
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Temukan jawaban untuk pertanyaan yang sering ditanyakan
              </p>
            </div>

            <div className="space-y-3">
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm font-semibold text-gray-900 pr-4">
                      {faq.question}
                    </span>
                    <ChevronRight
                      className={`h-5 w-5 text-gray-400 shrink-0 transition-transform ${
                        expandedFaq === faq.id ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                  {expandedFaq === faq.id && (
                    <div className="px-6 pb-4 pt-2 border-t border-gray-100">
                      <SafeHtml html={faq.answer || ""} className="text-sm text-gray-600" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Masih ada pertanyaan?{" "}
                <Link href="/faq" className="font-semibold text-blue-600 hover:text-blue-700">
                  Lihat semua FAQ
                </Link>
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ========== CTA SELLER - REDESIGNED ========== */}
      <section className="mt-8 mb-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-blue-600 shadow-2xl">
            {/* Decorative pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full -ml-32 -mb-32"></div>
            </div>
            
            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6 px-8 py-10 sm:py-12">
              <div className="text-center sm:text-left">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-1.5 mb-3">
                  <Star className="h-4 w-4 text-yellow-300 fill-yellow-300" />
                  <span className="text-xs font-semibold text-white">Bergabung dengan ribuan seller sukses</span>
                </div>
                <h2 className="text-2xl font-bold text-white sm:text-3xl">
                  Punya Keahlian? Mulai Jual di Plazo!
                </h2>
                <p className="mt-2 text-sm text-blue-50 max-w-xl">
                  Buka toko online gratis, jangkau ribuan pembeli, dan mulai dapatkan penghasilan dari keahlian Anda hari ini.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-blue-50">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-4 w-4" />
                    <span>Gratis selamanya</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-4 w-4" />
                    <span>Setup 5 menit</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                <Link
                  href="/register?role=SELLER"
                  className="group w-full sm:w-auto rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-blue-600 hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl hover:scale-105 duration-300"
                >
                  <span className="flex items-center gap-2">
                    Daftar sebagai Seller
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
                <Link
                  href="/register"
                  className="w-full sm:w-auto rounded-xl border-2 border-white/40 bg-transparent px-8 py-3.5 text-sm font-bold text-white hover:bg-white/10 transition-all"
                >
                  Daftar sebagai Buyer
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Report Float Button */}
      <ReportFloat />
    </div>
  );
}
