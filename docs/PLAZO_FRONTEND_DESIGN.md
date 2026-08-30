# Plazo Frontend Design System

Dokumen ini adalah sumber kebenaran visual untuk frontend Plazo. Gunakan untuk
landing page, homepage, marketing page, storefront, feature showcase, pricing,
dashboard yang berhubungan dengan marketing, dan conversion flow.

## 1. Produk, audiens, dan tujuan

Plazo adalah platform B2B SaaS multi-tenant untuk bisnis, seller, dan penyedia
jasa. Plazo membantu mereka membangun storefront digital dengan brand sendiri,
mengelola katalog produk atau layanan, berkomunikasi dengan pelanggan, dan
menjalankan aktivitas bisnis dari satu platform.

Audiens utama:

- Pemilik UMKM yang membutuhkan kehadiran digital profesional.
- Seller yang memerlukan storefront, katalog, dan komunikasi pelanggan.
- Penyedia jasa yang ingin menampilkan layanan dan menerima inquiry.
- Brand berkembang yang ingin membangun hubungan pelanggan sendiri.

Setiap halaman harus memiliki satu pekerjaan utama: membuat audiens bisnis
memahami nilai Plazo dan mengambil satu tindakan yang jelas. Utamakan outcome
bisnis di atas daftar fitur dan jangan menyajikan Plazo hanya sebagai marketplace
konsumen.

## 2. Arah visual Plazo

Plazo harus terasa seperti business operating system: jelas untuk pemilik usaha
kecil, kredibel untuk brand berkembang, dan tetap manusiawi.

Gunakan atribut berikut sebagai filter:

- Jelas, bukan steril.
- Percaya diri, bukan berisik.
- Praktis, bukan kaku.
- Khas, bukan dekoratif.
- Hangat, bukan kekanak-kanakan.
- Ambisius, bukan korporat-generik.

Setiap halaman membutuhkan satu signature element yang berasal dari konteks
produk. Untuk Plazo, gunakan alur bisnis sebagai dasar visual:

```text
Storefront → Product/Service → Customer Chat → Business Activity
```

Utamakan bukti produk nyata—storefront, katalog, chat, dan notifikasi—daripada
dekorasi abstrak atau dashboard palsu.

### Anti-pattern

Jangan gunakan tanpa alasan produk yang kuat:

- Purple gradient sebagai dekorasi default.
- Glassmorphism berlebihan.
- Floating blob atau neon blob tanpa fungsi.
- Feature grid tiga kolom yang diulang di semua section.
- Semua elemen dibuat pill atau rounded secara seragam.
- Emoji sebagai bahasa visual utama.
- Campuran beberapa icon library.
- Metrik, testimonial, integrasi, atau data produk yang fiktif.
- Animasi pada setiap elemen.
- Headline abstrak yang tidak menyebut masalah atau hasil bisnis.

## 3. Proses desain wajib

Sebelum coding, buat design plan singkat:

1. **Subject**: masalah bisnis Plazo yang dibahas.
2. **Audience**: peran bisnis yang dituju.
3. **Single job**: tindakan utama yang diharapkan.
4. **Palette**: 4–6 warna bernama, semantic role, dan hex value.
5. **Typography**: display, body, serta utility/data role bila diperlukan.
6. **Layout**: komposisi dan perilaku responsive.
7. **Signature**: satu visual atau interaksi khas Plazo.
8. **Copy angle**: janji utama dalam bahasa konkret.

Jika rencana tersebut dapat dipakai tanpa perubahan untuk SaaS apa pun, revisi
sampai pilihan desainnya benar-benar berasal dari storefront, katalog, chat, dan
multi-tenant Plazo.

Setelah implementasi, lakukan visual critique: periksa hierarchy, whitespace,
typography, contrast, product proof, copy, dan responsive behavior. Hapus
dekorasi yang tidak membantu pemahaman atau conversion.

## 4. Sistem warna

Kode existing adalah sumber kebenaran pertama. Sebelum memilih warna, periksa:

- `frontend/src/app/globals.css`
- `frontend/src/styles/storefront-theme.css`
- Style komponen UI terdekat

Jika token existing berbeda dengan reference palette di bawah, pertahankan
brand yang sudah berjalan dan gunakan semantic mapping. Jangan mengganti seluruh
warna aplikasi hanya untuk satu halaman.

```css
--plazo-ink: #18253d;        /* primary text dan dark product surface */
--plazo-cobalt: #3559e0;    /* primary action dan active state */
--plazo-sun: #f2b84b;       /* emphasis dan growth moment */
--plazo-mint: #bfe8d1;      /* positive state dan supporting accent */
--plazo-paper: #f7f8fc;     /* page background */
--plazo-white: #ffffff;     /* elevated surface */
--plazo-muted: #67748c;     /* secondary text */
--plazo-line: #d9dfea;      /* border dan divider */
--plazo-danger: #c94252;    /* destructive atau blocking state */
```

