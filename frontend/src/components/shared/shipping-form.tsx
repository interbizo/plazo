"use client";

import { useEffect, useState, useCallback } from "react";
import { regionApi, addressApi, type Region } from "@/services/region.service";
import { MapPin, ChevronDown, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export interface ShippingData {
  name: string;
  phone: string;
  address: string;
  province: string;
  provinceId: string;
  city: string;
  cityId: string;
  district: string;
  districtId: string;
  postalCode: string;
  notes?: string;
}

interface SavedAddress extends ShippingData {
  id: string;
  label: string;
  isDefault: boolean;
}

interface ShippingFormProps {
  value: ShippingData | null;
  onChange: (data: ShippingData) => void;
  errors?: Partial<Record<keyof ShippingData, string>>;
}

export function ShippingForm({ value, onChange, errors }: ShippingFormProps) {
  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  // Region dropdowns
  const [provinces, setProvinces] = useState<Region[]>([]);
  const [cities, setCities] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<Region[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  // Form state
  const [form, setForm] = useState<ShippingData>(
    value || {
      name: "",
      phone: "",
      address: "",
      province: "",
      provinceId: "",
      city: "",
      cityId: "",
      district: "",
      districtId: "",
      postalCode: "",
      notes: "",
    },
  );

  // Load saved addresses
  useEffect(() => {
    addressApi
      .getMyAddresses()
      .then(({ data }) => {
        const addrs = Array.isArray(data) ? data : data?.data || [];
        setSavedAddresses(addrs);
        // Auto-select default address
        const defaultAddr = addrs.find((a: SavedAddress) => a.isDefault);
        if (defaultAddr && !value) {
          selectSavedAddress(defaultAddr);
        } else if (addrs.length === 0) {
          setShowNewForm(true);
        }
      })
      .catch(() => setShowNewForm(true));
  }, []);

  // Load provinces
  useEffect(() => {
    setLoadingProvinces(true);
    regionApi
      .getProvinces()
      .then(({ data }) => setProvinces(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingProvinces(false));
  }, []);

  // Load cities when province changes
  useEffect(() => {
    if (!form.provinceId) {
      setCities([]);
      return;
    }
    setLoadingCities(true);
    regionApi
      .getCities(form.provinceId)
      .then(({ data }) => setCities(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingCities(false));
  }, [form.provinceId]);

  // Load districts when city changes
  useEffect(() => {
    if (!form.cityId) {
      setDistricts([]);
      return;
    }
    setLoadingDistricts(true);
    regionApi
      .getDistricts(form.cityId)
      .then(({ data }) => setDistricts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingDistricts(false));
  }, [form.cityId]);

  const updateField = useCallback(
    (field: keyof ShippingData, val: string) => {
      const updated = { ...form, [field]: val };

      // Reset dependent fields
      if (field === "provinceId") {
        const prov = provinces.find((p) => p.id === val);
        updated.province = prov?.name || "";
        updated.city = "";
        updated.cityId = "";
        updated.district = "";
        updated.districtId = "";
      }
      if (field === "cityId") {
        const c = cities.find((c) => c.id === val);
        updated.city = c?.name || "";
        updated.district = "";
        updated.districtId = "";
      }
      if (field === "districtId") {
        const d = districts.find((d) => d.id === val);
        updated.district = d?.name || "";
      }

      setForm(updated);
      onChange(updated);
    },
    [form, provinces, cities, districts, onChange],
  );

  const selectSavedAddress = (addr: SavedAddress) => {
    setSelectedSavedId(addr.id);
    setShowNewForm(false);
    const data: ShippingData = {
      name: addr.name,
      phone: addr.phone,
      address: addr.address,
      province: addr.province,
      provinceId: addr.provinceId || "",
      city: addr.city,
      cityId: addr.cityId || "",
      district: addr.district,
      districtId: addr.districtId || "",
      postalCode: addr.postalCode,
      notes: "",
    };
    setForm(data);
    onChange(data);
  };

  const inputClass = (field: keyof ShippingData) =>
    `w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 ${
      errors?.[field]
        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
        : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
    }`;

  const selectClass = (field: keyof ShippingData) =>
    `w-full appearance-none rounded-lg border bg-white px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-1 ${
      errors?.[field]
        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
        : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
    }`;

  return (
    <div className="space-y-4">
      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
        <MapPin className="h-5 w-5 text-blue-600" />
        Alamat Pengiriman
      </h3>

      {/* Saved Addresses */}
      {savedAddresses.length > 0 && (
        <div className="space-y-2">
          {savedAddresses.map((addr) => (
            <button
              key={addr.id}
              type="button"
              onClick={() => selectSavedAddress(addr)}
              className={`w-full text-left rounded-lg border-2 p-3 transition-colors ${
                selectedSavedId === addr.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">
                      {addr.label}
                    </span>
                    {addr.isDefault && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                        Utama
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 font-medium">
                    {addr.name} - {addr.phone}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {addr.address}, {addr.district}, {addr.city},{" "}
                    {addr.province} {addr.postalCode}
                  </p>
                </div>
                {selectedSavedId === addr.id && (
                  <Check className="h-5 w-5 text-blue-600 shrink-0 mt-1" />
                )}
              </div>
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              setSelectedSavedId(null);
              setShowNewForm(true);
              setForm({
                name: "",
                phone: "",
                address: "",
                province: "",
                provinceId: "",
                city: "",
                cityId: "",
                district: "",
                districtId: "",
                postalCode: "",
                notes: "",
              });
            }}
            className="w-full rounded-lg border-2 border-dashed border-gray-300 p-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Gunakan Alamat Baru
          </button>
        </div>
      )}

      {/* New Address Form */}
      {showNewForm && (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          {/* Name + Phone */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Penerima <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Nama lengkap penerima"
                className={inputClass("name")}
              />
              {errors?.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                No. Telepon <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="08xxxxxxxxxx"
                className={inputClass("phone")}
              />
              {errors?.phone && (
                <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Province + City + District */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provinsi <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={form.provinceId}
                  onChange={(e) => updateField("provinceId", e.target.value)}
                  disabled={loadingProvinces}
                  className={selectClass("province")}
                >
                  <option value="">
                    {loadingProvinces ? "Memuat..." : "Pilih Provinsi"}
                  </option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
              {errors?.province && (
                <p className="mt-1 text-xs text-red-600">{errors.province}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kota / Kabupaten <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={form.cityId}
                  onChange={(e) => updateField("cityId", e.target.value)}
                  disabled={!form.provinceId || loadingCities}
                  className={selectClass("city")}
                >
                  <option value="">
                    {loadingCities
                      ? "Memuat..."
                      : !form.provinceId
                        ? "Pilih provinsi dulu"
                        : "Pilih Kota"}
                  </option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
              {errors?.city && (
                <p className="mt-1 text-xs text-red-600">{errors.city}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kecamatan <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={form.districtId}
                  onChange={(e) => updateField("districtId", e.target.value)}
                  disabled={!form.cityId || loadingDistricts}
                  className={selectClass("district")}
                >
                  <option value="">
                    {loadingDistricts
                      ? "Memuat..."
                      : !form.cityId
                        ? "Pilih kota dulu"
                        : "Pilih Kecamatan"}
                  </option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
              {errors?.district && (
                <p className="mt-1 text-xs text-red-600">{errors.district}</p>
              )}
            </div>
          </div>

          {/* Full Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alamat Lengkap <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan..."
              rows={2}
              className={`${inputClass("address")} resize-none`}
            />
            {errors?.address && (
              <p className="mt-1 text-xs text-red-600">{errors.address}</p>
            )}
          </div>

          {/* Postal Code + Notes */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kode Pos <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.postalCode}
                onChange={(e) => updateField("postalCode", e.target.value)}
                placeholder="12345"
                maxLength={5}
                className={inputClass("postalCode")}
              />
              {errors?.postalCode && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.postalCode}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catatan untuk Kurir{" "}
                <span className="text-gray-400 text-xs">(opsional)</span>
              </label>
              <input
                type="text"
                value={form.notes || ""}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Patokan, warna rumah, dll"
                className={inputClass("notes")}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
