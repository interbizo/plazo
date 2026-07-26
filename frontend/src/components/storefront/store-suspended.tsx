"use client";

import Link from "next/link";
import { Store } from "lucide-react";

export function StoreSuspended() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
          <Store className="h-10 w-10 text-orange-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Toko Dinonaktifkan Sementara
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Toko ini sedang dalam peninjauan oleh admin dan tidak dapat diakses
          untuk sementara waktu. Silakan kembali lagi nanti.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}

/**
 * Check if an error is a store suspended error
 */
export function isStoreSuspendedError(error: unknown): boolean {
  const message = (error as any)?.response?.data?.message || "";
  return message === "STORE_SUSPENDED";
}
