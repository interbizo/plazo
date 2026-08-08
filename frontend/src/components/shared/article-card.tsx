import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/types";
import { resolveImageUrl } from "@/lib/image-url";
import { BookOpen, Clock, Eye } from "lucide-react";

interface ArticleCardProps {
  article: Article;
}

export function ArticleCard({ article }: ArticleCardProps) {
  const articleUrl = article.slug ? `/articles/${article.slug}` : "#";

  return (
    <Link
      href={articleUrl}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
        {article.thumbnail ? (
          <Image
            src={resolveImageUrl(article.thumbnail)}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="h-12 w-12 text-gray-300" />
          </div>
        )}
        {article.category && (
          <span className="absolute top-2 left-2 rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white shadow-md">
            {article.category.name}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="mt-1.5 text-xs text-gray-500 line-clamp-2">
            {article.excerpt}
          </p>
        )}
        <div className="mt-auto pt-3 flex items-center gap-3 text-xs text-gray-400">
          {article.readingTimeMinutes > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {article.readingTimeMinutes} mnt baca
            </span>
          )}
          {article.viewCount > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {article.viewCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
