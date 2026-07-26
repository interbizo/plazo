"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Kebijakan Privasi
        </h1>
        <p className="text-gray-500 mb-8">Plazo Marketplace</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              1. Informasi yang Kami Kumpulkan
            </h2>
            <p>
              Kami mengumpulkan informasi pribadi yang Anda berikan saat
              mendaftar, seperti nama, alamat email, nomor telepon, dan alamat.
              Selain itu, kami juga mengumpulkan data penggunaan secara otomatis,
              termasuk alamat IP, jenis perangkat, browser yang digunakan, dan
              halaman yang dikunjungi di platform kami.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              2. Penggunaan Informasi
            </h2>
            <p>
              Informasi yang kami kumpulkan digunakan untuk menyediakan dan
              meningkatkan layanan kami, memproses transaksi, mengirimkan
              notifikasi terkait akun dan transaksi, serta berkomunikasi dengan
              Anda mengenai pembaruan platform. Kami juga dapat menggunakan data
              untuk analisis internal guna meningkatkan pengalaman pengguna.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              3. Keamanan Data
            </h2>
            <p>
              Kami menerapkan langkah-langkah keamanan teknis dan organisasi yang
              sesuai untuk melindungi data pribadi Anda dari akses tidak sah,
              pengubahan, pengungkapan, atau penghancuran. Data sensitif
              dienkripsi selama transmisi menggunakan teknologi SSL/TLS. Meskipun
              demikian, tidak ada metode transmisi data melalui internet yang
              sepenuhnya aman.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              4. Cookie
            </h2>
            <p>
              Platform kami menggunakan cookie dan teknologi pelacakan serupa
              untuk meningkatkan pengalaman pengguna. Cookie digunakan untuk
              mengingat preferensi Anda, menganalisis lalu lintas situs, dan
              menyediakan konten yang dipersonalisasi. Anda dapat mengatur
              browser Anda untuk menolak cookie, namun hal ini dapat memengaruhi
              fungsionalitas platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              5. Hak Pengguna
            </h2>
            <p>
              Anda memiliki hak untuk mengakses, memperbarui, atau menghapus
              data pribadi Anda yang tersimpan di platform kami. Anda juga berhak
              untuk menarik persetujuan atas pemrosesan data kapan saja. Untuk
              menggunakan hak-hak ini, silakan hubungi tim dukungan kami melalui
              halaman kontak atau email resmi kami.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              6. Perubahan Kebijakan
            </h2>
            <p>
              Kami dapat memperbarui kebijakan privasi ini dari waktu ke waktu.
              Perubahan akan diumumkan melalui platform kami dan berlaku efektif
              sejak tanggal publikasi. Kami menyarankan Anda untuk meninjau
              kebijakan ini secara berkala agar tetap mengetahui bagaimana kami
              melindungi informasi Anda.
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
