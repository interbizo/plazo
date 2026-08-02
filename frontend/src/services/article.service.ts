import api from "@/lib/api";
import type { Article, ArticleCategory, PaginatedResponse } from "@/types";

export interface ArticleBrowseParams {
  page?: number;
  limit?: number;
  search?: string;
  categorySlug?: string;
  tag?: string;
}

export interface ArticleAdminParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  source?: string;
  categoryId?: string;
  tag?: string;
}

export const articleApi = {
  getArticles: (params?: ArticleBrowseParams) =>
    api.get<PaginatedResponse<Article>>("/api/public/articles", { params }),

  getArticleBySlug: (slug: string) =>
    api.get<{ article: Article; related: Article[] }>(
      `/api/public/articles/${slug}`,
    ),

  getCategories: () =>
    api.get<ArticleCategory[]>("/api/public/article-categories"),
};

export const articleAdminApi = {
  getArticles: (params?: ArticleAdminParams) =>
    api.get<PaginatedResponse<Article>>("/api/admin/articles", { params }),

  getArticle: (id: string) =>
    api.get<{ article: Article }>(`/api/admin/articles/${id}`),

  createArticle: (data: Record<string, unknown>) =>
    api.post<{ article: Article }>("/api/admin/articles", data),

  updateArticle: (id: string, data: Record<string, unknown>) =>
    api.put<{ article: Article }>(`/api/admin/articles/${id}`, data),

  publishArticle: (id: string) =>
    api.post<{ article: Article }>(`/api/admin/articles/${id}/publish`),

  unpublishArticle: (id: string) =>
    api.post<{ article: Article }>(`/api/admin/articles/${id}/unpublish`),

  deleteArticle: (id: string) => api.delete(`/api/admin/articles/${id}`),

  importArticlesCsv: (formData: FormData) =>
    api.post<{
      importedArticles: Article[];
      errors: Array<{ row: number; title?: string; message: string }>;
      batch?: unknown;
    }>("/api/admin/articles/import-csv", formData),

  getCategories: () =>
    api.get<ArticleCategory[]>("/api/admin/article-categories"),

  createCategory: (data: Record<string, unknown>) =>
    api.post<ArticleCategory>("/api/admin/article-categories", data),

  updateCategory: (id: string, data: Record<string, unknown>) =>
    api.put<ArticleCategory>(`/api/admin/article-categories/${id}`, data),

  deleteCategory: (id: string) =>
    api.delete(`/api/admin/article-categories/${id}`),
};
