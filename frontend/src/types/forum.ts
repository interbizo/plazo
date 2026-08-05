export type ForumPostStatus = "PUBLISHED" | "REMOVED";

export interface ForumAuthor {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  role: "BUYER" | "SELLER" | "ADMIN" | "SUPER_ADMIN";
}

export interface ForumComment {
  id: string;
  content: string;
  status: ForumPostStatus;
  authorId: string;
  author: ForumAuthor;
  createdAt: string;
  updatedAt: string;
}

export interface ForumPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  status: ForumPostStatus;
  authorId: string;
  author: ForumAuthor;
  comments?: ForumComment[];
  createdAt: string;
  updatedAt: string;
  _count: {
    comments: number;
    likes: number;
    strikes?: number;
  };
}

export interface ForumPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ForumPostListResponse {
  data: ForumPost[];
  pagination: ForumPagination;
}

export interface ForumModerationSettings {
  id: string;
  isAntiSpamEnabled: boolean;
  rateLimitWindowMinutes: number;
  postLimitPerWindow: number;
  commentLimitPerWindow: number;
  duplicateWindowMinutes: number;
  updatedBy?: string | null;
  updatedAt?: string;
}
