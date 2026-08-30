// @ts-nocheck
"use client";
// Recovery snapshot from the local Next.js build cache. This file is retained as an inactive legacy homepage reference.

import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShoppingBag, Briefcase, ChevronRight, ChevronLeft, Star, Zap, Globe, Smartphone, PenTool, BarChart3, FileText, Video, Image as ImageIcon, Building2, UtensilsCrossed, Coffee, Shirt, Cpu, Heart, GraduationCap, Camera, Music, Clock, Truck, Shield, MapPin, Store, Headphones, HelpCircle } from "lucide-react";
import { marketplaceApi } from "@/services/marketplace.service";
import { getSubdomainLink } from "@/lib/domain";
import { ProductCard } from "@/components/shared/product-card";
import { ServiceCard } from "@/components/shared/service-card";
import { Spinner } from "@/components/ui/spinner";
import { SafeHtml } from "@/components/ui/safe-html";
import { CategoryGrid } from "@/components/shared/category-grid";
import { ReportFloat } from "@/components/shared/report-float";
import toast from "react-hot-toast";
// Category icon mapping (fallback icons)
const categoryIconMap = {
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
    "default-service": Briefcase
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
        bg: "from-blue-600 to-blue-800"
    },
    {
        title: "Jasa Profesional Terpercaya",
        subtitle: "Freelancer dan agensi siap membantu proyek Anda",
        cta: "Cari Jasa",
        href: "/services",
        bg: "from-indigo-600 to-purple-700"
    },
    {
        title: "Buka Toko Gratis",
        subtitle: "Mulai jual produk dan jasa digital Anda hari ini",
        cta: "Daftar Seller",
        href: "/register?role=SELLER",
        bg: "from-blue-700 to-cyan-600"
    }
];
export default function HomePage() {
    const [products, setProducts] = useState([]);
    const [services, setServices] = useState([]);
    const [cmsBanners, setCmsBanners] = useState([]);
    const [flashSaleItems, setFlashSaleItems] = useState([]);
    const [flashSaleEvent, setFlashSaleEvent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [siteSettings, setSiteSettings] = useState({});
    const [productCategories, setProductCategories] = useState([]);
    const [serviceCategories, setServiceCategories] = useState([]);
    const [faqs, setFaqs] = useState([]);
    const [expandedFaq, setExpandedFaq] = useState(null);
    // City filter state
    const [selectedCity, setSelectedCity] = useState(()=>{
        if ("object" === "undefined") return "";
        return localStorage.getItem("plazo_selected_city") || "";
    });
    const [nearbySellers, setNearbySellers] = useState([]);
    const [loadingNearby, setLoadingNearby] = useState(false);
    const [cityList, setCityList] = useState([]);
    const [loadingCities, setLoadingCities] = useState(false);
    const siteName = siteSettings.site_name || "Plazo Marketplace";
    // Fetch cities from API
    useEffect(()=>{
        const fetchCities = async ()=>{
            setLoadingCities(true);
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
                ;
                const response = await fetch(`${apiUrl}/api/location/cities`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                ;
                if (response.ok) {
                    const data = await response.json();
                    ;
                    // Handle different response formats
                    let cities = [];
                    if (data.data && Array.isArray(data.data)) {
                        // Extract unique city names
                        cities = [
                            ...new Set(data.data.map((city)=>city.name))
                        ].sort();
                        ;
                    } else if (Array.isArray(data)) {
                        cities = [
                            ...new Set(data.map((city)=>city.name))
                        ].sort();
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
            } finally{
                setLoadingCities(false);
            }
        };
        fetchCities();
    }, []);
    // Handle city change
    const handleCityChange = useCallback((city)=>{
        setSelectedCity(city);
        if (city) {
            localStorage.setItem("plazo_selected_city", city);
        } else {
            localStorage.removeItem("plazo_selected_city");
        }
    }, []);
    useEffect(()=>{
        const fetchData = async ()=>{
            setIsLoading(true);
            try {
                const cityParam = selectedCity || undefined;
                const [prodRes, svcRes, bannersRes, flashRes, settingsRes, prodCatsRes, svcCatsRes, faqsRes] = await Promise.all([
                    marketplaceApi.getProducts({
                        page: 1,
                        limit: 24,
                        sortBy: "newest",
                        city: cityParam
                    }),
                    marketplaceApi.getServices({
                        page: 1,
                        limit: 16,
                        sortBy: "newest",
                        city: cityParam
                    }),
                    marketplaceApi.getCmsBanners("homepage_hero").catch(()=>({
                            data: []
                        })),
                    marketplaceApi.getFlashSaleItems("flash_sale").catch(()=>({
                            data: []
                        })),
                    marketplaceApi.getSiteSettings().catch(()=>({
                            data: []
                        })),
                    marketplaceApi.getCategories("PRODUCT").catch(()=>({
                            data: []
                        })),
                    marketplaceApi.getCategories("SERVICE").catch(()=>({
                            data: []
                        })),
                    marketplaceApi.getFaqs().catch(()=>({
                            data: []
                        }))
                ]);
                setProducts(prodRes.data.data || []);
                setServices(svcRes.data.data || []);
                // Parse banners - handle different response formats
                const bannersData = bannersRes.data;
                let parsedBanners = [];
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
                const activeBanners = parsedBanners.filter((b)=>{
                    // Check if banner is active using status field
                    const isActive = b.status === 'ACTIVE' || !b.status && b.isActive !== false;
                    return isActive && b.imageUrl; // Must have imageUrl
                });
                ;
                setCmsBanners(activeBanners);
                // Site settings
                const settingsArray = Array.isArray(settingsRes.data) ? settingsRes.data : settingsRes.data?.data || [];
                const settingsMap = {};
                settingsArray.forEach((item)=>{
                    settingsMap[item.key] = item.value;
                });
                setSiteSettings(settingsMap);
                // Categories
                const prodCatsData = prodCatsRes.data;
                const svcCatsData = svcCatsRes.data;
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
            } finally{
                setIsLoading(false);
            }
        };
        fetchData();
    }, [
        selectedCity
    ]);
    // Fetch nearby sellers when city changes
    useEffect(()=>{
        if (!selectedCity) {
            return;
        }
        const fetchNearby = async ()=>{
            setLoadingNearby(true);
            try {
                const res = await marketplaceApi.getSellers({
                    page: 1,
                    limit: 10,
                    city: selectedCity
                });
                const sellersData = res.data?.data || res.data?.sellers || [];
                setNearbySellers(Array.isArray(sellersData) ? sellersData : []);
            } catch  {
                setNearbySellers([]);
            } finally{
                setLoadingNearby(false);
            }
        };
        fetchNearby();
    }, [
        selectedCity
    ]);
    // Flash sale countdown timer
    const [flashCountdown, setFlashCountdown] = useState("00:00:00");
    const [flashSaleEnded, setFlashSaleEnded] = useState(false);
    useEffect(()=>{
        // Use event endDate (global), fallback to first item's endDate (legacy)
        const endDateStr = flashSaleEvent?.endDate || flashSaleItems[0]?.endDate;
        if (!endDateStr) {
            const timer = window.setTimeout(()=>{
                setFlashCountdown("00:00:00");
                setFlashSaleEnded(false);
            }, 0);
            return ()=>window.clearTimeout(timer);
        }
        const endDate = new Date(endDateStr).getTime();
        const updateCountdown = ()=>{
            const now = Date.now();
            const diff = endDate - now;
            if (diff <= 0) {
                setFlashCountdown("00:00:00");
                setFlashSaleEnded(true);
                return false; // signal to clear interval
            }
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor(diff % (1000 * 60 * 60) / (1000 * 60));
            const seconds = Math.floor(diff % (1000 * 60) / 1000);
            setFlashCountdown(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
            setFlashSaleEnded(false);
            return true; // still running
        };
        // Run immediately, then every second
        const stillRunning = updateCountdown();
        if (!stillRunning) {
            // Already ended, no need to set interval
            return;
        }
        const interval = setInterval(()=>{
            const running = updateCountdown();
            if (!running) {
                clearInterval(interval);
            }
        }, 1000);
        return ()=>clearInterval(interval);
    }, [
        flashSaleItems,
        flashSaleEvent
    ]);
    // Banner slides: use CMS banners if available, fallback to static
    const hasCmsBanners = cmsBanners.length > 0;
    const bannerCount = hasCmsBanners ? cmsBanners.length : fallbackBannerSlides.length;
    // Debug logging
    useEffect(()=>{
        ;
    }, [
        hasCmsBanners,
        cmsBanners.length,
        bannerCount,
        currentSlide
    ]);
    // Reset slide when banners change
    useEffect(()=>{
        ;
        setCurrentSlide(0);
    }, [
        cmsBanners.length
    ]);
    // Auto-slide banner
    useEffect(()=>{
        if (bannerCount <= 1) {
            ;
            return;
        }
        ;
        const timer = setInterval(()=>{
            setCurrentSlide((prev)=>{
                const next = (prev + 1) % bannerCount;
                ;
                return next;
            });
        }, 5000);
        return ()=>{
            ;
            clearInterval(timer);
        };
    }, [
        bannerCount
    ]);
    const nextSlide = useCallback(()=>{
        setCurrentSlide((prev)=>{
            const next = (prev + 1) % bannerCount;
            ;
            return next;
        });
    }, [
        bannerCount
    ]);
    const prevSlide = useCallback(()=>{
        setCurrentSlide((prev)=>{
            const next = (prev - 1 + bannerCount) % bannerCount;
            ;
            return next;
        });
    }, [
        bannerCount
    ]);
    return /*#__PURE__*/ _jsxs("div", {
        className: "min-h-screen bg-white",
        children: [
            /*#__PURE__*/ _jsx("section", {
                className: "bg-blue-600",
                children: /*#__PURE__*/ _jsx("div", {
                    className: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-6",
                    children: /*#__PURE__*/ _jsxs("div", {
                        className: "grid grid-cols-1 lg:grid-cols-4 gap-4",
                        children: [
                            /*#__PURE__*/ _jsxs("div", {
                                className: "lg:col-span-3 relative overflow-hidden rounded-lg shadow-md bg-white min-h-[12rem] sm:min-h-[16rem] lg:min-h-[20rem]",
                                children: [
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "flex transition-transform duration-500 ease-out h-full",
                                        style: {
                                            transform: `translateX(-${currentSlide * 100}%)`
                                        },
                                        children: hasCmsBanners ? cmsBanners.map((banner, i)=>/*#__PURE__*/ _jsx("div", {
                                                className: "w-full shrink-0 relative",
                                                children: banner.imageUrl ? /*#__PURE__*/ _jsxs("div", {
                                                    className: "relative w-full h-48 sm:h-64 lg:h-80",
                                                    children: [
                                                        /*#__PURE__*/ _jsx(Image, {
                                                            src: banner.imageUrl,
                                                            alt: banner.title || "Banner",
                                                            fill: true,
                                                            className: "object-cover",
                                                            priority: i === 0,
                                                            unoptimized: true
                                                        }),
                                                        /*#__PURE__*/ _jsx("div", {
                                                            className: "absolute inset-0 bg-gradient-to-r from-black/60 to-transparent"
                                                        }),
                                                        /*#__PURE__*/ _jsxs("div", {
                                                            className: "absolute inset-0 flex flex-col justify-center px-8 sm:px-12 lg:px-16",
                                                            children: [
                                                                /*#__PURE__*/ _jsx("h2", {
                                                                    className: "text-2xl sm:text-4xl font-bold text-white leading-tight max-w-xl",
                                                                    children: banner.title
                                                                }),
                                                                banner.subtitle && /*#__PURE__*/ _jsx("p", {
                                                                    className: "mt-3 text-sm sm:text-base text-white/90 max-w-md",
                                                                    children: banner.subtitle
                                                                }),
                                                                banner.buttonText && banner.buttonUrl ? /*#__PURE__*/ _jsx(Link, {
                                                                    href: banner.buttonUrl,
                                                                    className: "mt-6 inline-block w-fit rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-all hover:scale-105 shadow-lg",
                                                                    children: banner.buttonText
                                                                }) : banner.linkUrl ? /*#__PURE__*/ _jsx(Link, {
                                                                    href: banner.linkUrl,
                                                                    className: "mt-6 inline-block w-fit rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors",
                                                                    children: "Lihat Selengkapnya"
                                                                }) : null
                                                            ]
                                                        })
                                                    ]
                                                }) : /*#__PURE__*/ _jsxs("div", {
                                                    className: "w-full bg-blue-600 p-8 sm:p-12 lg:p-16 h-48 sm:h-64 lg:h-80 flex flex-col justify-center",
                                                    children: [
                                                        /*#__PURE__*/ _jsx("h2", {
                                                            className: "text-2xl sm:text-4xl font-bold text-white leading-tight max-w-xl",
                                                            children: banner.title
                                                        }),
                                                        banner.subtitle && /*#__PURE__*/ _jsx("p", {
                                                            className: "mt-3 text-sm sm:text-base text-white/90 max-w-md",
                                                            children: banner.subtitle
                                                        }),
                                                        banner.buttonText && banner.buttonUrl ? /*#__PURE__*/ _jsx(Link, {
                                                            href: banner.buttonUrl,
                                                            className: "mt-6 inline-block w-fit rounded-lg bg-white px-6 py-3 text-sm font-semibold text-emerald-600 hover:bg-gray-50 transition-all hover:scale-105 shadow-lg",
                                                            children: banner.buttonText
                                                        }) : banner.linkUrl ? /*#__PURE__*/ _jsx(Link, {
                                                            href: banner.linkUrl,
                                                            className: "mt-6 inline-block w-fit rounded-lg bg-white px-6 py-3 text-sm font-semibold text-blue-600 hover:bg-gray-50 transition-colors",
                                                            children: "Lihat Selengkapnya"
                                                        }) : null
                                                    ]
                                                })
                                            }, banner.id)) : fallbackBannerSlides.map((slide, i)=>/*#__PURE__*/ _jsxs("div", {
                                                className: "w-full shrink-0 bg-blue-600 p-8 sm:p-12 lg:p-16 h-48 sm:h-64 lg:h-80 flex flex-col justify-center",
                                                children: [
                                                    /*#__PURE__*/ _jsx("h2", {
                                                        className: "text-2xl sm:text-4xl font-bold text-white leading-tight max-w-xl",
                                                        children: slide.title
                                                    }),
                                                    /*#__PURE__*/ _jsx("p", {
                                                        className: "mt-3 text-sm sm:text-base text-white/90 max-w-md",
                                                        children: slide.subtitle
                                                    }),
                                                    /*#__PURE__*/ _jsx(Link, {
                                                        href: slide.href,
                                                        className: "mt-6 inline-block w-fit rounded-lg bg-white px-6 py-3 text-sm font-semibold text-blue-600 hover:bg-gray-50 transition-colors",
                                                        children: slide.cta
                                                    })
                                                ]
                                            }, i))
                                    }),
                                    bannerCount > 1 && /*#__PURE__*/ _jsxs(_Fragment, {
                                        children: [
                                            /*#__PURE__*/ _jsx("button", {
                                                onClick: prevSlide,
                                                className: "absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 backdrop-blur-sm p-2 text-blue-600 hover:bg-white transition-colors shadow-lg z-10",
                                                "aria-label": "Previous slide",
                                                children: /*#__PURE__*/ _jsx(ChevronLeft, {
                                                    className: "h-5 w-5"
                                                })
                                            }),
                                            /*#__PURE__*/ _jsx("button", {
                                                onClick: nextSlide,
                                                className: "absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 backdrop-blur-sm p-2 text-blue-600 hover:bg-white transition-colors shadow-lg z-10",
                                                "aria-label": "Next slide",
                                                children: /*#__PURE__*/ _jsx(ChevronRight, {
                                                    className: "h-5 w-5"
                                                })
                                            }),
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10",
                                                children: Array.from({
                                                    length: bannerCount
                                                }).map((_, i)=>/*#__PURE__*/ _jsx("button", {
                                                        onClick: ()=>setCurrentSlide(i),
                                                        className: `h-2 rounded-full transition-all ${i === currentSlide ? "w-8 bg-white" : "w-2 bg-white/50"}`,
                                                        "aria-label": `Go to slide ${i + 1}`
                                                    }, i))
                                            })
                                        ]
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsxs("div", {
                                className: "hidden lg:flex flex-col gap-4",
                                children: [
                                    /*#__PURE__*/ _jsx(Link, {
                                        href: "/products?sortBy=popular",
                                        className: "group flex-1 rounded-lg bg-white p-5 hover:shadow-lg transition-all border border-gray-200",
                                        children: /*#__PURE__*/ _jsxs("div", {
                                            className: "flex items-center gap-3",
                                            children: [
                                                /*#__PURE__*/ _jsx("div", {
                                                    className: "flex h-12 w-12 items-center justify-center rounded-lg bg-red-50",
                                                    children: /*#__PURE__*/ _jsx(Zap, {
                                                        className: "h-6 w-6 text-red-600"
                                                    })
                                                }),
                                                /*#__PURE__*/ _jsxs("div", {
                                                    children: [
                                                        /*#__PURE__*/ _jsx("span", {
                                                            className: "text-sm font-bold text-gray-900",
                                                            children: "Flash Sale"
                                                        }),
                                                        /*#__PURE__*/ _jsx("p", {
                                                            className: "text-xs text-gray-500",
                                                            children: "Diskon hingga 70%"
                                                        })
                                                    ]
                                                })
                                            ]
                                        })
                                    }),
                                    /*#__PURE__*/ _jsx(Link, {
                                        href: "/services?sortBy=rating",
                                        className: "group flex-1 rounded-lg bg-white p-5 hover:shadow-lg transition-all border border-gray-200",
                                        children: /*#__PURE__*/ _jsxs("div", {
                                            className: "flex items-center gap-3",
                                            children: [
                                                /*#__PURE__*/ _jsx("div", {
                                                    className: "flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-50",
                                                    children: /*#__PURE__*/ _jsx(Star, {
                                                        className: "h-6 w-6 text-yellow-600 fill-yellow-600"
                                                    })
                                                }),
                                                /*#__PURE__*/ _jsxs("div", {
                                                    children: [
                                                        /*#__PURE__*/ _jsx("span", {
                                                            className: "text-sm font-bold text-gray-900",
                                                            children: "Top Rated"
                                                        }),
                                                        /*#__PURE__*/ _jsx("p", {
                                                            className: "text-xs text-gray-500",
                                                            children: "Jasa terbaik"
                                                        })
                                                    ]
                                                })
                                            ]
                                        })
                                    }),
                                    /*#__PURE__*/ _jsx(Link, {
                                        href: "/jobs",
                                        className: "group flex-1 rounded-lg bg-white p-5 hover:shadow-lg transition-all border border-gray-200",
                                        children: /*#__PURE__*/ _jsxs("div", {
                                            className: "flex items-center gap-3",
                                            children: [
                                                /*#__PURE__*/ _jsx("div", {
                                                    className: "flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50",
                                                    children: /*#__PURE__*/ _jsx(Briefcase, {
                                                        className: "h-6 w-6 text-blue-600"
                                                    })
                                                }),
                                                /*#__PURE__*/ _jsxs("div", {
                                                    children: [
                                                        /*#__PURE__*/ _jsx("span", {
                                                            className: "text-sm font-bold text-gray-900",
                                                            children: "Job Board"
                                                        }),
                                                        /*#__PURE__*/ _jsx("p", {
                                                            className: "text-xs text-gray-500",
                                                            children: "Cari pekerjaan"
                                                        })
                                                    ]
                                                })
                                            ]
                                        })
                                    })
                                ]
                            })
                        ]
                    })
                })
            }),
            /*#__PURE__*/ _jsx("section", {
                className: "bg-white border-b border-gray-200 py-4",
                children: /*#__PURE__*/ _jsx("div", {
                    className: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
                    children: /*#__PURE__*/ _jsxs("form", {
                        onSubmit: (e)=>{
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const q = formData.get("q")?.trim();
                            const type = formData.get("type");
                            if (q) {
                                window.location.href = `/${type}?search=${encodeURIComponent(q)}`;
                            }
                        },
                        className: "flex items-center gap-2 max-w-2xl mx-auto",
                        children: [
                            /*#__PURE__*/ _jsxs("select", {
                                name: "type",
                                className: "shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500",
                                children: [
                                    /*#__PURE__*/ _jsx("option", {
                                        value: "products",
                                        children: "Produk"
                                    }),
                                    /*#__PURE__*/ _jsx("option", {
                                        value: "services",
                                        children: "Jasa"
                                    }),
                                    /*#__PURE__*/ _jsx("option", {
                                        value: "jobs",
                                        children: "Cari Vendor"
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsx("input", {
                                name: "q",
                                type: "text",
                                placeholder: "Cari produk, jasa, atau vendor...",
                                className: "flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            }),
                            /*#__PURE__*/ _jsx("button", {
                                type: "submit",
                                className: "shrink-0 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors",
                                children: "Cari"
                            })
                        ]
                    })
                })
            }),
            /*#__PURE__*/ _jsx("section", {
                className: "bg-white border-y border-gray-200",
                children: /*#__PURE__*/ _jsx("div", {
                    className: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
                    children: /*#__PURE__*/ _jsx("div", {
                        className: "grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200",
                        children: [
                            {
                                icon: Truck,
                                label: "Pengiriman Instan",
                                sub: "Produk digital langsung"
                            },
                            {
                                icon: Shield,
                                label: "Pembayaran Aman",
                                sub: "Transaksi terjamin"
                            },
                            {
                                icon: Clock,
                                label: "Layanan 24/7",
                                sub: "Bantuan kapan saja"
                            },
                            {
                                icon: Headphones,
                                label: "Support Responsif",
                                sub: "Tim siap membantu"
                            }
                        ].map((item, i)=>/*#__PURE__*/ _jsxs("div", {
                                className: "flex items-center justify-center gap-3 py-5 px-4",
                                children: [
                                    /*#__PURE__*/ _jsx(item.icon, {
                                        className: "h-8 w-8 text-blue-600 shrink-0"
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        children: [
                                            /*#__PURE__*/ _jsx("p", {
                                                className: "text-sm font-semibold text-gray-900",
                                                children: item.label
                                            }),
                                            /*#__PURE__*/ _jsx("p", {
                                                className: "text-xs text-gray-500",
                                                children: item.sub
                                            })
                                        ]
                                    })
                                ]
                            }, i))
                    })
                })
            }),
            /*#__PURE__*/ _jsx("section", {
                className: "bg-white border-b border-gray-100",
                children: /*#__PURE__*/ _jsx("div", {
                    className: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3",
                    children: /*#__PURE__*/ _jsxs("div", {
                        className: "flex items-center gap-3 flex-wrap",
                        children: [
                            /*#__PURE__*/ _jsxs("div", {
                                className: "flex items-center gap-2 text-sm font-semibold text-gray-700",
                                children: [
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50",
                                        children: /*#__PURE__*/ _jsx(MapPin, {
                                            className: "h-4 w-4 text-blue-600"
                                        })
                                    }),
                                    /*#__PURE__*/ _jsx("span", {
                                        children: "Lokasi Anda"
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsxs("select", {
                                value: selectedCity,
                                onChange: (e)=>handleCityChange(e.target.value),
                                disabled: loadingCities,
                                className: "rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                                children: [
                                    /*#__PURE__*/ _jsx("option", {
                                        value: "",
                                        children: "\uD83D\uDCCD Semua Kota"
                                    }),
                                    loadingCities ? /*#__PURE__*/ _jsx("option", {
                                        disabled: true,
                                        children: "Memuat data kota..."
                                    }) : cityList.length === 0 ? /*#__PURE__*/ _jsx("option", {
                                        disabled: true,
                                        children: "Data kota tidak tersedia"
                                    }) : cityList.map((city)=>/*#__PURE__*/ _jsx("option", {
                                            value: city,
                                            children: city
                                        }, city))
                                ]
                            }),
                            selectedCity && /*#__PURE__*/ _jsx("button", {
                                onClick: ()=>handleCityChange(""),
                                className: "flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors",
                                children: "✕ Reset lokasi"
                            }),
                            selectedCity && /*#__PURE__*/ _jsxs("span", {
                                className: "ml-auto text-xs text-gray-400",
                                children: [
                                    "Menampilkan produk & toko di ",
                                    /*#__PURE__*/ _jsx("span", {
                                        className: "font-semibold text-gray-600",
                                        children: selectedCity
                                    })
                                ]
                            })
                        ]
                    })
                })
            }),
            selectedCity && /*#__PURE__*/ _jsx("section", {
                className: "mt-2",
                children: /*#__PURE__*/ _jsx("div", {
                    className: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
                    children: /*#__PURE__*/ _jsxs("div", {
                        className: "bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-lg overflow-hidden",
                        children: [
                            /*#__PURE__*/ _jsxs("div", {
                                className: "flex items-center justify-between px-6 py-4",
                                children: [
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "flex items-center gap-3",
                                        children: [
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm",
                                                children: /*#__PURE__*/ _jsx(Store, {
                                                    className: "h-5 w-5 text-white"
                                                })
                                            }),
                                            /*#__PURE__*/ _jsxs("div", {
                                                children: [
                                                    /*#__PURE__*/ _jsxs("h2", {
                                                        className: "text-lg font-bold text-white",
                                                        children: [
                                                            "Toko di ",
                                                            selectedCity
                                                        ]
                                                    }),
                                                    /*#__PURE__*/ _jsx("p", {
                                                        className: "text-xs text-emerald-100",
                                                        children: "Seller terdekat di kotamu"
                                                    })
                                                ]
                                            })
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs(Link, {
                                        href: `/services?city=${encodeURIComponent(selectedCity)}`,
                                        className: "group hidden sm:flex items-center gap-1 rounded-lg bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-all",
                                        children: [
                                            "Lihat Semua",
                                            /*#__PURE__*/ _jsx(ChevronRight, {
                                                className: "h-4 w-4 group-hover:translate-x-0.5 transition-transform"
                                            })
                                        ]
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsx("div", {
                                className: "bg-emerald-600/50 px-6 py-4",
                                children: loadingNearby ? /*#__PURE__*/ _jsx("div", {
                                    className: "flex items-center justify-center py-8",
                                    children: /*#__PURE__*/ _jsx(Spinner, {})
                                }) : nearbySellers.length > 0 ? /*#__PURE__*/ _jsx("div", {
                                    className: "flex gap-3 overflow-x-auto pb-2 scrollbar-hide",
                                    children: nearbySellers.map((seller)=>/*#__PURE__*/ _jsxs(Link, {
                                            href: getSubdomainLink(seller.subdomain),
                                            className: "group shrink-0 w-48 rounded-xl bg-white p-4 hover:shadow-xl transition-all duration-300 hover:-translate-y-1",
                                            children: [
                                                /*#__PURE__*/ _jsxs("div", {
                                                    className: "flex items-center gap-3 mb-3",
                                                    children: [
                                                        /*#__PURE__*/ _jsx("div", {
                                                            className: "h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0 overflow-hidden",
                                                            children: seller.logo ? /*#__PURE__*/ _jsx(Image, {
                                                                src: seller.logo,
                                                                alt: seller.name,
                                                                width: 40,
                                                                height: 40,
                                                                className: "rounded-full object-cover"
                                                            }) : seller.name?.charAt(0)?.toUpperCase() || "S"
                                                        }),
                                                        /*#__PURE__*/ _jsxs("div", {
                                                            className: "min-w-0",
                                                            children: [
                                                                /*#__PURE__*/ _jsx("p", {
                                                                    className: "text-sm font-bold text-gray-900 truncate group-hover:text-emerald-600 transition-colors",
                                                                    children: seller.name
                                                                }),
                                                                seller.isVerified && /*#__PURE__*/ _jsx("span", {
                                                                    className: "inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600",
                                                                    children: "✓ Verified"
                                                                })
                                                            ]
                                                        })
                                                    ]
                                                }),
                                                /*#__PURE__*/ _jsxs("div", {
                                                    className: "flex items-center gap-1 text-xs text-gray-500",
                                                    children: [
                                                        /*#__PURE__*/ _jsx(MapPin, {
                                                            className: "h-3 w-3"
                                                        }),
                                                        /*#__PURE__*/ _jsx("span", {
                                                            className: "truncate",
                                                            children: seller.city || selectedCity
                                                        })
                                                    ]
                                                }),
                                                /*#__PURE__*/ _jsxs("div", {
                                                    className: "mt-1 flex items-center gap-1 text-xs text-gray-500",
                                                    children: [
                                                        /*#__PURE__*/ _jsx(Star, {
                                                            className: `h-3 w-3 ${(seller.owner?.sellerProfile?.totalReviews ?? 0) > 0 ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`
                                                        }),
                                                        (seller.owner?.sellerProfile?.totalReviews ?? 0) > 0 ? `${Number(seller.owner?.sellerProfile?.averageRating ?? 0).toFixed(1)} (${seller.owner?.sellerProfile?.totalReviews} ulasan)` : "Belum ada ulasan"
                                                    ]
                                                }),
                                                seller.description && /*#__PURE__*/ _jsx("p", {
                                                    className: "mt-2 text-[11px] text-gray-400 line-clamp-2",
                                                    children: seller.description
                                                })
                                            ]
                                        }, seller.id || seller.subdomain))
                                }) : /*#__PURE__*/ _jsxs("div", {
                                    className: "py-6 text-center text-sm text-white/70",
                                    children: [
                                        "Belum ada toko di ",
                                        selectedCity,
                                        ". Jadilah yang pertama!"
                                    ]
                                })
                            })
                        ]
                    })
                })
            }),
            /*#__PURE__*/ _jsx(CategoryGrid, {
                categories: productCategories,
                type: "PRODUCT",
                title: "Kategori Produk",
                description: "Jelajahi berbagai kategori produk digital",
                viewAllHref: "/products"
            }),
            (flashSaleEvent || flashSaleItems.length > 0) && /*#__PURE__*/ _jsx("section", {
                className: "mt-2",
                children: /*#__PURE__*/ _jsx("div", {
                    className: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
                    children: /*#__PURE__*/ _jsxs("div", {
                        className: "bg-red-500 rounded-xl shadow-lg overflow-hidden",
                        children: [
                            /*#__PURE__*/ _jsxs("div", {
                                className: "flex items-center justify-between px-6 py-4",
                                children: [
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "flex items-center gap-4",
                                        children: [
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm animate-pulse",
                                                children: /*#__PURE__*/ _jsx(Zap, {
                                                    className: "h-6 w-6 text-white"
                                                })
                                            }),
                                            /*#__PURE__*/ _jsxs("div", {
                                                children: [
                                                    /*#__PURE__*/ _jsxs("h2", {
                                                        className: "text-xl font-bold text-white uppercase tracking-wide flex items-center gap-2",
                                                        children: [
                                                            flashSaleEvent?.name || "Flash Sale",
                                                            /*#__PURE__*/ _jsx("span", {
                                                                className: "inline-flex items-center rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white",
                                                                children: "HOT"
                                                            })
                                                        ]
                                                    }),
                                                    flashSaleEnded ? /*#__PURE__*/ _jsx("span", {
                                                        className: "text-sm font-semibold text-white/80",
                                                        children: "Sale telah berakhir"
                                                    }) : /*#__PURE__*/ _jsxs("div", {
                                                        className: "flex items-center gap-2 mt-1",
                                                        children: [
                                                            /*#__PURE__*/ _jsx("span", {
                                                                className: "text-xs text-white/90",
                                                                children: "Berakhir dalam:"
                                                            }),
                                                            /*#__PURE__*/ _jsxs("div", {
                                                                className: "flex items-center gap-1",
                                                                children: [
                                                                    /*#__PURE__*/ _jsx("span", {
                                                                        className: "bg-white text-red-600 rounded-md px-2 py-1 font-mono font-bold text-sm shadow-sm",
                                                                        children: flashCountdown.split(":")[0]
                                                                    }),
                                                                    /*#__PURE__*/ _jsx("span", {
                                                                        className: "text-white font-bold",
                                                                        children: ":"
                                                                    }),
                                                                    /*#__PURE__*/ _jsx("span", {
                                                                        className: "bg-white text-red-600 rounded-md px-2 py-1 font-mono font-bold text-sm shadow-sm",
                                                                        children: flashCountdown.split(":")[1]
                                                                    }),
                                                                    /*#__PURE__*/ _jsx("span", {
                                                                        className: "text-white font-bold",
                                                                        children: ":"
                                                                    }),
                                                                    /*#__PURE__*/ _jsx("span", {
                                                                        className: "bg-white text-red-600 rounded-md px-2 py-1 font-mono font-bold text-sm shadow-sm",
                                                                        children: flashCountdown.split(":")[2]
                                                                    })
                                                                ]
                                                            })
                                                        ]
                                                    })
                                                ]
                                            })
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs(Link, {
                                        href: "/products?sortBy=popular",
                                        className: "group hidden sm:flex items-center gap-1 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-gray-50 transition-all shadow-md",
                                        children: [
                                            "Lihat Semua",
                                            /*#__PURE__*/ _jsx(ChevronRight, {
                                                className: "h-4 w-4 group-hover:translate-x-0.5 transition-transform"
                                            })
                                        ]
                                    })
                                ]
                            }),
                            isLoading ? /*#__PURE__*/ _jsx("div", {
                                className: "flex items-center justify-center py-12 bg-red-600",
                                children: /*#__PURE__*/ _jsx(Spinner, {})
                            }) : flashSaleItems.length > 0 ? /*#__PURE__*/ _jsx("div", {
                                className: "bg-red-600 px-6 py-4",
                                children: /*#__PURE__*/ _jsx("div", {
                                    className: "flex gap-3 overflow-x-auto pb-2 scrollbar-hide",
                                    children: flashSaleItems.map((item)=>{
                                        if (item.product) {
                                            const flashProduct = {
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
                                                updatedAt: ""
                                            };
                                            return /*#__PURE__*/ _jsx("div", {
                                                className: "w-40 sm:w-44 shrink-0 transform hover:scale-105 transition-transform duration-300",
                                                children: /*#__PURE__*/ _jsx(ProductCard, {
                                                    product: flashProduct
                                                })
                                            }, item.id);
                                        }
                                        if (item.service) {
                                            const flashService = {
                                                ...item.service,
                                                basePrice: item.salePrice,
                                                comparePrice: item.originalPrice
                                            };
                                            return /*#__PURE__*/ _jsx("div", {
                                                className: "w-40 sm:w-44 shrink-0 transform hover:scale-105 transition-transform duration-300",
                                                children: /*#__PURE__*/ _jsx(ServiceCard, {
                                                    service: flashService
                                                })
                                            }, item.id);
                                        }
                                        return null;
                                    })
                                })
                            }) : /*#__PURE__*/ _jsx("div", {
                                className: "py-8 text-center text-sm text-white/70 bg-red-600",
                                children: "Belum ada item flash sale"
                            })
                        ]
                    })
                })
            }),
            /*#__PURE__*/ _jsx("section", {
                className: "mt-6 mb-6",
                children: /*#__PURE__*/ _jsxs("div", {
                    className: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
                    children: [
                        /*#__PURE__*/ _jsx("div", {
                            className: "bg-blue-600 rounded-t-xl shadow-md",
                            children: /*#__PURE__*/ _jsxs("div", {
                                className: "flex items-center justify-between px-6 py-4",
                                children: [
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "flex items-center gap-3",
                                        children: [
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm",
                                                children: /*#__PURE__*/ _jsx(ShoppingBag, {
                                                    className: "h-5 w-5 text-white"
                                                })
                                            }),
                                            /*#__PURE__*/ _jsxs("div", {
                                                children: [
                                                    /*#__PURE__*/ _jsx("h2", {
                                                        className: "text-lg font-bold text-white",
                                                        children: "Produk Untuk Anda"
                                                    }),
                                                    /*#__PURE__*/ _jsx("p", {
                                                        className: "text-xs text-blue-100",
                                                        children: "Pilihan terbaik hari ini"
                                                    })
                                                ]
                                            })
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs(Link, {
                                        href: "/products",
                                        className: "group flex items-center gap-1 rounded-lg bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-all",
                                        children: [
                                            "Lihat Semua",
                                            /*#__PURE__*/ _jsx(ChevronRight, {
                                                className: "h-4 w-4 group-hover:translate-x-0.5 transition-transform"
                                            })
                                        ]
                                    })
                                ]
                            })
                        }),
                        isLoading ? /*#__PURE__*/ _jsx("div", {
                            className: "flex items-center justify-center py-16 bg-white rounded-b-xl shadow-md",
                            children: /*#__PURE__*/ _jsx(Spinner, {})
                        }) : products.length > 0 ? /*#__PURE__*/ _jsx("div", {
                            className: "bg-white rounded-b-xl shadow-md p-4",
                            children: /*#__PURE__*/ _jsx("div", {
                                className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4",
                                children: products.map((product)=>/*#__PURE__*/ _jsx("div", {
                                        className: "group",
                                        children: /*#__PURE__*/ _jsx(ProductCard, {
                                            product: product
                                        })
                                    }, product.id))
                            })
                        }) : /*#__PURE__*/ _jsx("div", {
                            className: "bg-white rounded-b-xl shadow-md py-12 text-center text-sm text-gray-400",
                            children: "Belum ada produk"
                        }),
                        products.length > 0 && /*#__PURE__*/ _jsx("div", {
                            className: "mt-6 text-center",
                            children: /*#__PURE__*/ _jsxs(Link, {
                                href: "/products",
                                className: "group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-700 hover:shadow-xl hover:scale-105 transition-all duration-300",
                                children: [
                                    "Lihat Semua Produk",
                                    /*#__PURE__*/ _jsx(ArrowRight, {
                                        className: "h-4 w-4 group-hover:translate-x-1 transition-transform"
                                    })
                                ]
                            })
                        })
                    ]
                })
            }),
            /*#__PURE__*/ _jsx("div", {
                className: "h-3 bg-gray-100"
            }),
            /*#__PURE__*/ _jsx(CategoryGrid, {
                categories: serviceCategories,
                type: "SERVICE",
                title: "Kategori Jasa",
                description: "Temukan jasa profesional untuk kebutuhan Anda",
                viewAllHref: "/services"
            }),
            /*#__PURE__*/ _jsx("section", {
                className: "mt-6 mb-6",
                children: /*#__PURE__*/ _jsxs("div", {
                    className: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
                    children: [
                        /*#__PURE__*/ _jsx("div", {
                            className: "bg-purple-600 rounded-t-xl shadow-md",
                            children: /*#__PURE__*/ _jsxs("div", {
                                className: "flex items-center justify-between px-6 py-4",
                                children: [
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "flex items-center gap-3",
                                        children: [
                                            /*#__PURE__*/ _jsx("div", {
                                                className: "flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm",
                                                children: /*#__PURE__*/ _jsx(Briefcase, {
                                                    className: "h-5 w-5 text-white"
                                                })
                                            }),
                                            /*#__PURE__*/ _jsxs("div", {
                                                children: [
                                                    /*#__PURE__*/ _jsx("h2", {
                                                        className: "text-lg font-bold text-white",
                                                        children: "Jasa Untuk Anda"
                                                    }),
                                                    /*#__PURE__*/ _jsx("p", {
                                                        className: "text-xs text-purple-100",
                                                        children: "Freelancer terbaik siap membantu"
                                                    })
                                                ]
                                            })
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs(Link, {
                                        href: "/services",
                                        className: "group flex items-center gap-1 rounded-lg bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-all",
                                        children: [
                                            "Lihat Semua",
                                            /*#__PURE__*/ _jsx(ChevronRight, {
                                                className: "h-4 w-4 group-hover:translate-x-0.5 transition-transform"
                                            })
                                        ]
                                    })
                                ]
                            })
                        }),
                        isLoading ? /*#__PURE__*/ _jsx("div", {
                            className: "flex items-center justify-center py-16 bg-white rounded-b-xl shadow-md",
                            children: /*#__PURE__*/ _jsx(Spinner, {})
                        }) : services.length > 0 ? /*#__PURE__*/ _jsx("div", {
                            className: "bg-white rounded-b-xl shadow-md p-4",
                            children: /*#__PURE__*/ _jsx("div", {
                                className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4",
                                children: services.map((service)=>/*#__PURE__*/ _jsx("div", {
                                        className: "group",
                                        children: /*#__PURE__*/ _jsx(ServiceCard, {
                                            service: service
                                        })
                                    }, service.id))
                            })
                        }) : /*#__PURE__*/ _jsx("div", {
                            className: "bg-white rounded-b-xl shadow-md py-12 text-center text-sm text-gray-400",
                            children: "Belum ada jasa"
                        }),
                        services.length > 0 && /*#__PURE__*/ _jsx("div", {
                            className: "mt-6 text-center",
                            children: /*#__PURE__*/ _jsxs(Link, {
                                href: "/services",
                                className: "group inline-flex items-center gap-2 rounded-xl bg-purple-600 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:bg-purple-700 hover:shadow-xl hover:scale-105 transition-all duration-300",
                                children: [
                                    "Lihat Semua Jasa",
                                    /*#__PURE__*/ _jsx(ArrowRight, {
                                        className: "h-4 w-4 group-hover:translate-x-1 transition-transform"
                                    })
                                ]
                            })
                        })
                    ]
                })
            }),
            faqs.length > 0 && /*#__PURE__*/ _jsx("section", {
                className: "mt-8 mb-6",
                children: /*#__PURE__*/ _jsxs("div", {
                    className: "mx-auto max-w-4xl px-4 sm:px-6 lg:px-8",
                    children: [
                        /*#__PURE__*/ _jsxs("div", {
                            className: "text-center mb-8",
                            children: [
                                /*#__PURE__*/ _jsxs("div", {
                                    className: "inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 mb-3",
                                    children: [
                                        /*#__PURE__*/ _jsx(HelpCircle, {
                                            className: "h-4 w-4 text-blue-600"
                                        }),
                                        /*#__PURE__*/ _jsx("span", {
                                            className: "text-sm font-semibold text-blue-600",
                                            children: "Pertanyaan Umum"
                                        })
                                    ]
                                }),
                                /*#__PURE__*/ _jsx("h2", {
                                    className: "text-2xl font-bold text-gray-900",
                                    children: "Frequently Asked Questions"
                                }),
                                /*#__PURE__*/ _jsx("p", {
                                    className: "mt-2 text-sm text-gray-500",
                                    children: "Temukan jawaban untuk pertanyaan yang sering ditanyakan"
                                })
                            ]
                        }),
                        /*#__PURE__*/ _jsx("div", {
                            className: "space-y-3",
                            children: faqs.map((faq)=>/*#__PURE__*/ _jsxs("div", {
                                    className: "rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow",
                                    children: [
                                        /*#__PURE__*/ _jsxs("button", {
                                            onClick: ()=>setExpandedFaq(expandedFaq === faq.id ? null : faq.id),
                                            className: "w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors",
                                            children: [
                                                /*#__PURE__*/ _jsx("span", {
                                                    className: "text-sm font-semibold text-gray-900 pr-4",
                                                    children: faq.question
                                                }),
                                                /*#__PURE__*/ _jsx(ChevronRight, {
                                                    className: `h-5 w-5 text-gray-400 shrink-0 transition-transform ${expandedFaq === faq.id ? "rotate-90" : ""}`
                                                })
                                            ]
                                        }),
                                        expandedFaq === faq.id && /*#__PURE__*/ _jsx("div", {
                                            className: "px-6 pb-4 pt-2 border-t border-gray-100",
                                            children: /*#__PURE__*/ _jsx(SafeHtml, {
                                                html: faq.answer || "",
                                                className: "text-sm text-gray-600"
                                            })
                                        })
                                    ]
                                }, faq.id))
                        }),
                        /*#__PURE__*/ _jsx("div", {
                            className: "mt-6 text-center",
                            children: /*#__PURE__*/ _jsxs("p", {
                                className: "text-sm text-gray-500",
                                children: [
                                    "Masih ada pertanyaan?",
                                    " ",
                                    /*#__PURE__*/ _jsx(Link, {
                                        href: "/faq",
                                        className: "font-semibold text-blue-600 hover:text-blue-700",
                                        children: "Lihat semua FAQ"
                                    })
                                ]
                            })
                        })
                    ]
                })
            }),
            /*#__PURE__*/ _jsx("section", {
                className: "mt-8 mb-6",
                children: /*#__PURE__*/ _jsx("div", {
                    className: "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
                    children: /*#__PURE__*/ _jsxs("div", {
                        className: "relative overflow-hidden rounded-2xl bg-blue-600 shadow-2xl",
                        children: [
                            /*#__PURE__*/ _jsxs("div", {
                                className: "absolute inset-0 opacity-10",
                                children: [
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32"
                                    }),
                                    /*#__PURE__*/ _jsx("div", {
                                        className: "absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full -ml-32 -mb-32"
                                    })
                                ]
                            }),
                            /*#__PURE__*/ _jsxs("div", {
                                className: "relative flex flex-col sm:flex-row items-center justify-between gap-6 px-8 py-10 sm:py-12",
                                children: [
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "text-center sm:text-left",
                                        children: [
                                            /*#__PURE__*/ _jsxs("div", {
                                                className: "inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-1.5 mb-3",
                                                children: [
                                                    /*#__PURE__*/ _jsx(Star, {
                                                        className: "h-4 w-4 text-yellow-300 fill-yellow-300"
                                                    }),
                                                    /*#__PURE__*/ _jsx("span", {
                                                        className: "text-xs font-semibold text-white",
                                                        children: "Bergabung dengan ribuan seller sukses"
                                                    })
                                                ]
                                            }),
                                            /*#__PURE__*/ _jsx("h2", {
                                                className: "text-2xl font-bold text-white sm:text-3xl",
                                                children: "Punya Keahlian? Mulai Jual di Plazo!"
                                            }),
                                            /*#__PURE__*/ _jsx("p", {
                                                className: "mt-2 text-sm text-blue-50 max-w-xl",
                                                children: "Buka toko online gratis, jangkau ribuan pembeli, dan mulai dapatkan penghasilan dari keahlian Anda hari ini."
                                            }),
                                            /*#__PURE__*/ _jsxs("div", {
                                                className: "mt-4 flex flex-wrap items-center gap-4 text-sm text-blue-50",
                                                children: [
                                                    /*#__PURE__*/ _jsxs("div", {
                                                        className: "flex items-center gap-1.5",
                                                        children: [
                                                            /*#__PURE__*/ _jsx(Shield, {
                                                                className: "h-4 w-4"
                                                            }),
                                                            /*#__PURE__*/ _jsx("span", {
                                                                children: "Gratis selamanya"
                                                            })
                                                        ]
                                                    }),
                                                    /*#__PURE__*/ _jsxs("div", {
                                                        className: "flex items-center gap-1.5",
                                                        children: [
                                                            /*#__PURE__*/ _jsx(Zap, {
                                                                className: "h-4 w-4"
                                                            }),
                                                            /*#__PURE__*/ _jsx("span", {
                                                                children: "Setup 5 menit"
                                                            })
                                                        ]
                                                    })
                                                ]
                                            })
                                        ]
                                    }),
                                    /*#__PURE__*/ _jsxs("div", {
                                        className: "flex flex-col sm:flex-row items-center gap-3 shrink-0",
                                        children: [
                                            /*#__PURE__*/ _jsx(Link, {
                                                href: "/register?role=SELLER",
                                                className: "group w-full sm:w-auto rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-blue-600 hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl hover:scale-105 duration-300",
                                                children: /*#__PURE__*/ _jsxs("span", {
                                                    className: "flex items-center gap-2",
                                                    children: [
                                                        "Daftar sebagai Seller",
                                                        /*#__PURE__*/ _jsx(ArrowRight, {
                                                            className: "h-4 w-4 group-hover:translate-x-1 transition-transform"
                                                        })
                                                    ]
                                                })
                                            }),
                                            /*#__PURE__*/ _jsx(Link, {
                                                href: "/register",
                                                className: "w-full sm:w-auto rounded-xl border-2 border-white/40 bg-transparent px-8 py-3.5 text-sm font-bold text-white hover:bg-white/10 transition-all",
                                                children: "Daftar sebagai Buyer"
                                            })
                                        ]
                                    })
                                ]
                            })
                        ]
                    })
                })
            }),
            /*#__PURE__*/ _jsx(ReportFloat, {})
        ]
    });
}