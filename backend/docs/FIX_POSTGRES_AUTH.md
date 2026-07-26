# Fix PostgreSQL Authentication Error di VPS

## Masalah
Error: `password authentication failed for user "postgres"` saat melakukan database backup.

```
pg_dump: error: connection to server at "localhost" (::1), port 5432 failed: 
FATAL: password authentication failed for user "postgres"
```

## Penyebab
1. Password PostgreSQL di VPS tidak sesuai dengan yang ada di `.env`
2. Koneksi menggunakan `localhost` yang resolve ke IPv6 (::1) yang tidak dikonfigurasi dengan benar
3. pg_hba.conf tidak mengizinkan password authentication untuk koneksi lokal

## Kredensial Database VPS
- **Username**: `postgres`
- **Password**: `ehf2026@` (tanpa URL encoding)
- **Database**: `plazo_db`
- **Port**: `5432`
- **Host**: `127.0.0.1` (gunakan IP, bukan localhost)

---

## ✅ Solusi Cepat (Recommended)

### Di VPS, jalankan script quick-fix:

```bash
# 1. Masuk ke direktori backend
cd /root/plazo/backend

# 2. Download atau copy file quick-fix.sh ke direktori ini
# (file sudah ada di repository)

# 3. Jalankan script
bash quick-fix.sh
```

Script ini akan otomatis:
- ✓ Set password PostgreSQL ke `ehf2026@`
- ✓ Update pg_hba.conf untuk md5 authentication
- ✓ Update .env untuk menggunakan `127.0.0.1` instead of `localhost`
- ✓ Rebuild dan restart aplikasi
- ✓ Test koneksi database

---

## 🔧 Solusi Manual

Jika script otomatis tidak berhasil, ikuti langkah manual berikut:

### Langkah 1: Set Password PostgreSQL

```bash
# Login sebagai postgres user
sudo -u postgres psql

# Di dalam psql, set password
ALTER USER postgres WITH PASSWORD 'ehf2026@';

# Keluar
\q
```

### Langkah 2: Update pg_hba.conf

```bash
# Cari lokasi pg_hba.conf
sudo -u postgres psql -t -P format=unaligned -c 'SHOW hba_file;'

# Edit file (biasanya di /etc/postgresql/14/main/pg_hba.conf)
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

Tambahkan atau ubah baris berikut di bagian atas (setelah komentar):

```
# IPv4 local connections
host    all             all             127.0.0.1/32            md5

# IPv6 local connections  
host    all             all             ::1/128                 md5
```

**Penting**: Pastikan method authentication adalah `md5` atau `scram-sha-256`, bukan `peer` atau `ident`.

### Langkah 3: Reload PostgreSQL

```bash
sudo systemctl reload postgresql
# atau jika reload tidak cukup
sudo systemctl restart postgresql
```

### Langkah 4: Update File .env di VPS

```bash
# Edit .env
nano /root/plazo/backend/.env
```

Ubah baris DATABASE_URL dari:
```env
DATABASE_URL="postgresql://postgres:ehf2026@localhost:5432/plazo_db?connection_limit=20&pool_timeout=20&connect_timeout=10"
```

Menjadi (ganti `localhost` dengan `127.0.0.1`):
```env
DATABASE_URL="postgresql://postgres:ehf2026@127.0.0.1:5432/plazo_db?connection_limit=20&pool_timeout=20&connect_timeout=10"
```

**Catatan**: Password `ehf2026@` tidak perlu URL encoding di .env karena sudah ditangani oleh kode.

### Langkah 5: Test Koneksi

```bash
# Test dengan psql
PGPASSWORD='ehf2026@' psql -h 127.0.0.1 -U postgres -d plazo_db -c "SELECT version();"

# Test dengan pg_dump
PGPASSWORD='ehf2026@' pg_dump -h 127.0.0.1 -U postgres -d plazo_db -F p -f /tmp/test_backup.sql

# Jika berhasil, hapus file test
rm /tmp/test_backup.sql
```

### Langkah 6: Rebuild dan Restart Aplikasi

```bash
cd /root/plazo/backend

# Rebuild aplikasi
npm run build

# Restart PM2
pm2 restart plazo-backend

