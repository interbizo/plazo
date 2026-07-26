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
