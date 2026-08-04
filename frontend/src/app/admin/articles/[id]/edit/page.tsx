"use client";

import { useParams } from "next/navigation";
import { ArticleForm } from "@/components/admin/article-form";

export default function EditArticlePage() {
  const params = useParams();
  return <ArticleForm mode="edit" articleId={params.id as string} />;
}
