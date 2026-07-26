"use client";

import { useEffect, useState, useRef } from "react";
import { sellerApi } from "@/services/seller.service";
import { authApi } from "@/services/auth.service";
import { uploadApi } from "@/services/upload.service";
import { useAuthStore } from "@/stores/auth.store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { OnlineStatusBadge } from "@/components/shared/online-status-badge";
import { Camera, Upload as UploadIcon } from "lucide-react";
import { validateImageFile } from "@/lib/file-validation";
import toast from "react-hot-toast";

interface SellerProfile {
  bio?: string;
  skills?: string[];
  website?: string;
  linkedin?: string;
  github?: string;
  averageRating?: number;
  totalReviews?: number;
  lastActiveAt?: string | null;
  [key: string]: unknown;
}

interface LevelRequirement {
  current: number;
  required: number;
  met: boolean;
}

interface VerificationData {
  seller?: {
    level?: string;
    nextLevel?: string;
    progress?: number;
    requirements?: Record<string, LevelRequirement>;
  };
  [key: string]: unknown;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

export default function SellerProfilePage() {
  const { user, setUser } = useAuthStore();
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    bio: "",
    skills: "",
    website: "",
    linkedin: "",
    github: "",
  });

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const effectiveLastActiveAt = (profile?.lastActiveAt as string | undefined) || user?.lastActiveAt || null;

  useEffect(() => {
    const load = async () => {
      try {
        const [profRes, verRes] = await Promise.all([
          sellerApi.getProfile(),
          sellerApi.getVerificationStatus(),
        ]);
        setProfile(profRes.data.data);
        setVerification(verRes.data);
        if (user && profRes.data.data?.lastActiveAt && profRes.data.data.lastActiveAt !== user.lastActiveAt) {
          setUser({ ...user, lastActiveAt: profRes.data.data.lastActiveAt });
        }
        setForm({
          bio: profRes.data.data?.bio || "",
          skills: (profRes.data.data?.skills || []).join(", "),
          website: profRes.data.data?.website || "",
          linkedin: profRes.data.data?.linkedin || "",
          github: profRes.data.data?.github || "",
        });
      } catch {
        /* Silently handle - default empty state will be shown */
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await sellerApi.updateProfile({
        bio: form.bio,
        skills: form.skills ? form.skills.split(",").map((s) => s.trim()) : [],
        website: form.website,
        linkedin: form.linkedin,
        github: form.github,
      });
      toast.success("Profil berhasil diperbarui!");
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      toast.error(apiErr?.response?.data?.message || "Gagal menyimpan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password baru minimal 6 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }
    setIsChangingPassword(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      toast.success("Password berhasil diubah!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      toast.error(apiErr?.response?.data?.message || "Gagal mengubah password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const error = validateImageFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data } = await uploadApi.uploadFile(formData, "AVATAR");
      
      // Update user profile with new avatar
      await authApi.updateProfile({ avatar: data.file.url });
      
      // Update local state
      if (user) {
        setUser({ ...user, avatar: data.file.url });
      }
      
      toast.success("Foto profil berhasil diperbarui!");
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      toast.error(apiErr?.response?.data?.message || "Gagal upload foto");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Profil Penjual</h1>

      {/* User Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="relative group">
            <Avatar
              src={user?.avatar}
              firstName={user?.firstName}
              lastName={user?.lastName}
              size="xl"
            />
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {isUploadingAvatar ? (
                <Spinner size="sm" />
              ) : (
                <Camera className="h-6 w-6 text-white" />
              )}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <OnlineStatusBadge lastActiveAt={effectiveLastActiveAt} showText size="sm" />
              {verification?.seller?.level && (
                <Badge variant="info">
                  {verification.seller.level.replace(/_/g, " ")}
                </Badge>
              )}
              {profile && (
                <span className="text-xs text-gray-400">
                  ★ {profile.averageRating?.toFixed(1) || "0"} (
                  {profile.totalReviews || 0} ulasan)
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Klik foto profil untuk mengubah. Maksimal 10MB, format JPG/PNG.
        </p>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSave} className="space-y-5 max-w-2xl">
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Informasi Profil
          </h2>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Bio
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="Ceritakan tentang keahlian dan pengalaman Anda..."
            />
          </div>

          <Input
            label="Skills"
            value={form.skills}
            onChange={(e) => setForm({ ...form, skills: e.target.value })}
            placeholder="React, Node.js, Figma (pisahkan dengan koma)"
          />
        </div>

        <Button type="submit" isLoading={isSaving}>
          Simpan Profil
        </Button>
      </form>

      {/* Change Password Section */}
      <form onSubmit={handleChangePassword} className="space-y-5 max-w-2xl mt-8">
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Ubah Password</h2>

          <Input
            label="Password Saat Ini"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Masukkan password saat ini"
          />

          <Input
            label="Password Baru"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
          />

          <Input
            label="Konfirmasi Password Baru"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Ulangi password baru"
          />
        </div>

        <Button type="submit" isLoading={isChangingPassword}>
          Ubah Password
        </Button>
      </form>
    </div>
  );
}
