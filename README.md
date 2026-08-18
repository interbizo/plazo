# Plazo Marketplace

**Multi-Tenant SaaS Marketplace** — Platform marketplace berbasis subdomain. Setiap seller punya toko online dengan subdomain sendiri (contoh: `tokobudi.plazo.id`).

---

## Daftar Isi

- [Arsitektur](#arsitektur)
- [Tech Stack](#tech-stack)
- [Struktur Proyek](#struktur-proyek)
- [Backend Modules](#backend-modules)
- [Halaman Frontend](#halaman-frontend)
- [Setup & Instalasi](#setup--instalasi)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Setup VPS (Docker)](#setup-vps-docker)
- [Scripts](#scripts)

---

## Arsitektur

```
┌──────────────────────────────────────┐
│              CLIENTS                  │
│  Browser (Next.js) | Mobile (future) │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│         NGINX REVERSE PROXY          │
│    plazo.id.conf → frontend:3000    │
│    api.plazo.id → backend:3001      │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│         BACKEND (NestJS)             │
│  ┌────────────────────────────────┐  │
│  │  MIDDLEWARE LAYER              │  │
│  │  ├─ SecurityMiddleware        │  │
│  │  ├─ CsrfMiddleware            │  │
│  │  ├─ TenantMiddleware          │  │
│  │  ├─ ActivityTrackerMiddleware │  │
│  │  └─ RequestLoggerMiddleware   │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  36 API MODULES                │  │
│  │  ├─ Auth, Users, Tenants     │  │
│  │  ├─ Marketplace (Produk)     │  │
│  │  ├─ Services, Jobs, Proposals│  │
│  │  ├─ Orders, Chat, Reviews    │  │
│  │  ├─ Admin, Seller, Buyer     │  │
│  │  ├─ KYC, Payment, Disputes   │  │
│  │  └─ +20 modul lainnya...    │  │
│  └────────────────────────────────┘  │
└──────────────┬───────────────────────┘
               │
        ┌──────┴──────┐
        ▼              ▼
┌──────────────┐ ┌──────────┐
│  PostgreSQL  │ │   Redis  │
│  Database    │ │  (Cache)  │
│   Utama      │ │          │
└──────────────┘ └──────────┘
```

### Alur Request

```
Request → Nginx → Backend → SecurityMiddleware → CsrfMiddleware
  → TenantMiddleware → Route → Guard (JWT/RBAC)
  → Controller → Service → Prisma → PostgreSQL
  → Response
```

---

## Tech Stack

### Backend

| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| **Runtime** | Node.js 20+ | JavaScript runtime |
| **Framework** | NestJS ^10.2.10 | Framework backend (Express-based) |
| **ORM** | Prisma ^5.22.0 | Database ORM & migrasi |
| **Database** | PostgreSQL 15 | Database utama |
| **Cache** | Redis 7 | Caching (opsional) |
| **Auth** | JWT + Passport | Autentikasi & RBAC |
| **Validation** | class-validator + class-transformer | Validasi request |
| **API Docs** | Swagger (NestJS Swagger) | Dokumentasi API |
| **Realtime** | Socket.IO ^4.8.3 | WebSocket (chat) |
| **Email** | Resend + Nodemailer | Email transaksional |
| **Security** | Helmet, express-rate-limit, bcryptjs | Keamanan |
| **File** | Sharp (image processing), Multer | Upload & proses file |
| **Scheduling** | @nestjs/schedule | Cron jobs |

### Frontend

| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| **Framework** | Next.js 16.2.4 | React full-stack framework |
| **React** | ^18.3.1 | Library UI |
| **Styling** | Tailwind CSS 4 | Utility-first CSS |
| **State** | Zustand ^5.0.12 | Manajemen state |
| **HTTP** | Axios ^1.15.0 | HTTP client |
| **Validation** | Zod ^3.25.76 | Validasi skema |
| **Icons** | Lucide React + Iconify | Ikon |
| **Editor** | CKEditor 4 | Rich text editor |
| **Toast** | react-hot-toast ^2.6.0 | Notifikasi |
| **Date** | date-fns ^4.1.0 | Manipulasi tanggal |
| **Markdown** | react-markdown + remark-gfm | Rendering markdown |
| **Realtime** | socket.io-client ^4.8.3 | WebSocket client |
| **Security** | Cloudflare Turnstile | CAPTCHA |
| **Sanitize** | isomorphic-dompurify | Pencegahan XSS |
| **CSS** | tailwind-merge, clsx | Utility CSS |

### Infrastructure

| Tools | Fungsi |
|-------|--------|
| **Nginx** | Reverse proxy & static serving |
| **PM2** | Process manager (ecosystem.config.js) |
| **Docker** | Containerization (docker-compose) |
| **Git** | Version control |

---

## Struktur Proyek

```
plazo/
├── backend/                    # NestJS Backend
│   ├── src/
│   │   ├── main.ts            # Entry point, bootstrap
│   │   ├── app.module.ts      # Module root (36 modules)
│   │   ├── swagger.ts         # Setup Swagger
│   │   ├── config/            # Konfigurasi (database, upload)
│   │   ├── common/            # Shared (middleware, guards, filters, pipes, decorators)
│   │   └── modules/           # 36 feature modules
│   ├── prisma/
│   │   ├── schema.prisma      # Skema database (~3000 baris)
│   │   ├── migrations/        # Migrasi database
│   │   └── seed.ts            # Database seeder
│   ├── docs/                  # Dokumentasi internal
│   ├── uploads/               # File upload (local dev)
│   ├── docker-compose.yml     # PostgreSQL + Redis
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                   # Next.js Frontend
│   ├── src/
│   │   ├── app/               # App Router (37 route)
│   │   ├── components/        # Komponen UI
│   │   ├── services/          # Layer API service (13 service)
│   │   ├── stores/            # Zustand stores (auth, notification)
│   │   ├── hooks/             # Custom hooks
│   │   ├── lib/               # Utilities (api, domain, validation, dll)
│   │   ├── providers/         # React providers
│   │   ├── types/             # TypeScript types
│   │   └── styles/            # Global styles
│   ├── next.config.js         # Konfigurasi Next.js
│   ├── package.json
│   └── tsconfig.json
│
├── nginx/
│   └── plazo.id.conf          # Konfigurasi Nginx
│
└── deplotmentguide.md         # Panduan deployment
```

---

## Backend Modules

### Auth & User (5 module)

| Module | Fungsi |
|--------|--------|
| `auth/` | Login, register, JWT, refresh token, 2FA, verifikasi email/phone |
| `users/` | CRUD user, profile |
| `tenants/` | Manajemen multi-tenant store, subdomain |
| `kyc/` | Verifikasi KYC (Know Your Customer) |
| `account-appeal/` | Banding akun yang di-suspend |

### Marketplace (4 module)

| Module | Fungsi |
|--------|--------|
| `marketplace/` | CRUD produk, search, filtering |
| `services/` | CRUD jasa/gig (Fiverr-style) |
| `categories/` | Manajemen kategori (nested) |
| `flash-sale/` | Flash sale & featured items |

### Jobs & Freelance (2 module)

| Module | Fungsi |
|--------|--------|
| `jobs/` | Posting lowongan, search |
| `proposals/` | Sistem proposal/bidding |

### Order & Payment (4 module)

| Module | Fungsi |
|--------|--------|
| `orders/` | Manajemen order, tracking status |
| `payment/` | Payment proof, escrow |
| `cart/` | Shopping cart |
| `wishlist/` | Wishlist / favorit |

### Komunikasi (2 module)

| Module | Fungsi |
|--------|--------|
| `chat/` | Real-time chat (Socket.IO), transaksi via chat |
| `notifications/` | Sistem notifikasi |

### Admin (6 module)

| Module | Fungsi |
|--------|--------|
| `admin/` | Dashboard admin, manajemen user, settings |
| `reports/` | Sistem report & moderasi |
| `vouchers/` | Manajemen voucher |
| `analytics/` | Dashboard analytics |
| `cms/` | Manajemen konten (banner, halaman) |
| `seo/` | Manajemen SEO, sitemap |

### Seller Tools (7 module)

| Module | Fungsi |
|--------|--------|
| `seller/` | Dashboard seller, produk, order |
| `seller-levels/` | Leveling & achievement seller |
| `subscription/` | Paket subscription & billing |
| `store-cms/` | CMS storefront (halaman, menu, tema) |
| `recommended-tools/` | Tools rekomendasi untuk seller |
| `physical-verification/` | Verifikasi toko fisik |
| `affiliate/` | Sistem afiliasi / referral |

### Lainnya (6 module)

| Module | Fungsi |
|--------|--------|
| `buyer/` | Dashboard buyer |
| `reviews/` | Sistem review & rating |
| `dispute/` | Resolusi sengketa |
| `location/` | Layanan lokasi (provinsi, kota) |
| `address/` | Buku alamat / shipping addresses |
| `region/` | Data regional (API rajaongkir) |
| `tutorial/` | Tutorial & onboarding |
| `upload/` | Manajemen file upload |
| `websocket/` | WebSocket gateway |
| `email/` | Layanan email (Resend SMTP) |
| `database/` | Prisma service & konfigurasi database |

---

## Halaman Frontend

### Halaman Publik

| Path | Fungsi |
|------|--------|
| `/` | Landing page / marketplace |
| `/products/...` | Detail & daftar produk |
| `/services/...` | Detail & daftar jasa |
| `/jobs/...` | Daftar & detail lowongan |
| `/kategori/...` | Jelajah kategori |
| `/store/...` | Storefront (berbasis subdomain) |
| `/faq` | FAQ |
| `/privacy` | Kebijakan privasi |
| `/terms` | Syarat & ketentuan |

### Halaman Auth

| Path | Fungsi |
|------|--------|
| `/login` | Login |
| `/register` | Daftar akun |
| `/forgot-password` | Lupa password |
| `/reset-password` | Reset password |
| `/verify-email` | Verifikasi email |
| `/verify-account` | Verifikasi akun |
| `/verify-otp` | Verifikasi OTP |
| `/account-suspended` | Akun di-suspend |

### Halaman Dashboard

| Path | Fungsi |
|------|--------|
| `/dashboard` | Dashboard user |
| `/seller/...` | Dashboard seller |
| `/buyer/...` | Dashboard buyer |
| `/admin/...` | Dashboard admin |
| `/cart` | Keranjang belanja |
| `/checkout` | Checkout |
| `/order-service/...` | Manajemen order |

---

## Setup & Instalasi

### Prasyarat

- Node.js 20+
- PostgreSQL 15+
- npm atau yarn

### 1. Clone Repository

```bash
git clone <repo-url>
cd plazo
```

### 2. Backend Setup

```bash
cd backend
npm install

# Copy environment
cp .env.production.example .env

# Setup database
npx prisma generate
npx prisma migrate dev
npm run db:seed

# Jalankan development
npm run start:dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Copy environment
cp .env.build .env.local

# Jalankan development
npm run dev
```

### 4. Docker (Opsional)

```bash
cd backend
docker-compose up -d  # PostgreSQL + Redis
```

### 5. Akses

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:3001 |
| API Docs | http://localhost:3001/api/docs |
| Prisma Studio | `npx prisma studio` |

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| `DATABASE_URL` | `postgresql://...` | Koneksi PostgreSQL |
| `JWT_SECRET` | - | Secret untuk JWT signing |
| `JWT_REFRESH_SECRET` | - | Secret untuk refresh token |
| `JWT_EXPIRES_IN` | `3600` | Expiry access token (detik) |
| `JWT_REFRESH_EXPIRES_IN` | `604800` | Expiry refresh token (7 hari) |
| `NODE_ENV` | `development` | Environment |
| `APP_PORT` | `3001` | Port backend |
| `APP_NAME` | `Plazo Marketplace SaaS` | Nama aplikasi |
| `CORS_ORIGIN` | - | Origin yang diizinkan CORS |
| `TURNSTILE_SECRET_KEY` | - | Cloudflare Turnstile secret |
| `SMTP_*` | - | Konfigurasi SMTP Email (Resend) |
| `RESEND_API_KEY` | - | API key Resend |
| `FRONTEND_URL` | - | URL frontend |
| `FONNTE_API_TOKEN` | - | Token API WhatsApp (Fonnte) |

### Frontend (`frontend/.env.local`)

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | URL Backend API |
| `NEXT_PUBLIC_WS_URL` | `http://localhost:3001` | URL WebSocket |
| `NEXT_PUBLIC_BASE_DOMAIN` | `localhost` | Domain dasar |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | - | Turnstile site key |

---

## Database

### Gambaran Skema

**Teknologi:** Prisma ORM + PostgreSQL

**Model Utama:**

| Model | Fungsi |
|-------|--------|
| **User** | Auth, profil, role (BUYER/SELLER/ADMIN/SUPER_ADMIN) |
| **Tenant** | Multi-tenant store, subdomain, subscription, tema |
| **Product** | Produk marketplace (PHYSICAL/DIGITAL) |
| **Service** | Jasa/gig (Fiverr-style dengan paket) |
| **Job** | Lowangan pekerjaan |
| **Proposal** | Sistem bidding |
| **Order** | Manajemen order dengan status lifecycle |
| **Chat** | Real-time messaging |
| **Review** | Rating & review (seller & buyer) |
| **Subscription** | Manajemen paket (FREE/BASIC/PREMIUM/...) |
| **Payment** | Payment proof & verifikasi |
| **KYC** | Verifikasi identitas |

### Strategi Multi-Tenant

```
Single Database — Row-Level Isolation via tenantId

Semua tabel memiliki kolom tenantId
Query selalu pakai: WHERE tenantId = :tenantId
Subdomain → Tenant → Isolasi data
```

### Index Penting

- Index `tenantId` di semua tabel tenant-scoped
- Composite index untuk query umum (`[tenantId, status]`, `[userId, isRead]`)
- Index full-text search
- Index foreign key untuk JOIN

---

## API Documentation

### Swagger UI

Tersedia di endpoint `/api/docs` saat development:

```
http://localhost:3001/api/docs
```

### Struktur API

```
/api/auth/...        → Endpoint autentikasi
/api/products/...    → CRUD produk
/api/services/...    → CRUD jasa
/api/jobs/...        → Manajemen lowongan
/api/proposals/...   → Manajemen proposal
/api/orders/...      → Manajemen order
/api/chat/...        → Chat & messaging
/api/reviews/...     → Review & rating
/api/admin/...       → Panel admin
/api/seller/...      → Dashboard seller
/api/buyer/...       → Dashboard buyer
/api/upload/...      → Upload file
/api/notifications/..→ Notifikasi
/api/subscription/.. → Manajemen subscription
```

### Autentikasi

- **Metode:** JWT (access token) + Refresh Token rotation
- **Penyimpanan:** httpOnly cookies (utama) + Authorization header (cadangan)
- **Keamanan:** Rate limiting di endpoint auth, Cloudflare Turnstile

---

## Deployment

### Arsitektur Production

```
Nginx (Reverse Proxy)
├── plazo.id → Frontend (Next.js, PM2, port 3000)
├── api.plazo.id → Backend (NestJS, PM2, port 3001)
└── *.plazo.id → Frontend (storefront subdomain)

Backend
├── PM2 process manager (ecosystem.config.js)
├── PostgreSQL (production instance)
└── Redis cache (opsional)
```

### Build Commands

```bash
# Backend
cd backend
npm run build
npm run start:prod

# Frontend
cd frontend
npm run build:prod    # Build Next.js (webpack, production)
npm run start          # Start Next.js server
```

### Migrasi Database

```bash
# Development
npx prisma migrate dev --name nama_migrasi

# Production
npx prisma migrate deploy
```

---

## Setup VPS (Docker)

Panduan deploy production ke VPS dengan Docker (2 VPS + Object Storage). Template file berada di folder `deploy/`.

### Arsitektur

```
VPS-1 (WEB)                          VPS-2 (DATABASE)
┌──────────────────────────────┐     ┌──────────────────┐
│ nginx container :80/:443     │     │ postgres :5432   │
│  ├─ plazo.id        → :3000  │     │  plazo_prod      │
│  ├─ api.plazo.id    → :3001  │     │  plazo_dev       │
│  ├─ dev.plazo.id    → :3000  │────→│ redis :6379      │
│  └─ api-dev.plazo.id→ :3001  │     │  db index 0/1    │
│                              │     │ (firewall hanya  │
│ frontend-prod / frontend-dev │     │  IP VPS-1)       │
│ backend-prod / backend-dev   │     └──────────────────┘
└──────────────────────────────┘
```

> **Catatan:** Monorepo hanya di-clone ke VPS-1 (WEB). VPS-2 (DATABASE) hanya menjalankan PostgreSQL + Redis — tidak butuh kode.

### Jumlah Container

| VPS | Container |
|---|---|
| VPS-1 (WEB) | nginx, backend-prod, frontend-prod, backend-dev, frontend-dev (5) |
| VPS-2 (DATABASE) | postgres, redis (2) |

Tanpa environment dev: cukup 3 container di VPS-1 (nginx + backend + frontend).

### Prasyarat

- 2 VPS dengan **Docker + Docker Compose** terinstall (bisa pilih template "Docker" saat create/reinstall di Nevacloud)
- 1 Object Storage (S3-compatible) untuk file upload
- Domain + Cloudflare (nameserver sudah dipindah ke Cloudflare)
- Repo GitHub (untuk CI/CD GitHub Actions)

### Fase 0 — Persiapan (di laptop kamu)

**0.1. Informasi yang dibutuhkan (tulis di kertas):**

| Info | Contoh | Dari mana |
|---|---|---|
| IP VPS-1 (web) | `116.212.74.91` | panel Nevacloud |
| IP VPS-2 (database) | `116.212.75.10` | panel Nevacloud |
| URL repo git | `https://github.com/username/plazo.git` | GitHub |
| Username GitHub | `username` | GitHub |

**0.2. Buat SSH key (kalau belum punya):**

Buka PowerShell di laptop:

```powershell
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\id_ed25519 -N ""
```

Verifikasi: file `id_ed25519` (private) dan `id_ed25519.pub` (public) ada di `C:\Users\<kamu>\.ssh\`.

**0.3. Buat GitHub Personal Access Token (untuk login GHCR di VPS):**

1. GitHub → klik avatar → **Settings**
2. **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. **Generate new token (classic)** → isi nama (mis. `ghcr-vps`)
4. Centang: `write:packages`, `read:packages`
5. **Generate token** → **salin token** (hanya muncul sekali — simpan aman)

### Fase 1 — VPS-2 (DATABASE)

**Dikerjakan pertama — paling aman dan singkat.**

**1.1. SSH & cek Docker:**

```bash
ssh root@<IP_VPS_2>
```

```bash
docker --version
docker compose version
```

✅ Harusnya: menampilkan versi Docker & Compose (tanpa error).

**1.2. Pasang public key (biar login tanpa password):**

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
```

Tempel isi `id_ed25519.pub` kamu → `Ctrl+O` → Enter → `Ctrl+X`.

```bash
chmod 600 ~/.ssh/authorized_keys
```

Keluar, tes login tanpa password:
```bash
exit
ssh root@<IP_VPS_2>
```
✅ Harusnya langsung masuk tanpa minta password.

**1.3. Clone repo & salin file compose:**

```bash
apt update && apt install -y git
cd /opt
git clone <URL_REPO_GIT> plazo-repo
mkdir -p plazo-db && cp plazo-repo/deploy/db/* plazo-db/
cd plazo-db
```

Verifikasi: `ls` menampilkan `docker-compose.yml` dan `.env.example`.

**1.4. Buat `.env` dari template:**

```bash
cp .env.example .env
nano .env
```

Isi password kuat:

```
POSTGRES_USER=plazo_user
POSTGRES_PASSWORD=p4ssword_sangat_kuat_123!
REDIS_PASSWORD=redis_kuat_456!
```

Simpan: `Ctrl+O` → Enter → `Ctrl+X`.

**1.5. Jalankan database:**

```bash
docker compose up -d
```

✅ Harusnya: `Container plazo_postgres Started` & `Container plazo_redis Started`.

**1.6. Verifikasi container hidup:**

```bash
docker ps
```

✅ Harusnya 2 container status `Up`:
- `plazo_postgres` (port 5432)
- `plazo_redis` (port 6379)

**1.7. Buat database untuk prod & dev:**

```bash
docker exec -it plazo_postgres psql -U plazo_user -d postgres
```

Di dalam psql, jalankan:

```sql
CREATE DATABASE plazo_prod;
CREATE DATABASE plazo_dev;
\q
```

✅ Keluar kembali ke shell.

**1.8. Firewall (wajib — database tidak boleh diakses internet):**

```bash
ufw default deny incoming
ufw allow ssh
ufw allow from <IP_VPS_1> to any port 5432
ufw allow from <IP_VPS_1> to any port 6379
ufw enable
```

Jawab `y` saat diminta. Verifikasi:
```bash
ufw status
```
✅ Harusnya: `5432 ALLOW FROM <IP_VPS_1>` dan `6379 ALLOW FROM <IP_VPS_1>`.

**→ VPS-2 SELESAI. Jangan lanjut sebelum langkah ini berhasil.**

### Fase 2 — VPS-1 (WEB)

**2.1. SSH & pasang public key:**

```bash
ssh root@<IP_VPS_1>
```

Ulangi langkah 1.2 (pasang `id_ed25519.pub` ke `~/.ssh/authorized_keys`).

**2.2. Clone repo:**

```bash
apt update && apt install -y git nano curl
cd /opt
git clone <URL_REPO_GIT> plazo
cd plazo
```

**2.2b. Salin file deploy ke folder app (penting — dipakai oleh `docker compose` & GitHub Actions):**

```bash
# docker-compose.yml harus ada di root /opt/plazo
cp deploy/web/docker-compose.yml .

# Folder nginx (berisi plazo.id.conf) dirujuk oleh docker-compose.yml
mkdir -p nginx && cp deploy/web/nginx/plazo.id.conf nginx/

# Verifikasi struktur
ls -la
```

✅ Harusnya ada file `docker-compose.yml` dan folder `nginx/` di `/opt/plazo`.

**2.3. Buat file env backend dari template:**

```bash
cp deploy/web/.env.example .
mv .env.example .env.backend-prod
nano .env.backend-prod
```

Berikut isi yang benar untuk **production**:

| Variable | Nilai |
|---|---|
| `NODE_ENV` | `production` |
| `APP_PORT` | `3001` |
| `APP_URL` | `https://api.plazo.id` |
| `FRONTEND_URL` | `https://plazo.id` |
| `MAIN_DOMAIN` / `BASE_DOMAIN` | `plazo.id` |
| `CORS_ORIGIN` | `https://plazo.id,https://www.plazo.id` |
| `DATABASE_URL` | `postgresql://plazo_user:p4ssword_sangat_kuat_123!@<IP_VPS_2>:5432/plazo_prod` |
| `REDIS_HOST` | `<IP_VPS_2>` |
| `REDIS_PORT` | `6379` |
| `REDIS_PASSWORD` | `redis_kuat_456!` |
| `REDIS_DB` | `0` |
| `JWT_SECRET` | string acak panjang |
| `JWT_REFRESH_SECRET` | string acak panjang (beda dari JWT_SECRET) |
| `RESEND_API_KEY` | dari akun Resend |
| `FONNTE_API_TOKEN` | dari akun Fonnte |
| `S3_ENDPOINT` | endpoint Object Storage Nevacloud |
| `S3_ACCESS_KEY` | access key Object Storage |
| `S3_SECRET_KEY` | secret key Object Storage |
| `S3_BUCKET` | nama bucket |
| `S3_PUBLIC_URL` | URL publik bucket |
| `KYC_ENCRYPTION_KEY` | string acak |

Cara membuat string acak untuk secret:
```bash
openssl rand -hex 32
```
✅ Muncul string panjang — salin untuk `JWT_SECRET`, `JWT_REFRESH_SECRET`, `KYC_ENCRYPTION_KEY`.

**2.4. Buat file env dev:**

```bash
cp .env.backend-prod .env.backend-dev
nano .env.backend-dev
```

Ubah yang berbeda untuk dev:
- `DATABASE_URL` → `...@<IP_VPS_2>:5432/plazo_dev`
- `REDIS_DB=1`
- `APP_URL=https://api-dev.plazo.id`
- `FRONTEND_URL=https://dev.plazo.id`
- `MAIN_DOMAIN=dev.plazo.id` / `BASE_DOMAIN=dev.plazo.id`
- `CORS_ORIGIN=https://dev.plazo.id`
- `JWT_SECRET` & `JWT_REFRESH_SECRET` → **beda** dari production

**2.5. Login GHCR agar VPS bisa menarik image:**

Gunakan token dari langkah 0.3:

```bash
echo <GITHUB_TOKEN> | docker login ghcr.io -u <USERNAME_GITHUB> --password-stdin
```

✅ Harusnya: `Login Succeeded`.

**2.6. Tarik & jalankan container:**

```bash
docker compose pull
docker compose run --rm backend-prod npx --yes prisma migrate deploy
docker compose up -d
```

> **Catatan:** Langkah ini butuh image yang sudah di-build & di-push ke GHCR oleh GitHub Actions. Kalau belum pernah deploy dari Actions, jalankan `docker compose build` manual terlebih dahulu.

**2.7. Verifikasi container:**

```bash
docker ps
```

✅ Harusnya menampilkan: `nginx`, `backend-prod`, `frontend-prod` (+ `backend-dev`, `frontend-dev` bila dijalankan).

**2.8. Cek log backend (pastikan tidak error):**

```bash
docker compose logs --tail=50 backend-prod
```

✅ Tidak boleh ada error fatal (mis. gagal connect database).

### Fase 3 — Cloudflare & DNS

**3.1. Tambahkan situs ke Cloudflare:**

1. Login Cloudflare → **Add Site** → masukkan domain (mis. `plazo.id`)
2. Pilih plan **Free** → ikuti langkah
3. Cloudflare memberi **2 nameserver** (contoh: `abc.ns.cloudflare.com` & `xyz.ns.cloudflare.com`)
4. **Ganti nameserver di registrar domain** kamu (Nevacloud/Namecheap/dll) ke nameserver Cloudflare tersebut
5. Tunggu sampai status "Active" di Cloudflare (beberapa menit sampai 24 jam)

**3.2. Buat DNS Records:**

Buka **DNS → Records → Add record**:

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `@` | IP VPS-1 | ON (oranye) |
| A | `api` | IP VPS-1 | ON |
| A | `dev` | IP VPS-1 | ON |
| A | `api-dev` | IP VPS-1 | ON |
| A | `*` | IP VPS-1 (storefront seller) | ON |

**3.3. Konfigurasi SSL:**

- **SSL/TLS → Overview** → Mode: **Full (Strict)**
- **Edge Certificates → Always Use HTTPS**: ON

**3.4. Buat Origin Certificate (untuk nginx di VPS-1):**

1. Cloudflare → **SSL/TLS → Origin Server → Create Certificate**
2. Biarkan default (15 tahun) → **Create**
3. Salin **Certificate** → simpan sebagai `/etc/ssl/cloudflare/plazo.id.pem`
4. Salin **Private key** → simpan sebagai `/etc/ssl/cloudflare/plazo.id.key`

**3.5. Taruh cert di VPS-1:**

```bash
mkdir -p /etc/ssl/cloudflare
nano /etc/ssl/cloudflare/plazo.id.pem   # paste certificate
nano /etc/ssl/cloudflare/plazo.id.key   # paste private key
```

Pastikan path cert cocok dengan `nginx/plazo.id.conf` (mengarah ke `/etc/ssl/cloudflare/plazo.id.pem`).

**3.6. Verifikasi DNS:**

```bash
dig +short plazo.id
dig +short api.plazo.id
```
✅ Harusnya menampilkan IP VPS-1.

**3.7. Storefront (subdomain seller):**

Otomatis aktif via wildcard DNS `*` + wildcard server block nginx (`*.plazo.id` → frontend). Tidak perlu setup per seller. Saat seller buat toko, subdomain langsung aktif.

### Fase 4 — Object Storage (Nevacloud)

**4.1. Buat bucket di panel Nevacloud:**
1. Menu **Object Storage** → **Create Bucket**
2. Nama bucket: `plazo-prod` (dan `plazo-dev` untuk dev)
3. Region: pilih terdekat

**4.2. Buat Access Key:**
1. Menu Object Storage → **Access Keys** → **Create Access Key**
2. Salin **Access Key ID** & **Secret Key** → isi ke `S3_ACCESS_KEY` / `S3_SECRET_KEY` di `.env.backend-prod`

**4.3. Cek nilai yang dibutuhkan:**
- `S3_ENDPOINT` → URL endpoint Object Storage (biasanya `https://<region>.object-storage.nevacloud.io` atau serupa, cek dokumentasi Nevacloud)
- `S3_PUBLIC_URL` → URL publik bucket agar file bisa diakses browser

### Fase 5 — GitHub Actions (CI/CD)

**5.1. Isi secrets di GitHub:**

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Nilai |
|---|---|
| `VPS_HOST` | IP VPS-1 |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | isi file `id_ed25519` (private key, termasuk baris BEGIN/END) |
| `VPS_SSH_PORT` | `22` |
| `NEXT_PUBLIC_API_URL` | `https://api.plazo.id` |
| `NEXT_PUBLIC_WS_URL` | `https://api.plazo.id` |
| `NEXT_PUBLIC_APP_URL` | `https://plazo.id` |
| `NEXT_PUBLIC_BASE_DOMAIN` | `plazo.id` |
| `NEXT_PUBLIC_MAIN_DOMAIN` | `plazo.id` |
| `NEXT_PUBLIC_MAIN_DOMAIN_URL` | `https://plazo.id` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | dari Cloudflare Turnstile |
| `NEXT_PUBLIC_S3_PUBLIC_URL` | URL publik bucket |
| `NEXT_PUBLIC_API_URL_DEV` | `https://api-dev.plazo.id` |
| `NEXT_PUBLIC_WS_URL_DEV` | `https://api-dev.plazo.id` |
| `NEXT_PUBLIC_APP_URL_DEV` | `https://dev.plazo.id` |
| `NEXT_PUBLIC_BASE_DOMAIN_DEV` | `dev.plazo.id` |
| `NEXT_PUBLIC_MAIN_DOMAIN_DEV` | `dev.plazo.id` |
| `NEXT_PUBLIC_MAIN_DOMAIN_URL_DEV` | `https://dev.plazo.id` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY_DEV` | dari Cloudflare Turnstile |
| `NEXT_PUBLIC_S3_PUBLIC_URL_DEV` | URL publik bucket dev |

**5.2. Alur deploy:**

- Push ke `main` → GitHub Actions build image → push GHCR → SSH ke VPS-1 → `docker compose pull` + migrate + `up -d` (production)
- Push ke `develop` → alur yang sama untuk dev
- Manual: tab **Actions** → **Run workflow** → pilih branch

### Checklist Verifikasi Akhir

| No | Cek | Cara |
|---|---|---|
| 1 | Docker jalan di 2 VPS | `docker --version` |
| 2 | Database hidup (VPS-2) | `docker ps` → postgres & redis `Up` |
| 3 | App jalan (VPS-1) | `docker ps` → nginx & backend & frontend `Up` |
| 4 | Website terbuka | browser → `https://plazo.id` |
| 5 | API terbuka | browser → `https://api.plazo.id/api/docs` |
| 6 | Storefront jalan | buka subdomain seller → `https://tokobudi.plazo.id` |
| 7 | Upload file berfungsi | coba upload gambar di dashboard |
| 8 | Auto deploy jalan | push ke `main` → cek tab Actions → hijau |

### Update Manual (tanpa GitHub Actions)

```bash
cd /opt/plazo
git pull origin main
docker compose build
docker compose up -d
```

### Troubleshooting

| Masalah | Solusi |
|---|---|
| `docker ps` kosong setelah `up -d` | Cek log: `docker compose logs --tail=50 <service>` |
| Gagal pull image | Pastikan sudah `docker login ghcr.io` di VPS-1 |
| Error koneksi database | Cek firewall VPS-2 (port 5432/6379 hanya untuk IP VPS-1) |
| `connection refused` dari backend | Pastikan `DATABASE_URL` dan `REDIS_HOST` di `.env.backend-prod` benar |
| Upload file gagal | Cek konfigurasi S3 di `.env.backend-prod` |
| SSL error | Pastikan cert di `/etc/ssl/cloudflare/` dan mode Cloudflare **Full (Strict)** |
| Website HTTP 502 | Restart nginx: `docker compose restart nginx` |
| Database penuh | Periksa disk: `df -h`; lihat ukuran: `docker exec plazo_postgres psql -U plazo_user -d plazo_prod -c "\dt+"` |

---

## Scripts

### Backend

| Script | Deskripsi |
|--------|-----------|
| `npm run start:dev` | Development (watch mode) |
| `npm run build` | Build untuk production |
| `npm run start:prod` | Start production server |
| `npm run lint` | ESLint check |
| `npm test` | Jest unit tests |
| `npx prisma studio` | GUI database |

### Frontend

| Script | Deskripsi |
|--------|-----------|
| `npm run dev` | Development server (Next.js) |
| `npm run build:prod` | Build production (webpack) |
| `npm run start` | Start production server |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run build:turbo` | Build dengan Turbopack |

---

## Catatan untuk Developer

1. **Multi-Tenant:** Setiap request melewati `TenantMiddleware` yang mengekstrak subdomain dari hostname. Pastikan selalu menyertakan `tenantId` di query database.

2. **JWT & Cookies:** Token dikelola via httpOnly cookies untuk keamanan XSS. Backend otomatis mengatur cookie `auth_token` dan `refresh_token` saat login.

3. **Subdomain Routing:** Frontend menggunakan `getSubdomainFromHostname()` untuk mendeteksi apakah request berasal dari storefront (subdomain) atau main marketplace.

4. **File Upload:** Upload file lokal di `backend/uploads/`. Untuk production, gunakan S3-compatible storage.

5. **Database Migrations:** Jangan mengedit migrasi yang sudah ada. Buat migrasi baru untuk perubahan schema.

6. **Code Convention:** Backend menggunakan arsitektur modular NestJS. Frontend menggunakan Next.js App Router dengan pattern services.