Aturan warna:

- Gunakan ink untuk text utama dan dark section yang disengaja.
- Gunakan cobalt untuk CTA utama dan active state.
- Gunakan sun sebagai highlight proof point, bukan CTA kedua yang bersaing.
- Gunakan paper dan white untuk membentuk hierarchy surface.
- Gunakan muted hanya untuk informasi sekunder.
- Pastikan contrast memenuhi WCAG AA.
- Gunakan semantic token, bukan hex literal yang tersebar.
- Gradient hanya boleh digunakan jika memiliki tujuan product-specific.

## 5. Typography

Gunakan tiga role yang jelas:

- **Display** untuk hero dan heading utama; berkarakter tetapi tetap terbaca.
- **Body** untuk paragraph, label, navigation, dan control.
- **Utility** untuk metric, data, product label, atau detail teknis bila perlu.

Periksa konfigurasi Next/font yang sudah ada sebelum menambah font. Utamakan
font yang sudah dipakai project dan jangan menambah remote font dependency untuk
perubahan kecil. Gunakan sentence case untuk UI dan heading.

```text
Display: clamp(2.75rem, 7vw, 6.5rem)
H1:      clamp(2.5rem, 5vw, 5rem)
H2:      clamp(2rem, 3.5vw, 3.5rem)
H3:      clamp(1.25rem, 2vw, 1.75rem)
Body:    1rem–1.125rem, line-height 1.5–1.7
Small:   0.75rem–0.875rem
```

Hero headline harus ringkas dan mudah dipindai. Jangan menggunakan font besar
hanya untuk memenuhi ruang kosong, paragraph all-caps, atau letter spacing
berlebihan.

## 6. Spacing dan layout

Gunakan rhythm dasar 4px:

```text
4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128px
```

Layout defaults:

- Content max-width: 1200–1280px.
- Mobile gutter: 20–24px.
- Desktop gutter: 32–48px.
- Section padding: 56–80px di mobile dan 80–128px di desktop.
- Heading dan content sejajar pada page rail yang konsisten.
- Pilih layout yang mendukung cerita: asymmetric hero, editorial split,
  product-led composition, atau wide interactive panel.
- Jangan membuat semua section menjadi centered three-column grid.
- Jangan pernah menimbulkan horizontal overflow.

## 7. Shape, border, dan elevation

```text
Small control radius:      8px
Standard card radius:      12px
Feature surface radius:    20px
Hero/product radius:       24–28px
Hairline border:           1px semantic line color
Soft elevation:            0 12px 32px rgba(24, 37, 61, 0.08)
Strong product elevation:  0 24px 64px rgba(24, 37, 61, 0.14)
```

Jangan membulatkan semua elemen. Border harus memperjelas grouping, bukan
dekorasi otomatis. Shadow harus menunjukkan layer nyata dan tidak ditumpuk
berlebihan.

## 8. Buttons dan controls

Gunakan satu CTA paling dominan pada setiap viewport. Label harus berbasis hasil,
misalnya `Buat toko gratis`, `Mulai gunakan Plazo`, atau `Lihat cara kerja`.
Hindari `Submit`, `Learn more`, dan `Click here` jika action dapat
dijelaskan lebih spesifik.

Primary CTA memiliki tinggi minimal 44px, atau 48–52px pada hero. Sediakan
hover, focus, pressed, disabled, dan loading state. Secondary CTA digunakan
untuk demo, eksplorasi fitur, atau action berkomitmen rendah dan harus lebih
tenang secara visual.

Gunakan Button, Input, Badge, Modal, dan navigation component existing sebelum
membuat variasi baru. Nama action harus konsisten dari button, modal, toast,
sampai halaman tujuan.

## 9. Product visual language

Gunakan evidence produk:

- **Storefront preview**: brand identity, katalog, dan customer-facing clarity.
- **Catalog preview**: produk/service, metadata, harga, availability, dan action.
- **Chat preview**: percakapan yang masuk akal dengan affordance jelas.
- **Dashboard preview**: hanya metric dan control yang mendukung claim.
- **Notification preview**: aktivitas bisnis tepat waktu tanpa noise.

Mockup harus berasal dari capability Plazo yang nyata. Jangan membuat data,
integrasi, statistik, atau workflow fiktif hanya untuk mempercantik screenshot.

## 10. Icons, imagery, dan motion

Ikuti icon system existing—gunakan konvensi Lucide bila sudah tersedia. Jaga
stroke weight dan optical size konsisten. Jangan mencampur emoji, SVG style,
dan banyak icon library.

Utamakan screenshot produk atau UI composition dibanding stock photography.
Gambar harus memiliki aspect ratio, dimensi, dan alt text yang jelas. Gunakan
image generation hanya untuk aset pendukung orisinal, bukan bukti produk atau
customer yang dibuat-buat.

