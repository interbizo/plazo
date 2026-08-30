"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Cpu,
  FileText,
  Globe2,
  GraduationCap,
  Heart,
  MessageCircle,
  Music,
  PenTool,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Truck,
  Zap,
} from "lucide-react";
import { marketplaceApi } from "@/services/marketplace.service";
import { ReportFloat } from "@/components/shared/report-float";

type LandingBenefit = { id?: string; label: string; title: string; description: string; icon: string; tone: string; sectionEyebrow?: string; sectionHeading?: string; sectionDescription?: string };
type LandingStep = { id?: string; title: string; description: string; icon: string; sectionEyebrow?: string; sectionHeading?: string; sectionDescription?: string };
type LandingAdvantage = { id?: string; title: string; description: string; sectionEyebrow?: string; sectionHeading?: string; sectionDescription?: string };
type LandingTestimonial = { id?: string; label?: string | null; title: string; description: string; sectionEyebrow?: string; sectionHeading?: string; sectionDescription?: string };
type LandingPlan = { id?: string; plan?: string; name: string; description?: string | null; badge?: string | null; monthlyPrice: number; currency?: string; features?: unknown };
type LandingFaq = { id?: string; question: string; answer: string };
type LandingHero = { id?: string; eyebrow: string; title: string; titleAccent: string; description: string };
type LandingSeller = { id?: string; name: string; logo?: string | null; subdomain?: string | null };
type CmsBanner = { id: string; title?: string | null; subtitle?: string | null; imageUrl?: string | null; linkUrl?: string | null; buttonText?: string | null; buttonUrl?: string | null };
type LandingContent = { hero: LandingHero; benefits: LandingBenefit[]; steps: LandingStep[]; advantages: LandingAdvantage[]; testimonials: LandingTestimonial[]; plans: LandingPlan[]; faqs: LandingFaq[] };
type LandingSectionCopy = { eyebrow: string; title: string; description: string };

const defaultSectionCopies = {
  benefits: { eyebrow: "Satu fondasi kerja", title: "Bukan sekadar halaman. Ini tempat bisnis Anda mulai terlihat utuh.", description: "Setiap bagian membantu pelanggan memahami bisnis Anda sebelum percakapan dimulai." },
  steps: { eyebrow: "Cara kerja", title: "Beri bisnis Anda jalur yang jelas untuk bergerak.", description: "Buat toko, susun penawaran, lalu ubah minat menjadi percakapan yang relevan." },
  advantages: { eyebrow: "Keunggulan Plazo", title: "Toko yang siap membantu bisnis terlihat serius.", description: "Ruang yang sederhana untuk mulai, tanpa memaksa bisnis Anda terlihat sama dengan yang lain." },
  testimonials: { eyebrow: "Testimoni", title: "Dibuat untuk bisnis yang ingin terlihat lebih siap.", description: "Cerita dari pemilik bisnis yang memakai toko sebagai titik awal percakapan dengan pelanggan." },
} satisfies Record<string, LandingSectionCopy>;