# Check logs
pm2 logs plazo-backend --lines 50
```

---

## 🔍 Troubleshooting

### Error: "password authentication failed"

**Solusi 1: Cek password di .env**
```bash
cat /root/plazo/backend/.env | grep DATABASE_URL
```

**Solusi 2: Reset password PostgreSQL**
```bash
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'ehf2026@';"
```

**Solusi 3: Cek pg_hba.conf**
```bash
sudo cat /etc/postgresql/*/main/pg_hba.conf | grep -E "^host"
```

Pastikan ada baris:
```
host    all             all             127.0.0.1/32            md5
```

### Error: "connection refused"

**Solusi 1: Cek status PostgreSQL**
```bash
sudo systemctl status postgresql
```

Jika tidak running:
```bash
sudo systemctl start postgresql
```

**Solusi 2: Cek port PostgreSQL**
```bash
sudo netstat -tlnp | grep 5432
# atau
sudo ss -tlnp | grep 5432
```

**Solusi 3: Cek listen_addresses**
```bash
sudo grep listen_addresses /etc/postgresql/*/main/postgresql.conf
```

Pastikan: `listen_addresses = 'localhost'` atau `listen_addresses = '*'`

### Error: "database does not exist"

```bash
# Cek database yang ada
sudo -u postgres psql -l

# Jika plazo_db tidak ada, buat database
sudo -u postgres psql -c "CREATE DATABASE plazo_db;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE plazo_db TO postgres;"
```

### Backup masih gagal setelah fix

**Cek logs aplikasi:**
```bash
pm2 logs plazo-backend --lines 100
```

**Test manual pg_dump:**
```bash
PGPASSWORD='ehf2026@' pg_dump -h 127.0.0.1 -p 5432 -U postgres -d plazo_db -F p -f /tmp/manual_backup.sql
```

Jika berhasil, masalahnya ada di aplikasi. Jika gagal, masalahnya ada di PostgreSQL.

---

## 📝 Perubahan Kode

File yang sudah diperbaiki:

### `src/modules/admin/database-backup.service.ts`

**Perubahan:**
1. Menggunakan `127.0.0.1` instead of `localhost` untuk menghindari IPv6 issues
2. Proper password escaping untuk shell commands dengan single quotes
3. Menangani special characters di password

**Kode sebelum:**
```typescript
return `PGPASSWORD="${config.password}" pg_dump -h ${config.host} ...`;
```

**Kode sesudah:**
```typescript
const host = config.host === 'localhost' ? '127.0.0.1' : config.host;
const escapedPassword = config.password.replace(/'/g, "'\\''");
return `PGPASSWORD='${escapedPassword}' pg_dump -h ${host} ...`;
```

---

## ✅ Verifikasi

Setelah fix, test backup dengan:

### Via API (gunakan Postman atau curl)

```bash
# Get admin token first (login as admin)
curl -X POST http://your-vps-ip:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}'

# Create backup
curl -X POST http://your-vps-ip:3001/api/admin/database/backup \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Check logs

```bash
# Monitor logs real-time
pm2 logs plazo-backend

# Check last 50 lines
pm2 logs plazo-backend --lines 50 --nostream

# Check error logs only
pm2 logs plazo-backend --err --lines 50
```

### Check backup files

```bash
# List backups
ls -lh /root/plazo/backend/backups/database/

# Check latest backup
ls -lt /root/plazo/backend/backups/database/ | head -5
```

---

## 🔐 Catatan Keamanan

1. **Jangan commit file .env** ke git
   ```bash
   # Pastikan .env ada di .gitignore
   echo ".env" >> .gitignore
   ```

2. **Gunakan password yang kuat** untuk PostgreSQL production

3. **Backup pg_hba.conf** sebelum mengubahnya
   ```bash
   sudo cp /etc/postgresql/*/main/pg_hba.conf /etc/postgresql/*/main/pg_hba.conf.backup
   ```

4. **Batasi akses** ke file backup database
   ```bash
   chmod 700 /root/plazo/backend/backups
   chmod 600 /root/plazo/backend/backups/database/*.sql
   ```

5. **Gunakan SSL/TLS** untuk koneksi database production
   ```env
   DATABASE_URL="postgresql://postgres:password@127.0.0.1:5432/plazo_db?sslmode=require"
   ```

6. **Rotate backup files** secara otomatis (sudah diimplementasi, max 30 backups)

---

## 📚 Referensi

- [PostgreSQL Authentication Methods](https://www.postgresql.org/docs/current/auth-methods.html)
- [pg_hba.conf Configuration](https://www.postgresql.org/docs/current/auth-pg-hba-conf.html)
- [PostgreSQL Password Authentication](https://www.postgresql.org/docs/current/auth-password.html)
- [pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)

---

## 📞 Support

Jika masih ada masalah setelah mengikuti panduan ini:

1. Check PostgreSQL logs:
   ```bash
   sudo tail -f /var/log/postgresql/postgresql-*-main.log
   ```

2. Check application logs:
   ```bash
   pm2 logs plazo-backend --lines 200
   ```

3. Verify database connection:
   ```bash
   bash scripts/test-db-connection.sh
   ```
