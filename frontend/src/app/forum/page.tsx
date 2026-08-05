"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Heart,
  Loader2,
  MessageCircle,
  MessageSquarePlus,
  Search,
  ThumbsUp,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/api";
import { forumApi } from "@/services/forum.service";
import { useAuthStore } from "@/stores/auth.store";
import type { ForumPost } from "@/types/forum";

// Memformat waktu pembuatan post dalam format lokal yang ringkas.
function formatPostDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

// Menyatukan nama depan dan belakang penulis untuk ditampilkan pada post.
function getAuthorName(post: ForumPost) {
  return `${post.author.firstName} ${post.author.lastName}`.trim();
}

// Menampilkan daftar diskusi publik dan form pembuatan post bagi pengguna terautentikasi.
export default function ForumPage() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState<"recent" | "popular">("recent");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);

  // Memuat ulang daftar post saat pencarian atau urutan berubah.
  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await forumApi.listPosts({
        page: 1,
        limit: 20,
        ...(search && { search }),
        sort,
      });
      const loadedPosts = data.data || [];
      setPosts(loadedPosts);

      if (!isAuthenticated || !loadedPosts.length) {
        setLikedPostIds([]);
        return;
      }

      const likedResponse = await forumApi.getLikedPostIds(loadedPosts.map((post) => post.id));
      setLikedPostIds(likedResponse.data.postIds);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, search, sort]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Mengirim post baru lalu memasukkannya ke urutan daftar saat ini.
  const handleCreatePost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAuthenticated) {
      toast.error("Silakan login untuk membuat post");
      return;
    }

    setIsCreating(true);
    try {
      const { data } = await forumApi.createPost({ title, content });
      setPosts((current) => [data.post, ...current]);
      setTitle("");
      setContent("");
      toast.success("Post berhasil dipublikasikan");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  };

  // Mengubah status like lokal setelah API menerima aksi pengguna.
  const handleLike = async (post: ForumPost) => {
    if (!isAuthenticated) {
      toast.error("Silakan login untuk menyukai post");
      return;
    }

    const isLiked = likedPostIds.includes(post.id);
    try {
      const { data } = isLiked
        ? await forumApi.unlikePost(post.id)
        : await forumApi.likePost(post.id);
      setLikedPostIds((current) =>
        isLiked ? current.filter((id) => id !== post.id) : [...current, post.id],
      );
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? { ...item, _count: { ...item._count, likes: data.likeCount } }
            : item,
        ),
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  // Menerapkan kata kunci pencarian setelah form dikirim pengguna.
  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold text-blue-600">Komunitas Plazo</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Forum Diskusi</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
            Bertanya, berbagi pengalaman, dan berdiskusi seputar produk, jasa, serta bisnis digital.
          </p>

          <form onSubmit={handleSearch} className="mt-6 flex max-w-2xl gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Cari diskusi..."
                className="min-w-0 flex-1 text-sm outline-none"
              />
            </div>
            <Button type="submit">Cari</Button>
          </form>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:px-8">
        <div className="space-y-5">
          {!isAuthLoading && isAuthenticated ? (
            <form onSubmit={handleCreatePost} className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <Avatar
                  src={user?.avatar}
                  firstName={user?.firstName || ""}
                  lastName={user?.lastName || ""}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={160}
                    placeholder="Apa yang ingin Anda diskusikan?"
                    className="w-full border-0 px-0 text-base font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none"
                  />
                  <Textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    maxLength={5000}
                    placeholder="Tulis detail diskusi Anda..."
                    className="mt-3 min-h-[110px]"
                  />
                  <div className="mt-3 flex justify-end">
                    <Button type="submit" isLoading={isCreating}>
                      <MessageSquarePlus className="mr-2 h-4 w-4" />
                      Publikasikan
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
              <Link href="/login?returnUrl=/forum" className="font-semibold text-blue-700 hover:underline">
                Masuk ke akun Anda
              </Link>{" "}
              untuk membuat post, komentar, dan like.
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Diskusi terbaru</h2>
            <div className="flex rounded-lg border border-gray-200 bg-white p-1">
              <button
                onClick={() => setSort("recent")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  sort === "recent" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Terbaru
              </button>
              <button
                onClick={() => setSort("popular")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  sort === "popular" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Populer
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
          ) : posts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white py-14 text-center">
              <MessageCircle className="mx-auto h-10 w-10 text-gray-300" />
              <h3 className="mt-3 text-base font-semibold text-gray-900">Belum ada diskusi</h3>
              <p className="mt-1 text-sm text-gray-500">Mulai percakapan pertama di komunitas Plazo.</p>
            </div>
          ) : (
            posts.map((post) => {
              const isLiked = likedPostIds.includes(post.id);
              return (
                <article key={post.id} className="rounded-lg border border-gray-200 bg-white p-5">
                  <div className="flex items-start gap-3">
                    <Avatar src={post.author.avatar} firstName={post.author.firstName} lastName={post.author.lastName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        <span className="font-semibold text-gray-900">{getAuthorName(post)}</span>
                        <span className="text-gray-400">{formatPostDate(post.createdAt)}</span>
                      </div>
                      <Link href={`/forum/${post.slug}`} className="mt-3 block">
                        <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-700">{post.title}</h3>
                        <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm leading-6 text-gray-600">{post.content}</p>
                      </Link>
                      <div className="mt-4 flex items-center gap-4 border-t border-gray-100 pt-3 text-sm">
                        <button onClick={() => handleLike(post)} className={`inline-flex items-center gap-1.5 ${isLiked ? "text-red-600" : "text-gray-500 hover:text-red-600"}`}>
                          <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                          {post._count.likes}
                        </button>
                        <Link href={`/forum/${post.slug}#komentar`} className="inline-flex items-center gap-1.5 text-gray-500 hover:text-blue-600">
                          <MessageCircle className="h-4 w-4" />
                          {post._count.comments} komentar
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <h2 className="mt-3 text-sm font-semibold text-gray-900">Aturan komunitas</h2>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-gray-600">
              <li>Gunakan bahasa yang sopan dan relevan.</li>
              <li>Jangan kirim konten atau komentar berulang.</li>
              <li>Tiga strike terverifikasi dapat memblokir akun permanen.</li>
            </ul>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs leading-5 text-gray-600">
            <ThumbsUp className="mb-3 h-5 w-5 text-blue-600" />
            Like post yang membantu agar diskusi bermanfaat lebih mudah ditemukan.
          </div>
        </aside>
      </div>
    </main>
  );
}
