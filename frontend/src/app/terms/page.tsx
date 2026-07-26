"use client";

import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Syarat &amp; Ketentuan
        </h1>
        <p className="text-gray-500 mb-8">Plazo Marketplace</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              1. Ketentuan Umum
            </h2>
            <p>
              Dengan mengakses dan menggunakan platform Plazo Marketplace, Anda
              menyetujui untuk terikat oleh syarat dan ketentuan ini. Platform
              ini menyediakan layanan marketplace yang menghubungkan penjual dan
              pembeli. Kami berhak untuk mengubah ketentuan ini sewaktu-waktu
              tanpa pemberitahuan terlebih dahulu. Penggunaan berkelanjutan atas
              platform ini setelah perubahan dianggap sebagai persetujuan Anda
              terhadap ketentuan yang diperbarui.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              2. Akun Pengguna
            </h2>
            <p>
              Setiap pengguna wajib mendaftarkan akun dengan informasi yang
              akurat dan lengkap. Anda bertanggung jawab penuh atas keamanan
              akun Anda, termasuk menjaga kerahasiaan kata sandi. Segala
              aktivitas yang terjadi melalui akun Anda menjadi tanggung jawab
              Anda. Kami berhak menangguhkan atau menghapus akun yang melanggar
              ketentuan ini.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              3. Transaksi
            </h2>
            <p>
              Semua transaksi yang dilakukan melalui Plazo Marketplace tunduk
              pada kebijakan pembayaran dan pengembalian yang berlaku. Pembeli
              wajib melakukan pembayaran sesuai dengan harga yang tertera.
              Penjual wajib mengirimkan produk atau layanan sesuai dengan
              deskripsi yang diberikan. Plazo bertindak sebagai perantara dan
              menggunakan sistem escrow untuk melindungi kedua belah pihak.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              4. Hak Kekayaan Intelektual
            </h2>
            <p>
              Seluruh konten yang terdapat di platform ini, termasuk namun tidak
              terbatas pada logo, desain, teks, dan grafis, merupakan milik
              Plazo atau pemberi lisensinya. Pengguna dilarang menyalin,
              memodifikasi, atau mendistribusikan konten platform tanpa izin
              tertulis. Penjual menjamin bahwa produk dan layanan yang
              ditawarkan tidak melanggar hak kekayaan intelektual pihak ketiga.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              5. Pembatasan Tanggung Jawab
            </h2>
            <p>
              Plazo Marketplace tidak bertanggung jawab atas kerugian langsung
              maupun tidak langsung yang timbul dari penggunaan platform ini.
              Kami tidak menjamin ketersediaan layanan secara terus-menerus dan
              tidak bertanggung jawab atas gangguan teknis. Penyelesaian sengketa
              antara penjual dan pembeli akan difasilitasi oleh Plazo, namun
              keputusan akhir berada di tangan pihak yang bersengketa sesuai
              hukum yang berlaku.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            &larr; Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
