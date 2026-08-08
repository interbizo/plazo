"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, Save, Search, ShieldAlert, SlidersHorizontal, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Pagination } from "@/components/shared/pagination";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/api";
import { forumModerationApi } from "@/services/forum.service";
import type { ForumModerationSettings, ForumPagination, ForumPost } from "@/types/forum";

const ADMIN_FORUM_PAGE_LIMIT = 20;

// Memformat waktu post untuk tabel moderasi.
function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

type SettingsForm = {
  rateLimitWindowMinutes: string;
  postLimitPerWindow: string;
  commentLimitPerWindow: string;
  duplicateWindowMinutes: string;
};

function buildSettingsForm(settings: ForumModerationSettings): SettingsForm {
  return {
    rateLimitWindowMinutes: String(settings.rateLimitWindowMinutes),
    postLimitPerWindow: String(settings.postLimitPerWindow),
    commentLimitPerWindow: String(settings.commentLimitPerWindow),
    duplicateWindowMinutes: String(settings.duplicateWindowMinutes),
  };
}

function normalizeSettingNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

// Menampilkan panel admin untuk moderasi post, anti-spam, dan pemberian strike.
export default function AdminForumPage() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<ForumPagination>({
    page: 1,
    limit: ADMIN_FORUM_PAGE_LIMIT,
    total: 0,
    pages: 1,
  });
  const [settings, setSettings] = useState<ForumModerationSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState<SettingsForm>({
    rateLimitWindowMinutes: "10",
    postLimitPerWindow: "3",
    commentLimitPerWindow: "12",
    duplicateWindowMinutes: "10",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [isAntiSpamConfirmOpen, setIsAntiSpamConfirmOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [strikePost, setStrikePost] = useState<ForumPost | null>(null);
  const [strikeReason, setStrikeReason] = useState("");
  const [isSubmittingStrike, setIsSubmittingStrike] = useState(false);

  // Memuat post moderator dan konfigurasi anti-spam dalam satu permintaan paralel.
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [postsResponse, settingsResponse] = await Promise.all([
        forumModerationApi.listPosts({ page, limit: ADMIN_FORUM_PAGE_LIMIT, ...(search && { search }) }),
        forumModerationApi.getSettings(),
      ]);
      setPosts(postsResponse.data.data || []);
      setPagination(
        postsResponse.data.pagination || {
          page,
          limit: ADMIN_FORUM_PAGE_LIMIT,
          total: postsResponse.data.data?.length || 0,
          pages: 1,
        },
      );
      setSettings(settingsResponse.data);
      setSettingsForm(buildSettingsForm(settingsResponse.data));
      setSelectedPostIds([]);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Mengubah status anti-spam setelah moderator mengonfirmasi dialog.
  const handleToggleAntiSpam = async () => {
    if (!settings) return;
    const nextValue = !settings.isAntiSpamEnabled;
    setIsSavingSettings(true);
    try {
      const { data } = await forumModerationApi.updateSettings({
        isAntiSpamEnabled: nextValue,
        rateLimitWindowMinutes: settings.rateLimitWindowMinutes,
        postLimitPerWindow: settings.postLimitPerWindow,
        commentLimitPerWindow: settings.commentLimitPerWindow,
        duplicateWindowMinutes: settings.duplicateWindowMinutes,
      });
      setSettings(data.settings);
      setSettingsForm(buildSettingsForm(data.settings));
      toast.success(nextValue ? "Anti-spam diaktifkan" : "Anti-spam dinonaktifkan");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Menyimpan batas rate limit anti-spam yang dapat diatur admin.
  const handleSaveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!settings) return;
    setIsSavingSettings(true);
    try {
      const { data } = await forumModerationApi.updateSettings({
        isAntiSpamEnabled: settings.isAntiSpamEnabled,
        rateLimitWindowMinutes: normalizeSettingNumber(
          settingsForm.rateLimitWindowMinutes,
          settings.rateLimitWindowMinutes,
        ),
        postLimitPerWindow: normalizeSettingNumber(
          settingsForm.postLimitPerWindow,
          settings.postLimitPerWindow,
        ),
        commentLimitPerWindow: normalizeSettingNumber(
          settingsForm.commentLimitPerWindow,
          settings.commentLimitPerWindow,
        ),
        duplicateWindowMinutes: normalizeSettingNumber(
          settingsForm.duplicateWindowMinutes,
          settings.duplicateWindowMinutes,
        ),
      });
      setSettings(data.settings);
      setSettingsForm(buildSettingsForm(data.settings));
      toast.success("Pengaturan anti-spam disimpan");
      setIsSettingsModalOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCloseSettingsModal = () => {
    if (settings) {
      setSettingsForm(buildSettingsForm(settings));
    }
    setIsSettingsModalOpen(false);
  };

  // Menambah atau menghapus post dari pilihan hapus massal.
  const toggleSelectedPost = (postId: string) => {
    setSelectedPostIds((current) =>
      current.includes(postId) ? current.filter((id) => id !== postId) : [...current, postId],
    );
  };

  // Menghapus satu post atau seluruh post yang dipilih setelah konfirmasi.
  const handleRemovePosts = async () => {
    const postIds = deletePostId ? [deletePostId] : selectedPostIds;
    if (!postIds.length) return;
    setIsDeleting(true);
    try {
      if (postIds.length === 1) {
        await forumModerationApi.removePost(postIds[0]);
      } else {
        await forumModerationApi.bulkRemovePosts(postIds);
      }
      toast.success(postIds.length === 1 ? "Post dihapus" : `${postIds.length} post dihapus`);
      setDeletePostId(null);
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  // Memberikan strike untuk author post dan menampilkan hasil ban otomatis.
  const handleCreateStrike = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!strikePost) return;
    setIsSubmittingStrike(true);
    try {
      const { data } = await forumModerationApi.createStrike({
        userId: strikePost.authorId,
        postId: strikePost.id,
        reason: strikeReason,
      });
      toast.success(
        data.isBanned
          ? "Strike ketiga tercatat. Akun pengguna diblokir permanen."
          : `Strike tercatat. Total strike: ${data.strikeCount}.`,
      );
      setStrikePost(null);
      setStrikeReason("");
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmittingStrike(false);
    }
  };

  // Menerapkan kata kunci pencarian ke daftar moderasi.
  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const selectedCount = selectedPostIds.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-semibold text-blue-600">Moderasi komunitas</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Forum</h1>
          <p className="mt-2 text-sm text-gray-600">Tinjau diskusi, hapus spam, dan catat pelanggaran pengguna.</p>
        </div>
        <div className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 sm:max-w-md">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-sm font-medium text-gray-900">Anti-spam</p><p className="text-xs text-gray-500">Batas post dan komentar per pengguna</p></div>
            <Switch
              checked={settings?.isAntiSpamEnabled || false}
              onCheckedChange={() => setIsAntiSpamConfirmOpen(true)}
              disabled={isSavingSettings || !settings}
            />
          </div>
          <div className="mt-3 flex items-center justify-end gap-3 border-t border-gray-100 pt-3">
            <p className="text-right text-xs text-gray-500">{settings ? `${settings.postLimitPerWindow} post & ${settings.commentLimitPerWindow} komentar / ${settings.rateLimitWindowMinutes} mnt` : "Memuat batas anti-spam..."}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => setIsSettingsModalOpen(true)} disabled={!settings}><SlidersHorizontal className="mr-2 h-4 w-4" />Atur batas</Button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <form onSubmit={handleSearch} className="flex w-full max-w-md gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-gray-300 px-3 py-2"><Search className="h-4 w-4 text-gray-400" /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Cari post atau pengguna..." className="min-w-0 flex-1 text-sm outline-none" /></div>
            <Button type="submit" variant="outline">Cari</Button>
          </form>
          {selectedCount > 0 && <Button variant="danger" size="sm" onClick={() => setIsBulkDeleteOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Hapus {selectedCount} post</Button>}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
        ) : posts.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">Tidak ada post forum yang ditemukan.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="w-12 px-4 py-3"><input type="checkbox" checked={selectedCount === posts.filter((post) => post.status === "PUBLISHED").length} onChange={(event) => setSelectedPostIds(event.target.checked ? posts.filter((post) => post.status === "PUBLISHED").map((post) => post.id) : [])} /></th><th className="px-4 py-3">Post</th><th className="px-4 py-3">Penulis</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Interaksi</th><th className="w-44 px-4 py-3 text-center">Aksi</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {posts.map((post) => {
                  const selectable = post.status === "PUBLISHED";
                  return <tr key={post.id} className="align-top"><td className="px-4 py-4"><input type="checkbox" disabled={!selectable} checked={selectedPostIds.includes(post.id)} onChange={() => toggleSelectedPost(post.id)} /></td><td className="max-w-md px-4 py-4"><p className="font-medium text-gray-900">{post.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{post.content}</p><p className="mt-2 text-xs text-gray-400">{formatDate(post.createdAt)}</p></td><td className="px-4 py-4"><div className="flex items-center gap-2"><Avatar src={post.author.avatar} firstName={post.author.firstName} lastName={post.author.lastName} size="sm" /><div><p className="font-medium text-gray-800">{post.author.firstName} {post.author.lastName}</p><p className="text-xs text-gray-500">{post.author.role}</p></div></div></td><td className="px-4 py-4"><span className={`rounded-full px-2 py-1 text-xs font-medium ${post.status === "PUBLISHED" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>{post.status === "PUBLISHED" ? "Aktif" : "Dihapus"}</span></td><td className="px-4 py-4 text-xs text-gray-600">{post._count.likes} like<br />{post._count.comments} komentar<br />{post._count.strikes || 0} strike post</td><td className="px-4 py-4"><div className="flex justify-center gap-2">{selectable && <><Button size="sm" variant="outline" onClick={() => { setStrikePost(post); setStrikeReason(""); }}><ShieldAlert className="mr-1.5 h-4 w-4" />Strike</Button><Button size="sm" variant="danger" onClick={() => setDeletePostId(post.id)}><Trash2 className="h-4 w-4" /></Button></>}</div></td></tr>;
                })}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && posts.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              Menampilkan {posts.length} dari {pagination.total} post
            </p>
            <Pagination page={pagination.page} totalPages={pagination.pages} onPageChange={setPage} />
          </div>
        )}
      </div>

      <Modal isOpen={isSettingsModalOpen} onClose={handleCloseSettingsModal} title="Pengaturan anti-spam" description="Atur batas aktivitas dan deteksi duplikat forum.">
        <form onSubmit={handleSaveSettings} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-gray-700">Periode batas aktivitas (mnt)<input type="number" min={1} max={1440} value={settingsForm.rateLimitWindowMinutes} onChange={(event) => setSettingsForm((current) => ({ ...current, rateLimitWindowMinutes: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /><span className="mt-1 block text-xs font-normal text-gray-500">Dipakai untuk menghitung batas post dan komentar.</span></label>
            <label className="block text-sm font-medium text-gray-700">Maks. post per periode<input type="number" min={1} max={100} value={settingsForm.postLimitPerWindow} onChange={(event) => setSettingsForm((current) => ({ ...current, postLimitPerWindow: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
            <label className="block text-sm font-medium text-gray-700">Maks. komentar per periode<input type="number" min={1} max={500} value={settingsForm.commentLimitPerWindow} onChange={(event) => setSettingsForm((current) => ({ ...current, commentLimitPerWindow: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
            <label className="block text-sm font-medium text-gray-700">Periode cek duplikat (mnt)<input type="number" min={1} max={1440} value={settingsForm.duplicateWindowMinutes} onChange={(event) => setSettingsForm((current) => ({ ...current, duplicateWindowMinutes: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /><span className="mt-1 block text-xs font-normal text-gray-500">Dipakai untuk menolak konten yang sama.</span></label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCloseSettingsModal} disabled={isSavingSettings}>Batal</Button>
            <Button type="submit" isLoading={isSavingSettings} disabled={!settings}><Save className="mr-2 h-4 w-4" />Simpan batas</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isAntiSpamConfirmOpen}
        onClose={() => setIsAntiSpamConfirmOpen(false)}
        onConfirm={handleToggleAntiSpam}
        title={settings?.isAntiSpamEnabled ? "Nonaktifkan anti-spam?" : "Aktifkan anti-spam?"}
        message={
          settings?.isAntiSpamEnabled
            ? "Post dan komentar baru tidak lagi dibatasi otomatis oleh aturan anti-spam."
            : "Post dan komentar baru akan dibatasi otomatis berdasarkan aturan anti-spam."
        }
        confirmText={settings?.isAntiSpamEnabled ? "Nonaktifkan" : "Aktifkan"}
        variant="warning"
        isLoading={isSavingSettings}
      />

      <ConfirmDialog
        isOpen={Boolean(deletePostId) || isBulkDeleteOpen}
        onClose={() => { setDeletePostId(null); setIsBulkDeleteOpen(false); }}
        onConfirm={handleRemovePosts}
        title={deletePostId ? "Hapus post forum?" : "Hapus post terpilih?"}
        message={deletePostId ? "Post akan disembunyikan dari forum publik." : `${selectedCount} post akan disembunyikan dari forum publik.`}
        confirmText="Hapus"
        isLoading={isDeleting}
      />

      <Modal isOpen={Boolean(strikePost)} onClose={() => setStrikePost(null)} title="Beri strike forum" description="Strike ketiga akan memblokir akun pengguna secara permanen.">
        <form onSubmit={handleCreateStrike} className="space-y-4">
          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="mr-2 inline h-4 w-4" />Pastikan pelanggaran sudah ditinjau sebelum memberikan strike.</div>
          <Textarea label="Alasan strike" value={strikeReason} onChange={(event) => setStrikeReason(event.target.value)} maxLength={500} placeholder="Contoh: Promosi berulang yang tidak relevan." />
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setStrikePost(null)}>Batal</Button><Button type="submit" variant="danger" isLoading={isSubmittingStrike}>Catat strike</Button></div>
        </form>
      </Modal>
    </div>
  );
}
