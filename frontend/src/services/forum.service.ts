import api from "@/lib/api";
import type {
  ForumComment,
  ForumModerationSettings,
  ForumPost,
  ForumPostListResponse,
} from "@/types/forum";

export interface ForumPostListParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: "recent" | "popular";
}

export interface CreateForumPostPayload {
  title: string;
  content: string;
}

export interface CreateForumStrikePayload {
  userId: string;
  reason: string;
  postId?: string;
  commentId?: string;
}

export interface UpdateForumModerationSettingsPayload {
  isAntiSpamEnabled?: boolean;
  rateLimitWindowMinutes?: number;
  postLimitPerWindow?: number;
  commentLimitPerWindow?: number;
  duplicateWindowMinutes?: number;
}

export const forumApi = {
  listPosts: (params?: ForumPostListParams) =>
    api.get<ForumPostListResponse>("/api/forum/posts", { params }),
  getPost: (slug: string) => api.get<{ post: ForumPost }>(`/api/forum/posts/${slug}`),
  getLikedPostIds: (postIds: string[]) =>
    api.get<{ postIds: string[] }>("/api/forum/me/liked-posts", {
      params: { postIds: postIds.join(",") },
    }),
  createPost: (payload: CreateForumPostPayload) =>
    api.post<{ post: ForumPost }>("/api/forum/posts", payload),
  updatePost: (postId: string, payload: Partial<CreateForumPostPayload>) =>
    api.put<{ post: ForumPost }>(`/api/forum/posts/${postId}`, payload),
  removePost: (postId: string) => api.delete(`/api/forum/posts/${postId}`),
  likePost: (postId: string) =>
    api.post<{ liked: boolean; likeCount: number }>(`/api/forum/posts/${postId}/likes`),
  unlikePost: (postId: string) =>
    api.delete<{ liked: boolean; likeCount: number }>(`/api/forum/posts/${postId}/likes`),
  createComment: (postId: string, content: string) =>
    api.post<{ comment: ForumComment }>(`/api/forum/posts/${postId}/comments`, { content }),
  updateComment: (commentId: string, content: string) =>
    api.put<{ comment: ForumComment }>(`/api/forum/comments/${commentId}`, { content }),
  removeComment: (commentId: string) => api.delete(`/api/forum/comments/${commentId}`),
};

export const forumModerationApi = {
  listPosts: (params?: ForumPostListParams) =>
    api.get<ForumPostListResponse>("/api/admin/forum/posts", { params }),
  removePost: (postId: string) => api.delete(`/api/admin/forum/posts/${postId}`),
  bulkRemovePosts: (postIds: string[]) =>
    api.post<{ message: string; count: number }>("/api/admin/forum/posts/bulk-remove", { postIds }),
  getSettings: () => api.get<ForumModerationSettings>("/api/admin/forum/settings"),
  updateSettings: (payload: UpdateForumModerationSettingsPayload) =>
    api.put<{ settings: ForumModerationSettings }>("/api/admin/forum/settings", payload),
  createStrike: (payload: CreateForumStrikePayload) =>
    api.post<{ strikeCount: number; isBanned: boolean }>("/api/admin/forum/strikes", payload),
};
