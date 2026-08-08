"use client";

import Link from "next/link";
import {
  ShoppingBag,
  Palette,
  Briefcase,
  Newspaper,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import type { Product, Service, Job, Article } from "@/types";
import type { ForumPost } from "@/types/forum";
import { ProductCard } from "@/components/shared/product-card";
import { ServiceCard } from "@/components/shared/service-card";
import { JobCard } from "@/components/shared/job-card";
import { ArticleCard } from "@/components/shared/article-card";
import { ForumCard } from "@/components/shared/forum-card";

function ModuleSection({
  headerClass,
  icon,
  title,
  subtitle,
  viewAllHref,
  children,
}: {
  headerClass: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  viewAllHref: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className={`flex items-center justify-between rounded-t-xl px-6 py-4 shadow-md ${headerClass}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <p className="text-xs text-white/80">{subtitle}</p>
          </div>
        </div>
        <Link
          href={viewAllHref}
          className="group flex items-center gap-1 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
        >
          Lihat Semua
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <div className="rounded-b-xl bg-white p-4 shadow-md">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {children}
        </div>
      </div>
    </section>
  );
}

interface SearchResultsProps {
  q: string;
  products: Product[];
  services: Service[];
  jobs: Job[];
  articles: Article[];
  forum: ForumPost[];
}

export function SearchResults({
  q,
  products,
  services,
  jobs,
  articles,
  forum,
}: SearchResultsProps) {
  return (
    <div className="space-y-6">
      {products.length > 0 && (
        <ModuleSection
          headerClass="bg-blue-600"
          icon={<ShoppingBag className="h-5 w-5 text-white" />}
          title="Produk"
          subtitle={`${products.length} hasil ditemukan`}
          viewAllHref={`/products?search=${encodeURIComponent(q)}`}
        >
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </ModuleSection>
      )}

      {services.length > 0 && (
        <ModuleSection
          headerClass="bg-purple-600"
          icon={<Palette className="h-5 w-5 text-white" />}
          title="Jasa"
          subtitle={`${services.length} hasil ditemukan`}
          viewAllHref={`/services?search=${encodeURIComponent(q)}`}
        >
          {services.map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </ModuleSection>
      )}

      {jobs.length > 0 && (
        <ModuleSection
          headerClass="bg-emerald-600"
          icon={<Briefcase className="h-5 w-5 text-white" />}
          title="Project"
          subtitle={`${jobs.length} hasil ditemukan`}
          viewAllHref={`/jobs?search=${encodeURIComponent(q)}`}
        >
          {jobs.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </ModuleSection>
      )}

      {articles.length > 0 && (
        <ModuleSection
          headerClass="bg-indigo-600"
          icon={<Newspaper className="h-5 w-5 text-white" />}
          title="Artikel"
          subtitle={`${articles.length} hasil ditemukan`}
          viewAllHref={`/articles?search=${encodeURIComponent(q)}`}
        >
          {articles.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </ModuleSection>
      )}

      {forum.length > 0 && (
        <ModuleSection
          headerClass="bg-orange-500"
          icon={<MessageSquare className="h-5 w-5 text-white" />}
          title="Forum"
          subtitle={`${forum.length} hasil ditemukan`}
          viewAllHref="/forum"
        >
          {forum.map((f) => (
            <ForumCard key={f.id} post={f} />
          ))}
        </ModuleSection>
      )}
    </div>
  );
}
