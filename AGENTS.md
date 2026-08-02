# AGENTS.md

## Konteks Proyek

Plazo adalah marketplace SaaS multi-tenant. Seller mengelola toko melalui
subdomain, buyer menjelajahi listing dan berkomunikasi dengan seller, sedangkan
admin melakukan moderasi operasional platform.

Baca `README.md` sebelum melakukan pekerjaan besar. Gunakan file tersebut
sebagai dokumentasi utama proyek, lalu lihat `backend/docs/` bila membutuhkan
detail tambahan. Jika dokumentasi berbeda dengan kode, jadikan kode saat ini,
pendaftaran modul aktif di `AppModule`, dan skema Prisma sebagai sumber
kebenaran.

## Arsitektur

- `backend/`: API NestJS, Prisma, PostgreSQL, dan Socket.IO.
- `frontend/`: Next.js App Router, React, Tailwind CSS, dan Zustand.
- `nginx/`: konfigurasi reverse proxy dan routing subdomain.
- Alur request backend: middleware -> guard -> controller -> service -> Prisma.
- Buat controller tetap tipis. Simpan aturan bisnis di service dan validasi
  request di DTO dengan `class-validator` dan `class-transformer`.
- Simpan pemanggilan API frontend di `frontend/src/services`, utilitas bersama
  di `frontend/src/lib`, UI bersama di `frontend/src/components`, dan state
  global di Zustand store.

## Aturan Multi-Tenant dan Keamanan

- Proyek ini menggunakan satu database PostgreSQL dengan isolasi data per
  tenant pada level baris.
- Untuk data yang terkait tenant, ambil tenant aktif dari konteks request yang
  sudah tersedia dan sertakan `tenantId` pada operasi baca, buat, ubah, dan hapus.
- Jangan mempercayai `tenantId` dari client sebagai otoritas untuk mengakses data
  tenant lain.
- Pertahankan pola `TenantMiddleware`, routing subdomain, cookie JWT, dan RBAC
  yang ada. Periksa role terdampak: `BUYER`, `SELLER`, `ADMIN`, dan
  `SUPER_ADMIN`.
- Gunakan helper terpusat yang ada untuk perilaku lintas role dan routing
  notifikasi. Jangan menggandakan pengecekan role di komponen halaman.

## Database dan Prisma

- Skema Prisma berada di `backend/prisma/schema.prisma`; migration berada di
  `backend/prisma/migrations/`.
- Jangan pernah mengubah migration yang sudah ada. Ubah skema Prisma lalu buat
  migration baru dengan nama yang jelas.
- Pertahankan index untuk query tenant-scoped dan filter umum. Tambahkan index
  bila ada pola query baru, terutama untuk gabungan `tenantId` dengan status atau
  filter kepemilikan.
- Relasi many-to-many implisit Prisma menghasilkan tabel penghubung dengan awalan
  underscore, misalnya `_TenantMembers`. Jangan mengganti nama atau bergantung
  langsung pada tabel itu kecuali relasinya sengaja diubah menjadi join model
  eksplisit.
- Utamakan API Prisma daripada raw SQL. Gunakan raw SQL hanya bila diperlukan
  dan selalu parameterized.

## Batasan Produk

- Arah produk aktif menekankan marketplace, storefront, chat, dan notifikasi.
- Cart, order, pembayaran internal, dispute, dan custom offer mungkin masih ada
  di kode atau type, tetapi sebagian dinonaktifkan di
  `backend/src/app.module.ts`. Jangan mengaktifkan atau mengembangkannya tanpa
  permintaan eksplisit.
- Ikuti pola Tailwind dan komponen terdekat yang sudah ada. Hindari refactor
  visual atau arsitektur besar untuk perubahan fitur yang kecil.

## Alur Perubahan

1. Periksa implementasi serupa yang terdekat, type, service, DTO, dan route
   sebelum menambahkan kode.
2. Jaga perubahan tetap dalam scope dan gunakan ulang pola serta helper yang ada.
3. Perbarui type frontend dan kontrak API backend bersama-sama bila payload
   berubah.
4. Jangan mengubah file yang tidak berkaitan atau membatalkan perubahan yang
   sudah ada di worktree.

## Validasi

- Jalankan lint pada area yang diubah.
- Jalankan type checking TypeScript untuk perubahan lintas file.
- Jalankan build backend atau frontend yang relevan bila mengubah kontrak API,
  routing, rendering, atau konfigurasi.
- Uji manual alur pengguna utama untuk setiap role dan tenant yang terdampak.
- Untuk perubahan skema, jalankan Prisma generate dan alur migration yang sesuai
  di environment tujuan.