const defaultContent: LandingContent = {
  hero: {
    eyebrow: "Untuk bisnis produk dan jasa",
    title: "Buat toko.",
    titleAccent: "Beri bisnis Anda arah.",
    description: "Plazo menyatukan toko, katalog, dan percakapan pelanggan agar bisnis Anda hadir dengan lebih jelas sejak awal.",
  },
  benefits: [
    { icon: "Store", label: "Identitas bisnis", title: "Toko yang membawa nama brand Anda", description: "Tampilkan bisnis dengan ruang yang lebih meyakinkan daripada sekadar daftar tautan.", tone: "blue" },
    { icon: "Boxes", label: "Katalog siap pakai", title: "Produk dan jasa lebih mudah dipahami", description: "Susun penawaran agar calon pelanggan bisa melihat konteks sebelum menghubungi Anda.", tone: "sky" },
    { icon: "MessageCircle", label: "Percakapan terarah", title: "Pelanggan tahu harus mulai dari mana", description: "Lanjutkan minat menjadi percakapan tanpa memisahkan toko dari hubungan pelanggan.", tone: "indigo" },
    { icon: "BarChart3", label: "Satu fondasi", title: "Mulai sederhana, tetap siap berkembang", description: "Gunakan satu ruang untuk membangun kehadiran digital bisnis dengan lebih terarah.", tone: "cyan" },
  ],
  steps: [
    { icon: "Store", title: "Siapkan toko", description: "Atur identitas bisnis dan halaman yang siap menjadi pintu masuk pelanggan." },
    { icon: "Boxes", title: "Susun penawaran", description: "Tambahkan produk atau jasa dengan informasi yang membantu pelanggan memahami nilainya." },
    { icon: "MessageCircle", title: "Layani pelanggan", description: "Terima pertanyaan dan lanjutkan percakapan dari bisnis yang sudah terlihat siap." },
  ],
  advantages: [
    { title: "Mulai tanpa membangun website dari nol", description: "Gunakan toko yang jelas sebagai pondasi awal kehadiran digital bisnis Anda." },
    { title: "Katalog dan identitas hadir dalam satu pengalaman", description: "Produk, jasa, dan cerita bisnis tersusun konsisten untuk membangun kepercayaan." },
    { title: "Minat pelanggan dapat langsung menjadi percakapan", description: "Beri pelanggan jalur yang jelas dari melihat penawaran ke bertanya." },
    { title: "Cukup ringan untuk mulai, siap untuk bertumbuh", description: "Bangun proses bisnis secara bertahap tanpa menambah kerumitan sejak awal." },
  ],
  testimonials: [
    { title: "Nara Putri", label: "Pemilik Nara Studio", description: "Sekarang calon pelanggan langsung melihat katalog dan tahu harus menghubungi kami dari mana." },
    { title: "Raka Mahendra", label: "Pendiri Ruang Rupa", description: "Plazo membuat penawaran jasa kami lebih mudah dipahami tanpa harus membuat website dari awal." },
    { title: "Ayu Lestari", label: "Pemilik Kopi Kecil", description: "Kami bisa membagikan satu alamat toko yang rapi ketika mengenalkan bisnis ke pelanggan baru." },
  ],
  plans: [
    { plan: "FREE", name: "Gratis", description: "Untuk mulai membangun toko", monthlyPrice: 0, currency: "IDR", features: ["10 produk atau jasa", "Toko online", "Chat dengan pelanggan"] },
    { plan: "BASIC", name: "Basic", description: "Untuk bisnis yang mulai berkembang", badge: "Paling dipilih", monthlyPrice: 49000, currency: "IDR", features: ["50 produk atau jasa", "Publikasi marketplace", "Badge terverifikasi"] },
    { plan: "PREMIUM", name: "Premium", description: "Untuk bisnis yang butuh jangkauan lebih", monthlyPrice: 99000, currency: "IDR", features: ["100 produk atau jasa", "Analitik lanjutan", "Tema toko kustom"] },
  ],
  faqs: [
    { question: "Apa itu Plazo?", answer: "Plazo adalah ruang digital bagi bisnis untuk membuat toko, menyusun katalog produk atau jasa, dan menerima percakapan pelanggan." },
    { question: "Apakah saya harus bisa coding?", answer: "Tidak. Plazo memberi fondasi toko dan katalog agar Anda bisa mulai tanpa membangun website sendiri." },
    { question: "Apakah saya bisa menawarkan jasa?", answer: "Ya. Toko Plazo dirancang untuk produk maupun jasa profesional." },
  ],
};

