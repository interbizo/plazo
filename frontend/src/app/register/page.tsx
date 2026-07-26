"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth.store";
import { getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Turnstile, TurnstileRef } from "@/components/ui/turnstile";
import { LocationSelect } from "@/components/ui/location-select";
import { Eye, EyeOff, Check } from "lucide-react";
import toast from "react-hot-toast";

type Role = "BUYER" | "SELLER";

function getSafeReturnUrl(url: string | null): string | null {
  if (!url || !url.startsWith("/")) return null;
  return url;
}

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuthStore();
  const initialRole: Role =
    searchParams.get("role") === "SELLER" ? "SELLER" : "BUYER";
  const returnUrl =
    getSafeReturnUrl(searchParams.get("returnUrl")) ??
    getSafeReturnUrl(searchParams.get("redirect"));
  const referralCode = searchParams.get("ref");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: initialRole,
    address: "",
    city: "",
    cityId: "",
    province: "",
    provinceId: "",
    district: "",
    districtId: "",
    postalCode: "",
    whatsappNumber: "",
    storeName: "",
    storeSubdomain: "",
    storeCity: "",
    storeCityId: "",
    referralCode: referralCode || "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const turnstileRef = useRef<TurnstileRef>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem('pendingVerification');
    }
  }, []);

  useEffect(() => {
    if (referralCode && typeof window !== "undefined") {
      window.localStorage.setItem("affiliateReferralCode", referralCode);
    }
  }, [referralCode]);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = "Nama depan wajib diisi";
    if (!form.lastName.trim()) errs.lastName = "Nama belakang wajib diisi";
    if (!form.email) errs.email = "Email wajib diisi";
    else if (!/\S+@\S+\.\S+/.test(form.email))
      errs.email = "Format email tidak valid";
    if (!form.password) errs.password = "Password wajib diisi";
    else if (form.password.length < 8)
      errs.password = "Password minimal 8 karakter";
    if (form.password !== form.confirmPassword)
      errs.confirmPassword = "Password tidak cocok";
    if (!form.address.trim() || form.address.trim().length < 10)
      errs.address = "Alamat lengkap minimal 10 karakter";
    if (!form.city.trim()) errs.city = "Kota wajib diisi";
    if (!form.province.trim()) errs.province = "Provinsi wajib diisi";
    if (!form.postalCode.trim()) errs.postalCode = "Kode pos wajib diisi";
    else if (!/^\d{5}$/.test(form.postalCode.trim()))
      errs.postalCode = "Kode pos harus 5 digit angka";
    if (!form.whatsappNumber.trim())
      errs.whatsappNumber = "Nomor WhatsApp wajib diisi";
    else if (!/^(\+62|62|0)[0-9]{9,13}$/.test(form.whatsappNumber.replace(/[\s-]/g, '')))
      errs.whatsappNumber = "Format nomor tidak valid (contoh: 08123456789)";
    if (form.role === "SELLER") {
      if (!form.storeName.trim()) errs.storeName = "Nama toko wajib diisi";
      if (!form.storeSubdomain.trim()) errs.storeSubdomain = "Subdomain toko wajib diisi";
      else if (form.storeSubdomain.length < 3)
        errs.storeSubdomain = "Subdomain minimal 3 karakter";
      else if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(form.storeSubdomain.toLowerCase()))
        errs.storeSubdomain = "Hanya huruf kecil, angka, dan tanda hubung";
      if (!form.storeCity.trim()) errs.storeCity = "Kota toko wajib diisi";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!turnstileToken) {
      toast.error("Mohon selesaikan verifikasi keamanan");
      return;
    }

    try {
      setIsLoading(true);
      const payload: any = {
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        role: form.role,
        address: form.address,
        city: form.city,
        province: form.province,
        postalCode: form.postalCode,
        whatsappNumber: form.whatsappNumber.replace(/[\s-]/g, ''),
        turnstileToken,
      };

      if (form.role === "SELLER") {
        payload.storeName = form.storeName;
        payload.storeSubdomain = form.storeSubdomain.toLowerCase();
        payload.storeCity = form.storeCity;
        if (form.referralCode.trim()) {
          payload.referralCode = form.referralCode.trim().toUpperCase();
        }
      }

      const result = await register(payload);

      if (result && result.requiresVerification === true && result.verificationMethods) {
        sessionStorage.setItem('pendingVerification', JSON.stringify({
          user: result.user,
          verificationMethods: result.verificationMethods,
          nextStep: result.nextStep,
        }));
        toast.success(result.message || "Registrasi berhasil! Silakan verifikasi akun.");
        router.push("/verify-account");
      } else {
        toast.success("Registrasi berhasil! Silakan cek email untuk verifikasi.");
        router.push(returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : "/login");
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
      turnstileRef.current?.reset();
      setTurnstileToken("");
    } finally {
      setIsLoading(false);
    }
  };

  const passwordChecks = [
    { label: "Minimal 8 karakter", ok: form.password.length >= 8 },
    { label: "Mengandung huruf", ok: /[a-zA-Z]/.test(form.password) },
    { label: "Mengandung angka", ok: /\d/.test(form.password) },
  ];

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Referral Banner */}
        {referralCode && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-800">
              Kode referral <span className="font-mono font-semibold">{referralCode}</span> telah diterapkan.
              Anda akan mendapat benefit saat berlangganan.
            </p>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Buat Akun Plazo
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Sudah punya akun?{" "}
            <Link
              href={returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : "/login"}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Masuk
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Role Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Daftar sebagai
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(["BUYER", "SELLER"] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => update("role", role)}
                  className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                    form.role === role
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {role === "BUYER" ? "Pembeli" : "Penjual"}
                </button>
              ))}
            </div>
          </div>

          {/* Seller Store Info */}
          {form.role === "SELLER" && (
            <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-5">
              <h3 className="text-sm font-semibold text-gray-900">
                Informasi Toko
              </h3>

              <Input
                id="storeName"
                label="Nama Toko"
                placeholder="Contoh: Toko Digital Kreatif"
                value={form.storeName}
                onChange={(e) => update("storeName", e.target.value)}
                error={errors.storeName}
                required
              />

              <div>
                <Input
                  id="storeSubdomain"
                  label="Subdomain Toko"
                  placeholder="contoh: tokodigital"
                  value={form.storeSubdomain}
                  onChange={(e) => update("storeSubdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  error={errors.storeSubdomain}
                  required
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  URL toko Anda akan menjadi:{" "}
                  <span className="font-medium text-gray-700">
                    {form.storeSubdomain || "subdomain"}.plazo.id
                  </span>
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Subdomain digunakan sebagai alamat URL toko pribadi Anda di Plazo.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Kota Toko <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.storeCityId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const selectedOption = e.target.options[e.target.selectedIndex];
                    const selectedName = selectedOption.text;
                    setForm((prev) => ({ ...prev, storeCityId: selectedId, storeCity: selectedName }));
                    setErrors((prev) => { const next = { ...prev }; delete next.storeCity; return next; });
                  }}
                  disabled={!form.cityId}
                  className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors ${
                    errors.storeCity
                      ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  } ${!form.cityId ? "bg-gray-100 cursor-not-allowed" : ""}`}
                  required
                >
                  <option value="">
                    {!form.cityId ? "Isi alamat terlebih dahulu" : "Pilih kota toko"}
                  </option>
                  {form.cityId && <option value={form.cityId}>{form.city}</option>}
                </select>
                {errors.storeCity && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.storeCity}</p>
                )}
                <p className="mt-1.5 text-xs text-gray-400">
                  Kota toko memudahkan pengguna mencari produk/jasa berdasarkan lokasi terdekat.
                </p>
              </div>

              <Input
                id="referralCode"
                label="Kode Referral (Opsional)"
                placeholder="Masukkan kode referral jika ada"
                value={form.referralCode}
                onChange={(e) => update("referralCode", e.target.value.toUpperCase())}
                error={errors.referralCode}
                readOnly={!!referralCode}
              />
            </div>
          )}

          {/* Personal Info */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="firstName"
              label="Nama Depan"
              placeholder="John"
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              error={errors.firstName}
              autoComplete="given-name"
            />
            <Input
              id="lastName"
              label="Nama Belakang"
              placeholder="Doe"
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              error={errors.lastName}
              autoComplete="family-name"
            />
          </div>

          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="nama@email.com"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            error={errors.email}
            autoComplete="email"
          />

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimal 8 karakter"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                autoComplete="new-password"
                className={`w-full rounded-lg border bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors ${
                  errors.password
                    ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>}
            {form.password && (
              <div className="mt-2 space-y-1">
                {passwordChecks.map((c) => (
                  <div key={c.label} className="flex items-center gap-1.5 text-xs">
                    <Check className={`h-3 w-3 ${c.ok ? "text-green-600" : "text-gray-300"}`} />
                    <span className={c.ok ? "text-green-700" : "text-gray-400"}>{c.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Input
            id="confirmPassword"
            type="password"
            label="Konfirmasi Password"
            placeholder="Ulangi password"
            value={form.confirmPassword}
            onChange={(e) => update("confirmPassword", e.target.value)}
            error={errors.confirmPassword}
            autoComplete="new-password"
          />

          {/* Address Section */}
          <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-5">
            <h3 className="text-sm font-semibold text-gray-900">Alamat</h3>

            <Input
              id="address"
              label="Alamat Lengkap"
              placeholder="Jl. Contoh No. 123, RT/RW 01/02"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              error={errors.address}
              required
            />

            <LocationSelect
              provinceValue={form.provinceId}
              cityValue={form.cityId}
              districtValue={form.districtId}
              onProvinceChange={(id, name) => {
                setForm((prev) => ({ ...prev, provinceId: id, province: name, cityId: "", city: "", districtId: "", district: "" }));
                setErrors((prev) => { const next = { ...prev }; delete next.province; return next; });
              }}
              onCityChange={(id, name) => {
                setForm((prev) => ({ ...prev, cityId: id, city: name, districtId: "", district: "" }));
                setErrors((prev) => { const next = { ...prev }; delete next.city; return next; });
              }}
              onDistrictChange={(id, name) => {
                setForm((prev) => ({ ...prev, districtId: id, district: name }));
                setErrors((prev) => { const next = { ...prev }; delete next.district; return next; });
              }}
              provinceError={errors.province}
              cityError={errors.city}
              districtError={errors.district}
              required
              showDistrict={false}
            />

            <Input
              id="postalCode"
              label="Kode Pos"
              placeholder="12345"
              value={form.postalCode}
              onChange={(e) => update("postalCode", e.target.value.replace(/\D/g, '').slice(0, 5))}
              error={errors.postalCode}
              maxLength={5}
              required
            />

            <div>
              <Input
                id="whatsappNumber"
                label="Nomor WhatsApp"
                placeholder="08123456789"
                value={form.whatsappNumber}
                onChange={(e) => update("whatsappNumber", e.target.value)}
                error={errors.whatsappNumber}
                required
              />
              <p className="mt-1 text-xs text-gray-400">
                Digunakan untuk komunikasi dan notifikasi penting.
              </p>
            </div>
          </div>

          {/* Turnstile */}
          <div className="flex justify-center">
            <Turnstile
              ref={turnstileRef}
              onSuccess={(token) => setTurnstileToken(token)}
              onError={() => { setTurnstileToken(""); toast.error("Verifikasi keamanan gagal."); }}
              onExpire={() => { setTurnstileToken(""); }}
            />
          </div>

          {/* Terms */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="agreeTerms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="agreeTerms" className="text-xs text-gray-500 cursor-pointer select-none leading-relaxed">
              Saya menyetujui{" "}
              <Link href="/terms" className="text-blue-600 hover:underline">Syarat & Ketentuan</Link>{" "}
              dan{" "}
              <Link href="/privacy" className="text-blue-600 hover:underline">Kebijakan Privasi</Link>{" "}
              Plazo.
            </label>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isLoading}
            disabled={!turnstileToken || !agreedToTerms}
          >
            Daftar Sekarang
          </Button>

          {!agreedToTerms && (
            <p className="text-center text-xs text-gray-400">
              Centang persetujuan untuk melanjutkan
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[85vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
