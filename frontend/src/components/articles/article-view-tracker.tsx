"use client";

import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";
import { articleApi } from "@/services/article.service";

interface ArticleViewTrackerProps {
  articleId: string;
  initialViewCount: number;
}

export function ArticleViewTracker({
  articleId,
  initialViewCount,
}: ArticleViewTrackerProps) {
  const hasTracked = useRef(false);
  const [viewCount, setViewCount] = useState(initialViewCount);

  useEffect(() => {
    if (!articleId || hasTracked.current) return;

    hasTracked.current = true;
    articleApi
      .trackArticleView(articleId)
      .then(({ data }) => {
        if (typeof data.viewCount === "number") {
          setViewCount(data.viewCount);
        }
      })
      .catch(() => {});
  }, [articleId]);

  return (
    <span className="inline-flex items-center gap-1">
      <Eye className="h-4 w-4" />
      {viewCount} views
    </span>
  );
}
