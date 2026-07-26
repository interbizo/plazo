import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-7xl font-extrabold text-blue-600">404</p>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">
        Halaman Tidak Ditemukan
      </h1>
      <p className="mt-2 text-gray-600">
        Maaf, halaman yang Anda cari tidak tersedia atau sudah dipindahkan.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          Kembali ke Beranda
        </Link>
        <Link
          href="/products"
          className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Jelajahi Produk
        </Link>
      </div>
    </div>
  );
}
