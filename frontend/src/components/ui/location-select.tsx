"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

interface Province {
  id: string;
  name: string;
}

interface City {
  id: string;
  name: string;
  provinceId: string;
}

interface District {
  id: string;
  name: string;
  cityId: string;
}

interface LocationSelectProps {
  provinceValue?: string;
  cityValue?: string;
  districtValue?: string;
  onProvinceChange?: (provinceId: string, provinceName: string) => void;
  onCityChange?: (cityId: string, cityName: string) => void;
  onDistrictChange?: (districtId: string, districtName: string) => void;
  provinceError?: string;
  cityError?: string;
  districtError?: string;
  required?: boolean;
  showDistrict?: boolean;
}

export function LocationSelect({
  provinceValue = "",
  cityValue = "",
  districtValue = "",
  onProvinceChange,
  onCityChange,
  onDistrictChange,
  provinceError,
  cityError,
  districtError,
  required = false,
  showDistrict = false,
}: LocationSelectProps) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Fetch provinces on mount
  useEffect(() => {
    const fetchProvinces = async () => {
      setLoadingProvinces(true);
      try {
        const response = await fetch(`${apiUrl}/api/location/provinces`);
        if (response.ok) {
          const data = await response.json();
          setProvinces(data.data || []);
        }
      } catch (error) {
        console.error("[LocationSelect] Failed to fetch provinces:", error);
      } finally {
        setLoadingProvinces(false);
      }
    };

    fetchProvinces();
  }, [apiUrl]);

  // Fetch cities when province changes
  useEffect(() => {
    if (!provinceValue) {
      setCities([]);
      setDistricts([]);
      return;
    }

    const fetchCities = async () => {
      setLoadingCities(true);
      try {
        const response = await fetch(
          `${apiUrl}/api/location/cities?provinceId=${provinceValue}`
        );
        if (response.ok) {
          const data = await response.json();
          setCities(data.data || []);
        }
      } catch (error) {
        console.error("[LocationSelect] Failed to fetch cities:", error);
      } finally {
        setLoadingCities(false);
      }
    };

    fetchCities();
  }, [provinceValue, apiUrl]);

  // Fetch districts when city changes
  useEffect(() => {
    if (!cityValue || !showDistrict) {
      setDistricts([]);
      return;
    }

    const fetchDistricts = async () => {
      setLoadingDistricts(true);
      try {
        const response = await fetch(
          `${apiUrl}/api/location/districts?cityId=${cityValue}`
        );
        if (response.ok) {
          const data = await response.json();
          setDistricts(data.data || []);
        }
      } catch (error) {
        console.error("[LocationSelect] Failed to fetch districts:", error);
      } finally {
        setLoadingDistricts(false);
      }
    };

    fetchDistricts();
  }, [cityValue, showDistrict, apiUrl]);

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedProvince = provinces.find((p) => p.id === selectedId);
    if (onProvinceChange && selectedProvince) {
      onProvinceChange(selectedId, selectedProvince.name);
    }
    // Reset city and district when province changes
    if (onCityChange) onCityChange("", "");
    if (onDistrictChange) onDistrictChange("", "");
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedCity = cities.find((c) => c.id === selectedId);
    if (onCityChange && selectedCity) {
      onCityChange(selectedId, selectedCity.name);
    }
    // Reset district when city changes
    if (onDistrictChange) onDistrictChange("", "");
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedDistrict = districts.find((d) => d.id === selectedId);
    if (onDistrictChange && selectedDistrict) {
      onDistrictChange(selectedId, selectedDistrict.name);
    }
  };

  return (
    <div className="space-y-4">
      {/* Province Select */}
      <div>
        <label
          htmlFor="province"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Provinsi {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <select
            id="province"
            value={provinceValue}
            onChange={handleProvinceChange}
            disabled={loadingProvinces}
            className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm text-gray-900 appearance-none focus:outline-none focus:ring-1 ${
              provinceError
                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            } ${loadingProvinces ? "bg-gray-50 cursor-not-allowed" : "bg-white"}`}
            required={required}
          >
            <option value="">
              {loadingProvinces ? "Memuat provinsi..." : "Pilih Provinsi"}
            </option>
            {provinces.map((province) => (
              <option key={province.id} value={province.id}>
                {province.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
        {provinceError && (
          <p className="mt-1 text-sm text-red-600">{provinceError}</p>
        )}
      </div>

      {/* City Select */}
      <div>
        <label
          htmlFor="city"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Kota/Kabupaten {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <select
            id="city"
            value={cityValue}
            onChange={handleCityChange}
            disabled={!provinceValue || loadingCities}
            className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm text-gray-900 appearance-none focus:outline-none focus:ring-1 ${
              cityError
                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            } ${
              !provinceValue || loadingCities
                ? "bg-gray-50 cursor-not-allowed"
                : "bg-white"
            }`}
            required={required}
          >
            <option value="">
              {!provinceValue
                ? "Pilih provinsi terlebih dahulu"
                : loadingCities
                  ? "Memuat kota..."
                  : "Pilih Kota/Kabupaten"}
            </option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
        {cityError && <p className="mt-1 text-sm text-red-600">{cityError}</p>}
      </div>

      {/* District Select (Optional) */}
      {showDistrict && (
        <div>
          <label
            htmlFor="district"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Kecamatan {required && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            <select
              id="district"
              value={districtValue}
              onChange={handleDistrictChange}
              disabled={!cityValue || loadingDistricts}
              className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm text-gray-900 appearance-none focus:outline-none focus:ring-1 ${
                districtError
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              } ${
                !cityValue || loadingDistricts
                  ? "bg-gray-50 cursor-not-allowed"
                  : "bg-white"
              }`}
              required={required}
            >
              <option value="">
                {!cityValue
                  ? "Pilih kota terlebih dahulu"
                  : loadingDistricts
                    ? "Memuat kecamatan..."
                    : "Pilih Kecamatan"}
              </option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          {districtError && (
            <p className="mt-1 text-sm text-red-600">{districtError}</p>
          )}
        </div>
      )}
    </div>
  );
}
