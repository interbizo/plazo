import Link from "next/link";
import type { ForumPost } from "@/types/forum";
import { formatRelativeTime } from "@/lib/utils";
import { MessagesSquare, ThumbsUp, User } from "lucide-react";

interface ForumCardProps {
  post: ForumPost;
}

export function ForumCard({ post }: ForumCardProps) {
  const postUrl = post.slug ? `/forum/${post.slug}` : "#";

  return (
    <Link
      href={postUrl}
      className="group block rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-lg"
    >
      <div className="flex items-start gap-3">
        {post.author?.avatar ? (
          <img
            src={post.author.avatar}
            alt={post.author.firstName}
            className="h-10 w-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 shrink-0">
            <User className="h-5 w-5 text-gray-400" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500">
            {post.author ? `${post.author.firstName} ${post.author.lastName}`.trim() : "Anonim"}
          </p>
          <h3 className="mt-0.5 text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {post.title}
          </h3>
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500 line-clamp-3">{post.content}</p>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <ThumbsUp className="h-3 w-3" />
          {post._count?.likes ?? 0}
        </span>
        <span className="flex items-center gap-1">
          <MessagesSquare className="h-3 w-3" />
          {post._count?.comments ?? 0}
        </span>
        <span className="ml-auto">{formatRelativeTime(post.createdAt)}</span>
      </div>
    </Link>
  );
}
