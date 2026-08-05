"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowLeft, Heart, Loader2, MessageCircle, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/api";
import { forumApi } from "@/services/forum.service";
import { useAuthStore } from "@/stores/auth.store";
import type { ForumComment, ForumPost } from "@/types/forum";

type DeleteTarget = { type: "post" | "comment"; id: string } | null;

// Memformat waktu post dan komentar dalam format lokal yang konsisten.
function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

// Menampilkan detail diskusi serta interaksi komentar dan kepemilikan konten.
export default function ForumDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user, isAuthenticated } = useAuthStore();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [commentContent, setCommentContent] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [editingPost, setEditingPost] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Memuat detail post saat slug URL berubah.
  const loadPost = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    try {
      const { data } = await forumApi.getPost(slug);
      setPost(data.post);
      setPostTitle(data.post.title);
      setPostContent(data.post.content);
      if (isAuthenticated) {
        const likedResponse = await forumApi.getLikedPostIds([data.post.id]);
        setIsLiked(likedResponse.data.postIds.includes(data.post.id));
      } else {
        setIsLiked(false);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
      router.replace("/forum");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, router, slug]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  // Membuat komentar baru dan menambahkannya ke detail post tanpa reload penuh.
  const handleCreateComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!post || !isAuthenticated) {
      toast.error("Silakan login untuk berkomentar");
      return;
    }

    setIsSubmittingComment(true);
    try {
      const { data } = await forumApi.createComment(post.id, commentContent);
      setPost((current) =>
        current
          ? {
              ...current,
              comments: [...(current.comments || []), data.comment],
              _count: { ...current._count, comments: current._count.comments + 1 },
            }
          : current,
      );
      setCommentContent("");
      toast.success("Komentar berhasil ditambahkan");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Memperbarui jumlah like lokal berdasarkan hasil aksi API.
  const handleLike = async () => {
    if (!post || !isAuthenticated) {
      toast.error("Silakan login untuk menyukai post");
      return;
    }

    try {
      const { data } = isLiked ? await forumApi.unlikePost(post.id) : await forumApi.likePost(post.id);
      setIsLiked(data.liked);
      setPost((current) =>
        current ? { ...current, _count: { ...current._count, likes: data.likeCount } } : current,
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  // Menyimpan perubahan post yang dibuat oleh pemiliknya.
  const handleUpdatePost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!post) return;
    try {
      const { data } = await forumApi.updatePost(post.id, { title: postTitle, content: postContent });
      setPost((current) => (current ? { ...current, ...data.post } : current));
      setEditingPost(false);
      toast.success("Post diperbarui");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  // Menyimpan perubahan komentar yang dibuat oleh pemiliknya.
  const handleUpdateComment = async (event: FormEvent<HTMLFormElement>, comment: ForumComment) => {
    event.preventDefault();
    try {
      const { data } = await forumApi.updateComment(comment.id, editingCommentContent);
      setPost((current) =>
        current
          ? {
              ...current,
              comments: (current.comments || []).map((item) =>
                item.id === comment.id ? data.comment : item,
              ),
            }
          : current,
      );
      setEditingCommentId(null);
      toast.success("Komentar diperbarui");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  // Menghapus post atau komentar setelah pengguna mengonfirmasi tindakan.
  const handleDelete = async () => {
    if (!deleteTarget || !post) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === "post") {
        await forumApi.removePost(deleteTarget.id);
        toast.success("Post dihapus");
        router.push("/forum");
        return;
      }

      await forumApi.removeComment(deleteTarget.id);
      setPost((current) =>
        current
          ? {
              ...current,
              comments: (current.comments || []).filter((comment) => comment.id !== deleteTarget.id),
              _count: { ...current._count, comments: Math.max(0, current._count.comments - 1) },
            }
          : current,
      );
      toast.success("Komentar dihapus");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (isLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-gray-50"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></main>;
  }

  if (!post) return null;
  const isPostOwner = user?.id === post.authorId;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/forum" className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-700">
          <ArrowLeft className="h-4 w-4" /> Kembali ke forum
        </Link>

        <article className="mt-5 rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Avatar src={post.author.avatar} firstName={post.author.firstName} lastName={post.author.lastName} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{post.author.firstName} {post.author.lastName}</p>
                  <p className="text-xs text-gray-500">{formatDate(post.createdAt)}</p>
                </div>
                {isPostOwner && !editingPost && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditingPost(true)} className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-blue-700" title="Edit post"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => setDeleteTarget({ type: "post", id: post.id })} className="rounded-md p-2 text-gray-500 hover:bg-red-50 hover:text-red-600" title="Hapus post"><Trash2 className="h-4 w-4" /></button>
                  </div>
                )}
              </div>

              {editingPost ? (
                <form onSubmit={handleUpdatePost} className="mt-4 space-y-3">
                  <input value={postTitle} onChange={(event) => setPostTitle(event.target.value)} maxLength={160} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base font-semibold outline-none focus:border-blue-500" />
                  <Textarea value={postContent} onChange={(event) => setPostContent(event.target.value)} maxLength={5000} />
                  <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditingPost(false)}>Batal</Button><Button type="submit">Simpan</Button></div>
                </form>
              ) : (
                <>
                  <h1 className="mt-4 text-2xl font-bold text-gray-900">{post.title}</h1>
                  <p className="mt-4 whitespace-pre-line text-sm leading-7 text-gray-700">{post.content}</p>
                </>
              )}

              <button onClick={handleLike} className={`mt-5 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${isLiked ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600"}`}>
                <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} /> {post._count.likes} suka
              </button>
            </div>
          </div>
        </article>

        <section id="komentar" className="mt-6">
          <div className="mb-4 flex items-center gap-2"><MessageCircle className="h-5 w-5 text-blue-600" /><h2 className="text-lg font-semibold text-gray-900">{post._count.comments} Komentar</h2></div>
          {isAuthenticated ? (
            <form onSubmit={handleCreateComment} className="rounded-lg border border-gray-200 bg-white p-4">
              <Textarea value={commentContent} onChange={(event) => setCommentContent(event.target.value)} maxLength={2000} placeholder="Tulis komentar yang bermanfaat..." />
              <div className="mt-2 flex justify-end"><Button type="submit" isLoading={isSubmittingComment}>Kirim komentar</Button></div>
            </form>
          ) : (
            <p className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900"><Link href={`/login?returnUrl=/forum/${post.slug}`} className="font-semibold text-blue-700 hover:underline">Masuk</Link> untuk ikut berkomentar.</p>
          )}

          <div className="mt-4 space-y-3">
            {(post.comments || []).map((comment) => {
              const isCommentOwner = user?.id === comment.authorId;
              const isEditing = editingCommentId === comment.id;
              return (
                <article key={comment.id} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex gap-3"><Avatar src={comment.author.avatar} firstName={comment.author.firstName} lastName={comment.author.lastName} size="sm" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><div><span className="text-sm font-semibold text-gray-900">{comment.author.firstName} {comment.author.lastName}</span><span className="ml-2 text-xs text-gray-500">{formatDate(comment.createdAt)}</span></div>{isCommentOwner && !isEditing && <div className="flex"><button onClick={() => { setEditingCommentId(comment.id); setEditingCommentContent(comment.content); }} className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-blue-700" title="Edit komentar"><Pencil className="h-4 w-4" /></button><button onClick={() => setDeleteTarget({ type: "comment", id: comment.id })} className="rounded-md p-2 text-gray-500 hover:bg-red-50 hover:text-red-600" title="Hapus komentar"><Trash2 className="h-4 w-4" /></button></div>}</div>{isEditing ? <form onSubmit={(event) => handleUpdateComment(event, comment)} className="mt-3"><Textarea value={editingCommentContent} onChange={(event) => setEditingCommentContent(event.target.value)} maxLength={2000} /><div className="mt-2 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditingCommentId(null)}>Batal</Button><Button type="submit">Simpan</Button></div></form> : <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">{comment.content}</p>}</div></div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteTarget?.type === "post" ? "Hapus post?" : "Hapus komentar?"}
        message="Konten akan dihapus dari forum dan tidak dapat ditampilkan kembali oleh pengguna."
        confirmText="Hapus"
        isLoading={isDeleting}
      />
    </main>
  );
}
