# Deploy Plazo — 2 VPS + Docker + CI/CD

Arsitektur:

```
VPS-1 (WEB)                          VPS-2 (DATABASE)
┌──────────────────────────────┐     ┌──────────────────┐
│ nginx container :80/:443     │     │ postgres :5432   │
│  ├─ plazo.id        → :3000  │     │  plazo_prod      │
│  ├─ api.plazo.id    → :3001  │     │  plazo_dev   │
│  ├─ dev.plazo.id→ :3000  │────→│ redis :6379      │
│  └─ api-dev     → :3001  │     │  db index 0/1    │
│                              │     │ (firewall hanya  │
│ frontend-prod / frontend-dev │     │  IP VPS-1)       │
│ backend-prod / backend-dev   │     └──────────────────┘
└──────────────────────────────┘
```

- Branch `main`    → build image `:prod`    → deploy prod
- Branch `develop` → build image `:dev` → deploy dev

## File di repo ini

| File | Fungsi |
|---|---|
| `frontend/Dockerfile` | Build image frontend (Next.js, multi-stage) |
| `backend/Dockerfile` | Build image backend (NestJS, sudah ada) |
| `deploy/db/docker-compose.yml` | Postgres + Redis untuk VPS-2 |
| `deploy/db/.env.example` | Template env DB |
| `deploy/web/docker-compose.yml` | 4 service app + nginx untuk VPS-1 |
| `deploy/web/nginx/plazo.id.conf` | Reverse proxy prod + dev |
| `deploy/web/.env.example` | Template env backend prod/dev |
| `.github/workflows/deploy.yml` | CI/CD: build → GHCR → deploy |

## Setup singkat

1. **VPS-2**: salin `deploy/db/` → buat `.env` → `docker compose up -d` → UFW hanya buka port 5432/6379 untuk IP VPS-1.
2. **VPS-1**: salin `deploy/web/` + `nginx/plazo.id.conf` → buat `.env.backend-prod` & `.env.backend-dev` → taruh SSL cert Cloudflare di `/etc/ssl/cloudflare/`.
3. **GitHub**: tambahkan Secrets (lihat `.github/workflows/deploy.yml`).
4. Push `develop` → dev naik; push `main` → production naik.

> dev dan production berbagi satu VPS-1. Port container tidak diekspos ke publik; hanya nginx yang listen 80/443.