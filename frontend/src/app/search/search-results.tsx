"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag,
  Palette,
  Briefcase,
  Newspaper,
  MessageSquare,
  ChevronRight,
  BookOpen,
  MessagesSquare,
} from "lucide-react";
import { resolveImageUrl } from "@/lib/image-url";
import type { Product, Service, Job, Article } from "@/types";
import type { ForumPost } from "@/types/forum";
import { ProductCard } from "@/components/shared/product-card";
import { ServiceCard } from "@/components/shared/service-card";
import { JobCard } from "@/components/shared/job-card";

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

function ArticleCard({ article }: { article: Article }) {
  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white transition hover:border-blue-200 hover:shadow-md"
    >
      <div className="aspect-[16/9] bg-gray-100">
        {article.thumbnail ? (
          <Image
            src={resolveImageUrl(article.thumbnail)}
            alt={article.title}
            width={400}
            height={225}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-300">
            <BookOpen className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        {article.category && (
          <span className="mb-1.5 w-fit rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
            {article.category.name}
          </span>
        )}
        <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-blue-700">
          {article.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs text-gray-500">
          {article.excerpt || "Baca artikel lengkap di Plazo."}
        </p>
      </div>
    </Link>
  );
}

function ForumCard({ post }: { post: ForumPost }) {
  return (
    <Link
      href={`/forum/${post.slug}`}
      className="group flex h-full flex-col rounded-lg border border-gray-200 bg-white p-3 transition hover:border-blue-200 hover:shadow-md"
    >
      <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-blue-700">
        {post.title}
      </h3>
      <p className="mt-1 line-clamp-3 flex-1 text-xs text-gray-500">{post.content}</p>
      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
        <span className="truncate">
          {post.author ? `${post.author.firstName} ${post.author.lastName}`.trim() : "Anonim"}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <MessagesSquare className="h-3 w-3" />
          {post._count?.comments ?? 0}
        </span>
      </div>
    </Link>
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
