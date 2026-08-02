"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { marketplaceApi } from "@/services/marketplace.service";
import { chatApi } from "@/services/chat.service";
import { getSubdomainLink, getSubdomainUrl } from "@/lib/domain";
import { createWhatsAppCheckoutUrl } from "@/lib/whatsapp-checkout";
import { useCurrentPageUrl } from "@/hooks/use-current-page-url";
import { useAuthStore } from "@/stores/auth.store";
import { formatPrice, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SafeHtml } from "@/components/ui/safe-html";
import { ShareButton } from "@/components/shared/share-button";
import type { ServicePackage, Service } from "@/types";
import {
  Star,
  Store,
  ArrowLeft,
  Clock,
  RotateCcw,
  Check,
  Briefcase,
  CheckCircle,
  Tag,
  MessageCircle,
  Phone,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from "lucide-react";
import { ReviewSection } from "@/components/review-section";
import toast from "react-hot-toast";

interface ServiceTenant {
  id?: string;
  name: string;
  subdomain: string;
  logo?: string;
  isVerified?: boolean;
  contactWhatsapp?: string;
  subscriptionPlan?: string;
  owner?: { id: string };
}

interface ServiceDetail extends Omit<Service, "tenant"> {
  tenant?: ServiceTenant;
}

const TIER_LABELS: Record<string, string> = {
  BASIC: "Basic",
  STANDARD: "Standard",
  PREMIUM: "Premium",
};

const TIER_COLORS: Record<string, string> = {
  BASIC: "border-gray-200",
  STANDARD: "border-blue-500 ring-1 ring-blue-500",
  PREMIUM: "border-yellow-500 ring-1 ring-yellow-500",
};

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { isAuthenticated, user } = useAuthStore();
  const currentPageUrl = useCurrentPageUrl();

  const [service, setService] = useState<ServiceDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState("BASIC");
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    const fetchService = async () => {
      setIsLoading(true);
      try {
        const { data } = await marketplaceApi.getServiceBySlug(slug);
        const raw = data as Record<string, unknown>;
        const svc = (raw?.service || data) as ServiceDetail;
        if (!svc) {
          router.push("/services");
          return;
        }

        setService(svc);
        if (svc.packages?.length) {
          setSelectedTier(svc.packages[0].tier);
        }

        // Track view
        marketplaceApi.trackServiceView(svc.id).catch(() => {});
      } catch {
        router.push("/services");
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) fetchService();
  }, [slug, router]);

  const handleContactSeller = async () => {
    if (!service?.tenant?.owner?.id || !service?.tenant?.id) {
      toast.error("Data toko belum lengkap");
      return;
    }
    if (!isAuthenticated) {
      toast.error("Silakan login terlebih dahulu");
      router.push(`/login?returnUrl=/services/${slug}`);
      return;
    }
    if (user?.id === service.tenant.owner.id) {
      toast.error("Anda tidak bisa menghubungi toko milik sendiri");
      return;
    }

    const selectedPackage = service.packages?.find((item) => item.tier === selectedTier);

    try {
      const { data } = await chatApi.openRoom({
        tenantId: service.tenant.id,
        targetUserId: service.tenant.owner.id,
        serviceId: service.id,
        itemTitle: service.name,
        packageTier: selectedPackage?.tier,
        packageTitle: selectedPackage?.title || selectedPackage?.tier,
        packagePrice: selectedPackage?.price,
        packageDescription: selectedPackage?.description,
      });
      const roomId = data?.room?.id;
      if (!roomId) throw new Error("Room tidak ditemukan");
      router.push(
        `${user?.role === "SELLER" ? "/seller/dashboard/chat" : "/dashboard/chat"}?room=${roomId}`,
      );
    } catch {
      toast.error("Gagal membuka chat");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!service) return null;

  const tenant = service.tenant;
  const packages: ServicePackage[] = service.packages || [];
  const selectedPackage = packages.find((item) => item.tier === selectedTier);
  const gallery = (() => {
    const images: string[] = [];
    if (service.thumbnail) images.push(service.thumbnail);
    if (service.gallery) {
      for (const img of service.gallery) {
        if (!images.includes(img)) images.push(img);
      }
    }
    return images;
  })();
  const canShowWhatsapp =
    !!tenant?.contactWhatsapp &&
    !!tenant.subscriptionPlan &&
    tenant.subscriptionPlan !== "FREE";
  const selectedPrice = selectedPackage?.price ?? service.basePrice;
  const buyerName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const whatsappHref = canShowWhatsapp
    ? createWhatsAppCheckoutUrl({
        phoneNumber: tenant.contactWhatsapp || "",
        buyerName,
        itemLabel: "Layanan",
        itemName: service.name,
        price: selectedPrice,
        optionLabel: selectedPackage ? "Paket" : undefined,
        optionValue: selectedPackage?.title || selectedPackage?.tier,
        itemUrl: currentPageUrl,
      })
    : "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/services" className="flex items-center gap-1 hover:text-blue-600">
          <ArrowLeft className="h-3.5 w-3.5" />
          Jasa
        </Link>
        {service.category && (
          <>
            {/* Show parent category if exists */}
            {service.category.parent && (
              <>
                <span>/</span>
                <Link
                  href={`/services?categorySlug=${service.category.parent.slug || service.category.parent.id}`}
                  className="hover:text-blue-600"
                >
                  {service.category.parent.name}
                </Link>
              </>
            )}
            {/* Show current category (could be parent or subcategory) */}
            <span>/</span>
            <Link
              href={`/services?categorySlug=${service.category.slug || service.category.id}`}
              className="hover:text-blue-600"
            >
              {service.category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="truncate text-gray-900">{service.name}</span>
      </nav>

      {tenant?.subdomain && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div>
            <p className="text-sm font-semibold text-blue-900">
              Layanan ini disediakan oleh toko {tenant.name}
            </p>
            <p className="text-xs text-blue-600">
              Anda bisa melihat profil toko atau langsung lanjutkan diskusi melalui chat.
            </p>
          </div>
          <Link
            href={getSubdomainLink(tenant.subdomain)}
            className="ml-4 shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Kunjungi Toko
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-gray-100">
            {gallery.length > 0 ? (
              <Image
                src={gallery[selectedImage]}
                alt={service.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 66vw"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Briefcase className="h-20 w-20 text-gray-300" />
              </div>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {gallery.map((img, index) => (
                <button
                  key={img + index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${
                    index === selectedImage ? "border-blue-500" : "border-gray-200"
                  }`}
                >
                  <Image src={img} alt="" fill className="object-cover" sizes="96px" />
                </button>
              ))}
            </div>
          )}

          <div className="mt-6">
            <h1 className="text-2xl font-bold leading-tight text-gray-900">{service.name}</h1>
            {tenant && (
              <Link
                href={getSubdomainLink(tenant.subdomain)}
                className="mt-3 flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
              >
                {tenant.logo ? (
                  <Image src={tenant.logo} alt={tenant.name} width={24} height={24} className="rounded-full" />
                ) : (
                  <Store className="h-5 w-5 text-gray-400" />
                )}
                <span className="font-medium">{tenant.name}</span>
                {tenant.isVerified && <CheckCircle className="h-3.5 w-3.5 text-blue-500" />}
              </Link>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{(service.averageRating ?? 0).toFixed(1)}</span>
                <span>({service.totalReviews ?? 0} ulasan)</span>
              </span>
              {(service.totalSales ?? 0) > 0 && <span>{service.totalSales} terjual</span>}
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {(service as any).viewCount ?? 0} dilihat
              </span>
            </div>
          </div>

          <div className="mt-6 border-t pt-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Tentang Layanan Ini</h2>
            <SafeHtml html={service.description} className="text-gray-600" />
          </div>

          {/* FAQ Section */}
          {service.faq && service.faq.length > 0 && (
            <div className="mt-6 border-t pt-6">
              <div className="mb-4 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Pertanyaan yang Sering Diajukan (FAQ)
                </h2>
              </div>
              <div className="space-y-3">
                {service.faq.map((item, index) => (
                  <FAQItem
                    key={index}
                    question={item.question}
                    answer={item.answer}
                    defaultOpen={index === 0}
                  />
                ))}
              </div>
            </div>
          )}

          {service.tags?.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-gray-400" />
              {service.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <p className="mt-4 text-xs text-gray-400">Ditambahkan pada {formatDate(service.createdAt)}</p>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <Button variant="outline" size="lg" onClick={handleContactSeller} className="w-full">
                <MessageCircle className="mr-2 h-4 w-4" />
                Hubungi Penjual
              </Button>
              {canShowWhatsapp && (
                <a href={whatsappHref} target="_blank" rel="noreferrer">
                  <Button size="lg" className="w-full bg-green-600 hover:bg-green-700">
                    <Phone className="mr-2 h-4 w-4" />
                    Checkout via WhatsApp
                  </Button>
                </a>
              )}
            </div>

            {/* Share Button */}
            <div className="mb-4">
              <ShareButton
              url={currentPageUrl}
                title={service.name}
                description={service.description?.substring(0, 160) || ""}
                image={service.thumbnail || service.gallery?.[0] || ""}
                variant="default"
                className="w-full justify-center"
              />
            </div>

            {packages.length > 0 ? (
              <>
                <div className="flex rounded-lg border border-gray-200 p-1">
                  {packages.map((item) => (
                    <button
                      key={item.tier}
                      onClick={() => setSelectedTier(item.tier)}
                      className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                        selectedTier === item.tier ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {TIER_LABELS[item.tier] || item.tier}
                    </button>
                  ))}
                </div>

                {selectedPackage && (
                  <div className={`mt-4 rounded-xl border-2 p-5 ${TIER_COLORS[selectedPackage.tier] || "border-gray-200"}`}>
                    <h3 className="text-lg font-bold text-gray-900">{selectedPackage.title}</h3>
                    <p className="mt-1 text-2xl font-bold text-blue-600">
                      {formatPrice(selectedPackage.price)}
                    </p>
                    <p className="mt-2 text-sm text-gray-600">{selectedPackage.description}</p>

                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>{selectedPackage.deliveryDays} hari pengerjaan</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 text-gray-400" />
                        <span>{selectedPackage.revisions} revisi</span>
                      </div>
                    </div>

                    {selectedPackage.features?.length > 0 && (
                      <div className="mt-4 space-y-1.5">
                        {selectedPackage.features.map((feature, index) => (
                          <div key={`${selectedPackage.tier}-${index}`} className="flex items-start gap-2 text-sm">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                            <span className="text-gray-700">{feature}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900">
                      Paket ini dapat langsung Anda diskusikan dengan seller lewat chat internal.
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border-2 border-gray-200 p-5">
                <p className="text-2xl font-bold text-blue-600">{formatPrice(service.basePrice)}</p>
                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900">
                  Layanan ini sekarang diproses lewat komunikasi langsung dengan seller.
                </div>
              </div>
            )}

            {tenant?.subdomain && (
              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="mb-2 text-xs text-gray-500">Layanan ini disediakan oleh</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {tenant.logo ? (
                      <Image src={tenant.logo} alt={tenant.name} width={32} height={32} className="rounded-full" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                        <Store className="h-4 w-4 text-blue-600" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{tenant.name}</p>
                      <p className="text-xs text-gray-400">{getSubdomainUrl(tenant.subdomain)}</p>
                    </div>
                  </div>
                  <Link
                    href={getSubdomainLink(tenant.subdomain)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Kunjungi Toko
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {service.id && <ReviewSection sellerId={tenant?.owner?.id} serviceId={service.id} />}
    </div>
  );
}

/**
 * FAQ Accordion Item Component
 */
function FAQItem({ 
  question, 
  answer, 
  defaultOpen = false 
}: { 
  question: string; 
  answer: string; 
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-900 text-sm">{question}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
        )}
      </button>
      {isOpen && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{answer}</p>
        </div>
      )}
    </div>
  );
}
