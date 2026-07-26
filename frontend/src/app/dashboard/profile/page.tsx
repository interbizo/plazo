"use client";

import { useState, useRef } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { authApi } from "@/services/auth.service";
import { buyerApi } from "@/services/buyer.service";
import { uploadApi } from "@/services/upload.service";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationSelect } from "@/components/ui/location-select";
import { formatDate } from "@/lib/utils";
import {
  Mail,
  Phone,
  Calendar,
  Shield,
  Lock,
  Camera,
  Pencil,
  MapPin,
  Home,
} from "lucide-react";
import toast from "react-hot-toast";

interface ApiErrorResponse {
  response?: { data?: { message?: string } };
}

export default function BuyerProfilePage() {
  const { user, fetchUser } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  // Edit profile
  const [editing, setEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: user?.phone || "",
    bio: user?.bio || "",
    address: user?.address || "",
    city: user?.city || "",
    cityId: "",
    province: user?.province || "",
    provinceId: "",
    postalCode: user?.postalCode || "",
    whatsappNumber: user?.whatsappNumber || "",
  });
  const [profileLoading, setProfileLoading] = useState(false);

  // Password
  const [showPwd, setShowPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwdLoading, setPwdLoading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 10MB");
      return;
    }
    setAvatarLoading(true);
    try {
      const { data } = await uploadApi.uploadFile(file, "AVATAR");
      await buyerApi.updateProfile({ avatar: data.file.url });
      await fetchUser();
      toast.success("Avatar berhasil diperbarui!");
    } catch (err: unknown) {
      toast.error(
        (err as ApiErrorResponse)?.response?.data?.message ||
          "Gagal upload avatar",
      );
    } finally {
      setAvatarLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSaveProfile = async () => {
    setProfileLoading(true);
    try {
      await buyerApi.updateProfile(profileForm);
      await fetchUser();
      toast.success("Profil berhasil diperbarui!");
      setEditing(false);
    } catch (err: unknown) {
      toast.error(
        (err as ApiErrorResponse)?.response?.data?.message ||
          "Gagal memperbarui profil",
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwdForm.currentPassword || !pwdForm.newPassword) {
      toast.error("Semua field wajib diisi");
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      toast.error("Password baru tidak cocok");
      return;
    }
    if (pwdForm.newPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    setPwdLoading(true);
    try {
      await authApi.changePassword({
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      toast.success("Password berhasil diubah!");
      setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPwd(false);
    } catch (err: unknown) {
      toast.error(
        (err as ApiErrorResponse)?.response?.data?.message ||
          "Gagal mengubah password",
      );
    } finally {
      setPwdLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Profil Saya</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar
                src={user.avatar}
                firstName={user.firstName}
                lastName={user.lastName}
                size="xl"
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={avatarLoading}
                className="absolute -bottom-1 -right-1 rounded-full bg-blue-600 p-1.5 text-white hover:bg-blue-700 transition-colors shadow-md"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {user.firstName} {user.lastName}
              </h2>
              <Badge>{user.role === "BUYER" ? "Pembeli" : user.role === "SELLER" ? "Penjual" : user.role}</Badge>
            </div>
          </div>
          {!editing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setProfileForm({
                  firstName: user.firstName || "",
                  lastName: user.lastName || "",
                  phone: user.phone || "",
                  bio: user.bio || "",
                  address: user.address || "",
                  city: user.city || "",
                  cityId: "",
                  province: user.province || "",
                  provinceId: "",
                  postalCode: user.postalCode || "",
                  whatsappNumber: user.whatsappNumber || "",
                });
                setEditing(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Profil
            </Button>
          )}
        </div>

        {editing ? (
          <div className="max-w-md space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Nama Depan"
                value={profileForm.firstName}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, firstName: e.target.value })
                }
              />
              <Input
                label="Nama Belakang"
                value={profileForm.lastName}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, lastName: e.target.value })
                }
              />
            </div>
            <Input
              label="Telepon"
              value={profileForm.phone}
              onChange={(e) =>
                setProfileForm({ ...profileForm, phone: e.target.value })
              }
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                value={profileForm.bio}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, bio: e.target.value })
                }
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            {/* Address Section */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Home className="h-4 w-4 text-gray-400" />
                Alamat Lengkap
              </h3>
              
              <div className="space-y-3">
                <Input
                  label="Alamat Lengkap"
                  value={profileForm.address}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, address: e.target.value })
                  }
                  placeholder="Jl. Contoh No. 123, RT/RW 01/02"
                />

                <LocationSelect
                  provinceValue={profileForm.provinceId}
                  cityValue={profileForm.cityId}
                  onProvinceChange={(id, name) => {
                    setProfileForm((prev) => ({ 
                      ...prev, 
                      provinceId: id, 
                      province: name,
                      cityId: "",
                      city: ""
                    }));
                  }}
                  onCityChange={(id, name) => {
                    setProfileForm((prev) => ({ 
                      ...prev, 
                      cityId: id, 
                      city: name 
                    }));
                  }}
                  showDistrict={false}
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Kode Pos"
                    value={profileForm.postalCode}
                    onChange={(e) =>
                      setProfileForm({ 
                        ...profileForm, 
                        postalCode: e.target.value.replace(/\D/g, '').slice(0, 5) 
                      })
                    }
                    placeholder="12345"
                    maxLength={5}
                  />
                  <Input
                    label="WhatsApp"
                    value={profileForm.whatsappNumber}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, whatsappNumber: e.target.value })
                    }
                    placeholder="08123456789"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button isLoading={profileLoading} onClick={handleSaveProfile}>
                Simpan
              </Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Batal
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                <Mail className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">
                    {user.email}
                  </p>
                </div>
                {user.isEmailVerified && (
                  <span className="ml-auto text-xs text-green-600">
                    ✓ Terverifikasi
                  </span>
                )}
              </div>

              {user.phone && (
                <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Telepon</p>
                    <p className="text-sm font-medium text-gray-900">
                      {user.phone}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Bergabung sejak</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(user.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                <Shield className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-sm font-medium text-gray-900">
                    {user.isActive ? "Aktif" : "Nonaktif"}
                  </p>
                </div>
              </div>
            </div>

            {/* Address Information */}
            {(user.address || user.city || user.province) && (
              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  Alamat Lengkap
                </h3>
                
                {user.address && (
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500 mb-1">Alamat</p>
                    <p className="text-sm font-medium text-gray-900">
                      {user.address}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {user.city && (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500 mb-1">Kota/Kabupaten</p>
                      <p className="text-sm font-medium text-gray-900">
                        {user.city}
                      </p>
                    </div>
                  )}

                  {user.province && (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500 mb-1">Provinsi</p>
                      <p className="text-sm font-medium text-gray-900">
                        {user.province}
                      </p>
                    </div>
                  )}

                  {user.postalCode && (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500 mb-1">Kode Pos</p>
                      <p className="text-sm font-medium text-gray-900">
                        {user.postalCode}
                      </p>
                    </div>
                  )}

                  {user.whatsappNumber && (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500 mb-1">WhatsApp</p>
                      <p className="text-sm font-medium text-gray-900">
                        {user.whatsappNumber}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {user.bio && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  Bio
                </h3>
                <p className="text-sm text-gray-600">{user.bio}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Change Password */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Lock className="h-4 w-4 text-gray-400" /> Ubah Password
          </h2>
          {!showPwd && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPwd(true)}
            >
              Ubah
            </Button>
          )}
        </div>
        {showPwd && (
          <div className="max-w-sm space-y-3">
            <Input
              label="Password Lama"
              type="password"
              value={pwdForm.currentPassword}
              onChange={(e) =>
                setPwdForm({ ...pwdForm, currentPassword: e.target.value })
              }
            />
            <Input
              label="Password Baru"
              type="password"
              value={pwdForm.newPassword}
              onChange={(e) =>
                setPwdForm({ ...pwdForm, newPassword: e.target.value })
              }
            />
            <Input
              label="Konfirmasi Password Baru"
              type="password"
              value={pwdForm.confirmPassword}
              onChange={(e) =>
                setPwdForm({ ...pwdForm, confirmPassword: e.target.value })
              }
            />
            <div className="flex gap-2">
              <Button isLoading={pwdLoading} onClick={handleChangePassword}>
                Simpan
              </Button>
              <Button variant="ghost" onClick={() => setShowPwd(false)}>
                Batal
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
