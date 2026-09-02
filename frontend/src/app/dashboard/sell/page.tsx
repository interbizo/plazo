"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { LocationSelect } from "@/components/ui/location-select";
import { ShippingDestinationSelect } from "@/components/ui/shipping-destination-select";
import { authApi } from "@/services/auth.service";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

function getDistrictFromShippingLabel(label?: string) {
  return (label || "").split(",").map((part) => part.trim()).filter(Boolean)[1] || "";
}

export default function StartSellingPage() {
  const router = useRouter();
  const { user, fetchUser } = useAuthStore();
  const [form, setForm] = useState({
    name: "",
    subdomain: "",
    address: "",
    province: user?.province || "",
    city: user?.city || "",
    district: "",
    postalCode: "",
    shippingOriginId: "",
    shippingOriginLabel: "",
    referralCode: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role === "SELLER" && user.tenantSubdomain) {
      router.replace("/seller/dashboard/store");
    }
  }, [router, user?.role, user?.tenantSubdomain]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      address: current.address || user?.address || "",
      province: current.province || user?.province || "",
      city: current.city || user?.city || "",
      district: current.district || getDistrictFromShippingLabel(user?.shippingDestinationLabel),
      postalCode: current.postalCode || user?.postalCode || "",
      shippingOriginId: current.shippingOriginId || user?.shippingDestinationId || "",
      shippingOriginLabel: current.shippingOriginLabel || user?.shippingDestinationLabel || "",
    }));
  }, [user?.address, user?.city, user?.postalCode, user?.province, user?.shippingDestinationId, user?.shippingDestinationLabel]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const referralCode = new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase()
      || window.localStorage.getItem("affiliateReferralCode");
    if (referralCode) {
      setForm((current) => current.referralCode ? current : { ...current, referralCode });
    }
  }, []);

  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (form.name.trim().length < 2) nextErrors.name = "Nama toko minimal 2 karakter";
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(form.subdomain)) nextErrors.subdomain = "Gunakan huruf kecil, angka, atau tanda hubung";
    if (form.subdomain.length < 3) nextErrors.subdomain = "Subdomain minimal 3 karakter";
    if (form.address.trim().length < 10) nextErrors.address = "Alamat toko minimal 10 karakter";
    if (!form.province.trim()) nextErrors.province = "Provinsi toko wajib dipilih";
    if (form.city.trim().length < 2) nextErrors.city = "Kota toko wajib diisi";
    if (form.district.trim().length < 2) nextErrors.district = "Kecamatan toko wajib dipilih";
    if (!/^\d{5}$/.test(form.postalCode)) nextErrors.postalCode = "Kode pos harus 5 digit";
    if (!form.shippingOriginId) nextErrors.shippingOriginId = "Kelurahan dan kode pos wajib dipilih";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      await authApi.createTenant({
        name: form.name.trim(),
        subdomain: form.subdomain,
        address: form.address.trim(),
        province: form.province.trim(),
        city: form.city.trim(),
        postalCode: form.postalCode,
        shippingOriginId: form.shippingOriginId,
        shippingOriginLabel: form.shippingOriginLabel,
        referralCode: form.referralCode.trim() || undefined,
      });
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("affiliateReferralCode");
      }
      await fetchUser();
      toast.success("Toko berhasil dibuat. Selamat berjualan!");
      router.replace("/seller/dashboard/store");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-3xl border border-emerald-100 bg-linear-to-br from-emerald-50 via-white to-blue-50 p-6">
        <div className="mb-4 inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-700"><Store className="h-6 w-6" /></div>
        <h1 className="text-2xl font-bold text-gray-900">Mulai Berjualan</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">Buat toko dengan akun dan nomor WhatsApp yang sama. Anda tetap dapat membeli serta mengelola aktivitas buyer dari dashboard ini.</p>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl border border-gray-200 bg-white p-6">
        <Input id="store-name" label="Nama Toko" placeholder="Contoh: Toko Digital Kreatif" value={form.name} onChange={(event) => update("name", event.target.value)} error={errors.name} required />
        <div>
          <Input id="subdomain" label="Subdomain Toko" placeholder="tokodigital" value={form.subdomain} onChange={(event) => update("subdomain", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} error={errors.subdomain} required />
          <p className="mt-1.5 text-xs text-gray-500">Alamat toko: <span className="font-medium text-gray-700">{form.subdomain || "subdomain"}.plazo.id</span></p>
        </div>
        <Input id="store-address" label="Alamat Lengkap Toko" placeholder="Jl. Contoh No. 123, RT/RW 01/02" value={form.address} onChange={(event) => update("address", event.target.value)} error={errors.address} required />
        <div>
          <LocationSelect
            provinceValue={form.province}
            cityValue={form.city}
            districtValue={form.district}
            onProvinceChange={(_, province) => {
              setForm((current) => ({ ...current, province, city: "", district: "", postalCode: "", shippingOriginId: "", shippingOriginLabel: "" }));
              setErrors((current) => ({ ...current, province: "", city: "", district: "", postalCode: "", shippingOriginId: "" }));
            }}
            onCityChange={(_, city) => {
              setForm((current) => ({ ...current, city, district: "", postalCode: "", shippingOriginId: "", shippingOriginLabel: "" }));
              setErrors((current) => ({ ...current, city: "", district: "", postalCode: "", shippingOriginId: "" }));
            }}
            onDistrictChange={(_, district) => {
              setForm((current) => ({ ...current, district, postalCode: "", shippingOriginId: "", shippingOriginLabel: "" }));
              setErrors((current) => ({ ...current, district: "", postalCode: "", shippingOriginId: "" }));
            }}
            provinceError={errors.province}
            cityError={errors.city}
            districtError={errors.district}
            required
            showDistrict
          />
          <p className="mt-1.5 text-xs text-gray-500">Pilih lokasi tempat toko beroperasi. Lokasi ini boleh berbeda dari alamat akun buyer.</p>
        </div>
        <ShippingDestinationSelect
          city={form.city}
          province={form.province}
          district={form.district}
          value={form.shippingOriginId}
          valueLabel={form.shippingOriginLabel}
          required
          onChange={(destination) => {
            setForm((current) => ({ ...current, postalCode: destination?.zipCode || "", shippingOriginId: destination ? String(destination.id) : "", shippingOriginLabel: destination?.label || "" }));
            setErrors((current) => ({ ...current, postalCode: "", shippingOriginId: "" }));
          }}
        />
        <Input id="store-postal-code" label="Kode Pos" value={form.postalCode} error={errors.postalCode} readOnly required />
        <Input id="referral-code" label="Kode Referral (Opsional)" placeholder="Contoh: RIZKY-ABC123" value={form.referralCode} onChange={(event) => update("referralCode", event.target.value.toUpperCase())} error={errors.referralCode} />
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => router.push("/dashboard")} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Batal</button>
          <button type="submit" disabled={isSubmitting} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? "Membuat toko..." : "Buat Toko"}</button>
        </div>
      </form>
    </div>
  );
}