const iconMap = { BarChart3, Boxes, Building2, Coffee, Cpu, FileText, Globe2, GraduationCap, Heart, MessageCircle, Music, PenTool, ShieldCheck, ShoppingBag, Sparkles, Star, Store, Truck, Zap };
const toneClasses: Record<string, string> = { blue: "bg-[rgb(var(--color-primary-rgb)/0.10)] text-[var(--color-primary)]", sky: "bg-[rgb(var(--color-primary-rgb)/0.14)] text-[var(--color-primary)]", indigo: "bg-[rgb(var(--color-primary-rgb)/0.18)] text-[var(--color-primary)]", cyan: "bg-[rgb(var(--color-primary-rgb)/0.22)] text-[var(--color-primary)]" };
const getIcon = (name: string) => iconMap[name as keyof typeof iconMap] || Sparkles;
const formatPlanPrice = (price: number, currency = "IDR") => price === 0 ? "Gratis" : new Intl.NumberFormat("id-ID", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
const getPlanFeatures = (features: unknown) => Array.isArray(features) ? features.filter((feature): feature is string => typeof feature === "string") : [];
const getInitials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
const getSectionCopy = (items: Array<{ sectionEyebrow?: string; sectionHeading?: string; sectionDescription?: string }>, key: keyof typeof defaultSectionCopies): LandingSectionCopy => {
  const copy = items[0];
  const fallback = defaultSectionCopies[key];
  return {
    eyebrow: copy?.sectionEyebrow || fallback.eyebrow,
    title: copy?.sectionHeading || fallback.title,
    description: copy?.sectionDescription || fallback.description,
  };
};

function StorePreview() {
  return (
    <div className="plazo-preview border border-slate-300 bg-white p-3 sm:p-5">
      <div className="border border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center bg-[var(--color-primary)] text-white"><Store className="h-4 w-4" /></span><div><p className="text-sm font-bold">Nara Studio</p><p className="text-[11px] text-slate-500">nama-bisnis.plazo.id</p></div></div>
          <span className="border border-[rgb(var(--color-primary-rgb)/0.22)] bg-[rgb(var(--color-primary-rgb)/0.08)] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)]">Toko aktif</span>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-[1.25fr_0.75fr]">
          <div className="bg-[var(--color-primary)] p-5 text-white"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">Tampilan toko</p><h2 className="mt-5 max-w-xs text-3xl font-semibold leading-tight tracking-[-0.045em]">Penawaran yang mudah dibaca pelanggan.</h2><div className="mt-8 flex items-center gap-2 text-xs text-slate-300"><Globe2 className="h-4 w-4 text-[rgb(var(--color-primary-rgb)/0.85)]" /> nama-bisnis.plazo.id</div></div>
          <div className="space-y-3"><div className="border border-slate-200 bg-white p-4"><div className="flex items-center justify-between text-xs font-bold"><span>Katalog</span><Boxes className="h-4 w-4 text-[var(--color-primary)]" /></div><div className="mt-4 h-2 w-4/5 bg-slate-200" /><div className="mt-2 h-2 w-3/5 bg-slate-100" /></div><div className="plazo-preview-message p-4"><div className="flex items-center justify-between text-xs font-bold text-slate-950"><span>Pesan baru</span><MessageCircle className="h-4 w-4 text-[var(--color-primary)]" /></div><p className="mt-3 text-sm font-semibold text-slate-950">Boleh konsultasi dulu?</p></div></div>
        </div>
        <div className="grid grid-cols-3 border-t border-slate-200 bg-white text-center text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500"><span className="border-r border-slate-200 px-2 py-3 text-[var(--color-primary)]">01 Toko</span><span className="border-r border-slate-200 px-2 py-3">02 Katalog</span><span className="px-2 py-3">03 Chat</span></div>
      </div>
    </div>
  );
}

function HeroBanner({ banners }: { banners: CmsBanner[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const banner = banners[currentIndex] || banners[0];

  useEffect(() => {
    setCurrentIndex((current) => Math.min(current, Math.max(banners.length - 1, 0)));
    if (banners.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setCurrentIndex((current) => (current + 1) % banners.length), 6000);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  if (!banner) return <StorePreview />;

  const goTo = (index: number) => setCurrentIndex((index + banners.length) % banners.length);

  return (
    <article className="relative min-h-[25rem] overflow-hidden border border-[rgb(var(--color-primary-rgb)/0.22)] bg-slate-950 text-white shadow-[10px_10px_0_0_rgb(var(--color-primary-rgb)/0.18)]">
      {banner.imageUrl && <Image key={banner.id} src={banner.imageUrl} alt={banner.title || "Banner Plazo"} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(15_23_42/0.78),rgb(15_23_42/0.30),transparent)]" />
      <div className="relative z-10 flex min-h-[25rem] max-w-md flex-col justify-end p-7 sm:p-10"><p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">Info dari Plazo</p><h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.05em] sm:text-4xl">{banner.title}</h2>{banner.subtitle && <p className="mt-4 leading-7 text-white/85">{banner.subtitle}</p>}{banner.buttonText && banner.buttonUrl && <Link href={banner.buttonUrl} className="mt-7 inline-flex w-fit min-h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-[var(--color-primary)] transition hover:-translate-y-0.5 hover:bg-white/90">{banner.buttonText}<ArrowRight className="h-4 w-4" /></Link>}</div>
      {banners.length > 1 && <>
        <button type="button" aria-label="Banner sebelumnya" onClick={() => goTo(currentIndex - 1)} className="absolute left-4 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/40 bg-slate-950/40 text-white backdrop-blur transition hover:bg-slate-950/70 sm:left-5"><ChevronLeft className="h-5 w-5" /></button>
        <button type="button" aria-label="Banner berikutnya" onClick={() => goTo(currentIndex + 1)} className="absolute right-4 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/40 bg-slate-950/40 text-white backdrop-blur transition hover:bg-slate-950/70 sm:right-5"><ChevronRight className="h-5 w-5" /></button>
        <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/25 bg-slate-950/40 px-3 py-2 backdrop-blur">
          {banners.map((item, index) => <button key={item.id} type="button" aria-label={"Tampilkan banner " + (index + 1)} aria-current={index === currentIndex} onClick={() => goTo(index)} className={"h-2.5 rounded-full transition " + (index === currentIndex ? "w-7 bg-white" : "w-2.5 bg-white/55 hover:bg-white/85")} />)}
        </div>
      </>}
    </article>
  );
}

export default function LandingPage() {
  const pageRef = useRef<HTMLElement>(null);
  const [content, setContent] = useState(defaultContent);
  const [sellerLogos, setSellerLogos] = useState<LandingSeller[]>([]);
  const [banners, setBanners] = useState<CmsBanner[]>([]);

  useEffect(() => {
    let active = true;
    marketplaceApi.getLandingContent().then(({ data }) => {
      if (!active) return;
      const raw = (data?.data || data) as Partial<LandingContent>;
      setContent((current) => ({
        hero: raw.hero ? { ...current.hero, ...raw.hero } : current.hero,
        benefits: Array.isArray(raw.benefits) && raw.benefits.length ? raw.benefits : current.benefits,
        steps: Array.isArray(raw.steps) && raw.steps.length ? raw.steps : current.steps,
        advantages: Array.isArray(raw.advantages) && raw.advantages.length ? raw.advantages : current.advantages,
        testimonials: Array.isArray(raw.testimonials) && raw.testimonials.length ? raw.testimonials : current.testimonials,
        plans: Array.isArray(raw.plans) && raw.plans.length ? raw.plans : current.plans,
        faqs: Array.isArray(raw.faqs) && raw.faqs.length ? raw.faqs : current.faqs,
      }));
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    marketplaceApi.getCmsBanners("homepage_hero").then(({ data }) => {
      if (!active) return;
      const raw = (data?.data || data) as CmsBanner[] | { banners?: CmsBanner[] };
      const banners = Array.isArray(raw) ? raw : Array.isArray(raw.banners) ? raw.banners : [];
      setBanners(banners);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    marketplaceApi.getSellers({ page: 1, limit: 12 }).then(({ data }) => {
      if (!active) return;
      const payload = (data?.data || data) as { data?: LandingSeller[] } | LandingSeller[];
      const sellers = Array.isArray(payload) ? payload : Array.isArray(payload.data) ? payload.data : [];
      setSellerLogos(sellers.filter((seller) => seller.name?.trim()));
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;

    const targets = Array.from(page.querySelectorAll<HTMLElement>("[data-plazo-reveal]"));
    const show = (target: HTMLElement) => target.classList.add("is-visible");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion || !("IntersectionObserver" in window)) {
      targets.forEach(show);
      return;
    }

    page.classList.add("plazo-motion-ready");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        show(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      }),
      { threshold: 0.16, rootMargin: "0px 0px -48px" },
    );

    targets.forEach((target) => observer.observe(target));
    return () => {
      observer.disconnect();
      page.classList.remove("plazo-motion-ready");
    };
  }, [banners.length, sellerLogos.length]);

  const benefitCopy = getSectionCopy(content.benefits, "benefits");
  const stepsCopy = getSectionCopy(content.steps, "steps");
  const advantagesCopy = getSectionCopy(content.advantages, "advantages");
  const testimonialsCopy = getSectionCopy(content.testimonials, "testimonials");

  return (
    <main ref={pageRef} className="overflow-hidden bg-[rgb(var(--color-primary-rgb)/0.035)] text-slate-950">
      <section className="border-b border-slate-200 bg-[rgb(var(--color-primary-rgb)/0.035)]">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-20">
            <div className="plazo-reveal pb-2">
              <p className="inline-flex items-center gap-2 border-l-2 border-[var(--color-primary)] pl-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-primary)]">{content.hero.eyebrow}</p>
              <h1 className="mt-7 max-w-2xl text-5xl font-semibold leading-[0.98] tracking-[-0.065em] text-slate-950 sm:text-6xl lg:text-7xl">{content.hero.title}<br />{content.hero.titleAccent}</h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">{content.hero.description}</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/register?role=SELLER" className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 text-sm font-bold text-white shadow-[0_14px_28px_rgb(var(--color-primary-rgb)/0.22)] transition hover:-translate-y-0.5"><span>Buat toko gratis</span><ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link>
                <Link href="/#cara-kerja" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-bold text-slate-800 transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">Lihat alurnya</Link>
              </div>
              <div className="mt-8 flex items-center gap-3 text-sm font-medium text-slate-500"><ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" /> Mulai untuk produk, jasa, maupun bisnis kreatif.</div>
            </div>

            <HeroBanner banners={banners} />
          </div>
        </div>
      </section>


      {sellerLogos.length > 0 && (
      <section aria-label="Identitas toko" className="border-b border-slate-200 bg-white px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
        <div data-plazo-reveal className="plazo-scroll-reveal mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
          <StorePreview />
          <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-primary)]">Identitas toko</p><h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-4xl">Setiap toko bisa tampil dengan karakternya sendiri.</h2><p className="mt-4 max-w-xl leading-7 text-slate-600">Lihat bisnis yang sudah memakai Plazo sebagai ruang untuk memperkenalkan penawarannya.</p><div className="plazo-logo-ticker mt-8"><div className="plazo-logo-track">{[...sellerLogos, ...sellerLogos].map((seller, index) => <div key={seller.name + "-" + index} className="plazo-logo-chip">{seller.logo ? <Image src={seller.logo} alt="" width={36} height={36} className="plazo-logo-mark object-contain" /> : <span className="plazo-logo-mark">{getInitials(seller.name)}</span>}<span>{seller.name}</span></div>)}</div></div></div>
        </div>
      </section>
      )}

      <section id="benefit" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div data-plazo-reveal className="plazo-scroll-reveal grid gap-8 border-b border-slate-200 pb-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-primary)]">{benefitCopy.eyebrow}</p><div><h2 className="max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.055em] sm:text-5xl">{benefitCopy.title}</h2><p className="mt-4 max-w-2xl leading-7 text-slate-600">{benefitCopy.description}</p></div></div>
          <div data-plazo-reveal className="plazo-scroll-reveal plazo-scroll-delay-1 grid divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {content.benefits.map((benefit) => { const Icon = getIcon(benefit.icon); return <article key={benefit.id || benefit.title} className="py-8 transition duration-300 hover:-translate-y-1 sm:px-8 sm:first:pl-0 sm:even:pr-0"><div className={"plazo-icon-orb grid h-16 w-16 place-items-center " + (toneClasses[benefit.tone] || toneClasses.blue)}><Icon className="h-7 w-7" /></div><p className="mt-8 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">{benefit.label}</p><h3 className="mt-3 text-xl font-semibold tracking-[-0.03em]">{benefit.title}</h3><p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">{benefit.description}</p></article>; })}
          </div>
        </div>
      </section>


      <section id="cara-kerja" className="scroll-mt-24 bg-[var(--color-primary)] text-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div data-plazo-reveal className="plazo-scroll-reveal grid gap-12 lg:grid-cols-[0.72fr_1.28fr]"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">{stepsCopy.eyebrow}</p><h2 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.055em] sm:text-5xl">{stepsCopy.title}</h2><p className="mt-5 max-w-md leading-7 text-white/80">{stepsCopy.description}</p></div><ol className="border-t border-white/15">{content.steps.map((step, index) => { const Icon = getIcon(step.icon); return <li key={step.id || step.title} className="grid gap-4 border-b border-white/15 py-6 sm:grid-cols-[3rem_1fr_auto] sm:items-start"><span className="text-sm font-bold text-white/80">0{index + 1}</span><div><h3 className="text-xl font-semibold">{step.title}</h3><p className="mt-2 max-w-xl text-sm leading-6 text-white/80">{step.description}</p></div><Icon className="h-7 w-7 text-white/80" /></li>; })}</ol></div>
        </div>
      </section>


      <section id="keunggulan" className="scroll-mt-24 bg-[rgb(var(--color-primary-rgb)/0.08)]">
        <div data-plazo-reveal className="plazo-scroll-reveal mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-10 lg:py-28">
          <div className="border-l-2 border-[var(--color-primary)] pl-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-primary)]">{advantagesCopy.eyebrow}</p><h2 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.055em] sm:text-5xl">{advantagesCopy.title}</h2><p className="mt-5 max-w-md leading-7 text-slate-600">{advantagesCopy.description}</p></div>
          <div className="plazo-glass p-2 shadow-[8px_8px_0_0_rgb(var(--color-primary-rgb)/0.18)]"><div className="divide-y divide-slate-200">{content.advantages.map((advantage, index) => <article key={advantage.id || advantage.title} className="grid gap-4 p-5 sm:grid-cols-[2rem_1fr]"><span className="text-sm font-bold text-[var(--color-primary)]">{String(index + 1).padStart(2, "0")}</span><div><h3 className="font-semibold tracking-[-0.02em]">{advantage.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{advantage.description}</p></div></article>)}</div></div>
        </div>
      </section>

      <section id="harga" className="scroll-mt-24 border-y border-slate-200 bg-white">
        <div data-plazo-reveal className="plazo-scroll-reveal mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-primary)]">Harga</p><h2 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.055em] sm:text-5xl">Pilih ruang tumbuh yang sesuai dengan bisnis Anda.</h2><p className="mt-5 leading-7 text-slate-600">Mulai gratis, lalu tingkatkan saat kebutuhan toko Anda berkembang.</p></div>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">{content.plans.map((plan) => { const features = getPlanFeatures(plan.features); const isFeatured = Boolean(plan.badge); return <article key={plan.id || plan.plan || plan.name} className={"relative flex flex-col border p-6 " + (isFeatured ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-[10px_10px_0_0_rgb(var(--color-primary-rgb)/0.18)]" : "border-slate-200 bg-white")}>{plan.badge && <span className="absolute left-6 top-0 -translate-y-1/2 border border-white/20 bg-blue-950 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_8px_18px_rgb(15_23_42/0.3)]">{plan.badge}</span>}<p className={"text-xs font-bold uppercase tracking-[0.16em] " + (isFeatured ? "text-white/75" : "text-slate-400")}>{plan.name}</p><p className="mt-5 text-4xl font-semibold tracking-[-0.05em]">{formatPlanPrice(plan.monthlyPrice, plan.currency)}</p><p className={"mt-2 text-sm " + (isFeatured ? "text-white/80" : "text-slate-500")}>{plan.monthlyPrice === 0 ? "untuk mulai" : "per bulan"}</p><p className={"mt-6 min-h-12 text-sm leading-6 " + (isFeatured ? "text-white/80" : "text-slate-600")}>{plan.description || "Paket untuk kebutuhan bisnis Anda."}</p><ul className={"mt-7 space-y-3 border-t pt-6 text-sm " + (isFeatured ? "border-white/20 text-white" : "border-slate-200 text-slate-700")}>{features.slice(0, 4).map((feature) => <li key={feature} className="flex gap-2"><Check className={"mt-0.5 h-4 w-4 shrink-0 " + (isFeatured ? "text-white" : "text-[var(--color-primary)]")} />{feature}</li>)}</ul><Link href="/register?role=SELLER" className={"mt-8 inline-flex min-h-11 items-center justify-center text-sm font-bold transition " + (isFeatured ? "bg-white text-[var(--color-primary)] hover:bg-white/85" : "border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[rgb(var(--color-primary-rgb)/0.08)]")}>Pilih {plan.name}<ArrowRight className="ml-2 h-4 w-4" /></Link></article>; })}</div>
        </div>
      </section>

      <section id="testimoni" className="scroll-mt-24 bg-[rgb(var(--color-primary-rgb)/0.06)]">
        <div data-plazo-reveal className="plazo-scroll-reveal mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28"><div className="grid gap-8 border-b border-[rgb(var(--color-primary-rgb)/0.2)] pb-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-primary)]">{testimonialsCopy.eyebrow}</p><div><h2 className="max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.055em] sm:text-5xl">{testimonialsCopy.title}</h2><p className="mt-4 max-w-2xl leading-7 text-slate-600">{testimonialsCopy.description}</p></div></div><div className="mt-10 grid gap-4 lg:grid-cols-3">{content.testimonials.map((testimonial) => <figure key={testimonial.id || testimonial.title} className="plazo-glass flex min-h-64 flex-col p-6"><blockquote className="text-lg font-medium leading-8 tracking-[-0.025em] text-slate-800">“{testimonial.description}”</blockquote><figcaption className="mt-auto flex items-center gap-3 border-t border-slate-200 pt-5"><span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-xs font-bold tracking-wide text-white">{getInitials(testimonial.title)}</span><div><p className="font-semibold text-slate-950">{testimonial.title}</p>{testimonial.label && <p className="mt-1 text-sm text-slate-500">{testimonial.label}</p>}</div></figcaption></figure>)}</div></div>
      </section>

      <section id="faq" className="scroll-mt-24 bg-white"><div data-plazo-reveal className="plazo-scroll-reveal mx-auto max-w-4xl px-5 py-20 sm:px-8 lg:py-28"><div className="border-b border-slate-200 pb-9"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-primary)]">FAQ</p><h2 className="mt-4 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">Hal yang perlu diketahui sebelum mulai.</h2></div><div className="divide-y divide-slate-200">{content.faqs.map((faq, index) => <details key={faq.id || faq.question} open={index === 0} className="group"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-6 text-left font-semibold marker:hidden"><span>{faq.question}</span><ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" /></summary><p className="max-w-2xl pb-6 text-sm leading-6 text-slate-600">{faq.answer}</p></details>)}</div></div></section>

      <section className="bg-[var(--color-primary)] px-5 py-16 text-white sm:px-8 lg:px-10 lg:py-20"><div data-plazo-reveal className="plazo-scroll-reveal mx-auto grid max-w-7xl gap-8 border border-white/15 p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">Mulai dari bisnis Anda</p><h2 className="mt-5 max-w-2xl text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">Buat toko yang membantu pelanggan memahami apa yang Anda tawarkan.</h2></div><div className="flex flex-col gap-3 sm:flex-row"><Link href="/register?role=SELLER" className="inline-flex min-h-12 items-center justify-center gap-2 bg-white px-5 text-sm font-bold text-slate-950 transition hover:bg-white/85">Buat toko gratis <ArrowRight className="h-4 w-4" /></Link><Link href="/products" className="inline-flex min-h-12 items-center justify-center border border-white/70 px-5 text-sm font-bold transition hover:bg-white hover:text-[var(--color-primary)]">Jelajahi marketplace</Link></div></div></section>
      <ReportFloat />
    </main>
  );
}
