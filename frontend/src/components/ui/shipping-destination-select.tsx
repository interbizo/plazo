"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  shippingApi,
  type ShippingDestination,
} from "@/services/shipping.service";

interface ShippingDestinationSelectProps {
  city?: string;
  province?: string;
  district?: string;
  value?: string;
  valueLabel?: string;
  onChange: (destination: ShippingDestination | null) => void;
  required?: boolean;
}

function formatStoredDestinationLabel(label: string) {
  const parts = label.split(",").map((part) => part.trim()).filter(Boolean);
  const postalCode = parts.find((part) => /^\d{5}$/.test(part));
  return [parts[0], postalCode].filter(Boolean).join(" - ") || label;
}

export function ShippingDestinationSelect({
  city = "",
  province = "",
  district = "",
  value = "",
  valueLabel = "",
  onChange,
  required = false,
}: ShippingDestinationSelectProps) {
  const [destinations, setDestinations] = useState<ShippingDestination[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [shouldLoadDestinations, setShouldLoadDestinations] = useState(false);

  useEffect(() => {
    if (!city || !province || !district) {
      setDestinations([]);
      setError("");
      return;
    }

    if (value && !shouldLoadDestinations) {
      setDestinations([]);
      setError("");
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError("");

    shippingApi
      .searchDestinationsForLocation(city, province, district)
      .then((data) => {
        if (cancelled) return;
        setDestinations(data);
        if (!data.length) {
          setError("Kelurahan dan kode pos tidak ditemukan di layanan ongkir");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDestinations([]);
          setError("Gagal memuat pilihan kelurahan dari layanan ongkir");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [city, province, district, shouldLoadDestinations, value]);

  const hasSelectedDestination = destinations.some(
    (destination) => String(destination.id) === value,
  );

  return (
    <div>
      <label
        htmlFor="shipping-destination"
        className="mb-1 block text-sm font-medium text-gray-700"
      >
        Kelurahan - Kode Pos {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <select
          id="shipping-destination"
          value={value}
          onFocus={() => setShouldLoadDestinations(true)}
          onChange={(event) => {
            const destination = destinations.find(
              (item) => String(item.id) === event.target.value,
            );
            onChange(destination || null);
          }}
          disabled={!city || !province || !district || isLoading}
          className={[
            "w-full appearance-none rounded-lg border px-3 py-2 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-1",
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500",
            !city || !province || !district || isLoading
              ? "cursor-not-allowed bg-gray-50"
              : "bg-white",
          ].join(" ")}
          required={required}
        >
          <option value="">
            {!city || !province
              ? "Pilih kota terlebih dahulu"
              : !district
                ? "Pilih kecamatan terlebih dahulu"
                : isLoading
                  ? "Memuat kelurahan dan kode pos..."
                  : "Pilih kelurahan dan kode pos"}
          </option>
          {value && !hasSelectedDestination && (
            <option value={value}>{formatStoredDestinationLabel(valueLabel || "Tujuan tersimpan")}</option>
          )}
          {destinations.map((destination) => (
            <option key={destination.id} value={destination.id}>
              {destination.subdistrictName || destination.label}{" - "}
              {destination.zipCode || destination.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