Motion harus membantu memahami produk:

```text
Micro feedback:       120–180ms
Component transition: 200–320ms
Hero/section reveal:  400–700ms
```

Gunakan satu hero/page-load sequence yang terkoordinasi, hover/focus feedback,
dan scroll reveal hanya jika memperjelas reading order. Hormati
`prefers-reduced-motion`, jangan menganimasikan setiap card, dan jangan
menunda CTA atau menyebabkan layout shift.

## 11. Landing-page narrative

Gunakan urutan berikut sebagai default dan hapus section yang tidak mendukung
single job halaman:

1. Navigation: brand, product area, proof/pricing, sign in, primary CTA.
2. Hero: hasil bisnis, supporting copy, CTA, dan signature product composition.
3. Proof strip: capability atau trust signal yang nyata.
4. Reality check: workflow yang masih terpecah dan biaya operasionalnya.
5. Product story: storefront, product/service, chat, dan notification sebagai
   satu connected flow.
6. Use cases: seller, service provider, dan growing business.
7. How it works: gunakan numbering hanya jika urutan memang penting.
8. Trust and ownership: tenant isolation dan business ownership jika didukung
   produk.
9. Pricing, FAQ, atau demo hanya jika informasinya current dan benar.
10. Final CTA dengan friction serendah mungkin.

Tokokulo.id boleh digunakan sebagai inspirasi pola SaaS—hero kuat, pain-point
narrative, product proof, use cases, dan CTA berulang—tetapi jangan menyalin
copy, claim, asset, section order, atau visual identity-nya.

## 12. Copy system

- Tulis dari sisi pemilik bisnis yang membaca halaman.
- Sebutkan apa yang dapat dikontrol pengguna, bukan istilah arsitektur sistem.
- Mulai dari outcome konkret, lalu jelaskan mekanismenya.
- Gunakan bahasa Indonesia yang aktif, jelas, dan conversational.
- Setiap elemen memiliki satu pekerjaan.
- Gunakan istilah yang sama untuk action yang sama.
- Error state harus menjelaskan apa yang terjadi dan langkah berikutnya.
- Empty state harus mengarahkan pengguna pada action yang relevan.
- Jangan mengarang harga, guarantee, jumlah customer, testimonial, logo,
  integration, atau performance claim.

## 13. Aturan implementasi repository

Sebelum mengubah kode:

1. Baca `README.md` dan `AGENTS.md`.
2. Inspect landing page saat ini dan komponen terkait terdekat.
3. Baca `frontend/src/app/globals.css` dan
   `frontend/src/styles/storefront-theme.css`.
4. Reuse komponen dari `frontend/src/components/ui`,
   `frontend/src/components/shared`, dan `frontend/src/components/storefront`.
5. Periksa font, icon convention, routes, responsive pattern, dan existing
   layout sebelum membuat abstraction baru.

Aturan coding:

- Simpan token visual secara terpusat.
- Simpan repeated content dalam typed data structure.
- Jangan menambah UI framework atau font dependency untuk perubahan kecil.
- Jangan mengubah backend, authentication, tenant authorization, atau API
  contract untuk pekerjaan visual.
- Gunakan route existing dan jangan meninggalkan CTA mati.
- Pertahankan SEO metadata dan semantic heading order.
- Minimalkan client-side JavaScript bila server rendering cukup.
- Gunakan helper image dan safe-rendering existing.

## 14. Responsive, accessibility, dan quality gate

Wajib memeriksa:

- viewport 375px, 768px, dan 1440px;
- tidak ada horizontal overflow;
- mobile navigation dan CTA;
- keyboard navigation dan visible focus state;
- contrast text, button, border, dan status color;
- semantic heading, landmark, label, dan alt text;
- touch target minimal 44px bila memungkinkan;
- `prefers-reduced-motion`;
- loading, empty, dan error state untuk section dinamis;
- tidak ada layout shift akibat gambar, font, atau data terlambat.

Sebelum menyelesaikan pekerjaan:

1. Cocokkan implementasi dengan design plan.
2. Lakukan visual critique terhadap hierarchy, uniqueness, spacing, typography,
   product proof, dan copy clarity.
3. Hapus minimal satu dekorasi yang tidak melayani pemahaman atau conversion.
4. Periksa hasil render di browser.
5. Jalankan lint frontend yang relevan, TypeScript check, dan build frontend.
6. Laporkan file yang berubah, command validasi, dan keputusan produk yang masih
   membutuhkan persetujuan.

Halaman tidak dianggap selesai hanya karena berhasil compile. Hasil akhir harus
terasa khas Plazo, memiliki cerita B2B SaaS yang jelas, dan tetap usable di
mobile.
