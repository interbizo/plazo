"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  marketplaceApi,
  type BrowseParams,
  type SortBy,
} from "@/services/marketplace.service";
import { getErrorMessage } from "@/lib/api";
import type { Job } from "@/types";
import { JobCard } from "@/components/shared/job-card";
import { SearchBar } from "@/components/shared/search-bar";
import { Pagination } from "@/components/shared/pagination";
import { HomeButton } from "@/components/shared/home-button";
import { EmptyState } from "@/components/ui/empty-state";
import { LocationSelect } from "@/components/ui/location-select";
import { JobListSkeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";
import { PageTitle } from "@/components/shared/page-title";
import { FeatureFlagGate } from "@/components/shared/feature-flag-gate";

const STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "OPEN", label: "Terbuka" },
  { value: "IN_REVIEW", label: "Dalam Review" },
  { value: "HIRED", label: "Dipekerjakan" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Terbaru" },
  { value: "price_high", label: "Budget: Tinggi ke Rendah" },
  { value: "price_low", label: "Budget: Rendah ke Tinggi" },
  { value: "popular", label: "Populer" },
];

function BrowseJobsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const page = Number(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const province = searchParams.get("province") || "";
  const provinceId = searchParams.get("provinceId") || province;
  const city = searchParams.get("city") || "";
  const cityId = searchParams.get("cityId") || city;
  const status = searchParams.get("status") || "";
  const sortBy = searchParams.get("sort") || "newest";

  const [searchInput, setSearchInput] = useState(search);
  const [provinceInput, setProvinceInput] = useState(province);
  const [provinceIdInput, setProvinceIdInput] = useState(provinceId);
  const [cityInput, setCityInput] = useState(city);
  const [cityIdInput, setCityIdInput] = useState(cityId);

  const updateURL = useCallback(
    (params: Record<string, string>) => {
      const sp = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([k, v]) => {
        if (v) sp.set(k, v);
        else sp.delete(k);
      });
      if (!("page" in params)) sp.set("page", "1");
      router.push(`/jobs?${sp.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    const fetchJobs = async () => {
      setIsLoading(true);
      try {
        const params: BrowseParams & { status?: string } = {
          page,
          limit: 15,
          sortBy: sortBy as SortBy,
        };
        if (search) params.search = search;
        if (province) params.province = province;
        if (city) params.city = city;
        if (status) params.status = status;

        const { data } = await marketplaceApi.getJobs(params);
        setJobs(data.data);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.pages);
      } catch (err) {
        console.error(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    fetchJobs();
  }, [page, search, province, city, status, sortBy]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <PageTitle title="Lowongan & Proyek" />
      
      {/* Home Button */}
      <div className="mb-4">
        <HomeButton variant="minimal" />
      </div>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lowongan & Proyek</h1>
        <p className="mt-1 text-sm text-gray-500">
          {total > 0
            ? `${total.toLocaleString("id-ID")} pekerjaan ditemukan`
            : "Temukan proyek freelance"}
        </p>
      </div>

      {/* Search + Filters */}
      <div className="mb-6 space-y-3">
        <SearchBar
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Cari pekerjaan atau proyek..."
          onSubmit={() => updateURL({ search: searchInput, page: "1" })}
        />
        <div className="space-y-3">
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <LocationSelect
              provinceValue={provinceIdInput}
              cityValue={cityIdInput}
              onProvinceChange={(selectedProvinceId, selectedProvinceName) => {
                setProvinceIdInput(selectedProvinceId);
                setProvinceInput(selectedProvinceName);
              }}
              onCityChange={(selectedCityId, selectedCityName) => {
                setCityIdInput(selectedCityId);
                setCityInput(selectedCityName);
              }}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() =>
                  updateURL({
                    province: provinceInput,
                    provinceId: provinceIdInput,
                    city: cityInput,
                    cityId: cityIdInput,
                    page: "1",
                  })
                }
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
              >
                Terapkan Lokasi
              </button>
              <button
                onClick={() => {
                  setProvinceInput("");
                  setProvinceIdInput("");
                  setCityInput("");
                  setCityIdInput("");
                  updateURL({
                    province: "",
                    provinceId: "",
                    city: "",
                    cityId: "",
                    page: "1",
                  });
                }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Reset Lokasi
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
            value={status}
            onChange={(e) => updateURL({ status: e.target.value, page: "1" })}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => updateURL({ sort: e.target.value, page: "1" })}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          </div>
        </div>
      </div>

      {/* Jobs List */}
      {isLoading ? (
        <JobListSkeleton count={6} />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12 text-gray-300" />}
          title="Tidak ada pekerjaan ditemukan"
          description="Coba ubah kata kunci atau filter pencarian Anda."
        />
      ) : (
        <>
          <div className="space-y-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
          <div className="mt-8">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(p) => updateURL({ page: String(p) })}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default function BrowseJobsPage() {
  return (
    <FeatureFlagGate flag="module.jobs" showNotFound={true}>
      <Suspense
        fallback={
          <div className="mx-auto max-w-7xl px-4 py-8">
            <JobListSkeleton count={6} />
          </div>
        }
      >
        <BrowseJobsContent />
      </Suspense>
    </FeatureFlagGate>
  );
}
