"use client";

import { Wrench } from "lucide-react";
import { useMaintenanceStore } from "@/stores/maintenance.store";

function formatEstimatedEnd(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Pesan maintenance full-screen. Dirender inline (URL TIDAK diubah ke
 * /maintenance) sehingga refresh selalu membuka kembali halaman yang diminta —
 * layar hanya muncul saat maintenance benar-benar aktif.
 */
export function MaintenanceScreen() {
  const { title, message, estimatedEnd } = useMaintenanceStore();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 shadow-sm">
        <Wrench className="h-10 w-10" />
      </div>

      <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-blue-600">
        Plazo Marketplace
      </p>

      <h1 className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl">{title}</h1>

      <p className="mt-3 max-w-lg text-sm leading-relaxed text-gray-600 sm:text-base">
        {message}
      </p>

      {estimatedEnd && (
        <p className="mt-4 rounded-xl bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
          Diperkirakan selesai: {formatEstimatedEnd(estimatedEnd)}
        </p>
      )}
    </div>
  );
}
