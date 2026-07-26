# Setup Email dengan Resend

## Langkah-langkah Setup

### 1. Daftar Akun Resend

1. Kunjungi [https://resend.com](https://resend.com)
2. Sign up dengan email atau GitHub
3. Verifikasi email Anda

### 2. Dapatkan API Key

1. Login ke dashboard Resend
2. Buka menu **API Keys**
3. Klik **Create API Key**
4. Beri nama (contoh: "Plazo Production")
5. Copy API key yang diberikan (hanya muncul sekali!)

### 3. Konfigurasi Domain (Opsional tapi Recommended)

Untuk production, sebaiknya gunakan domain sendiri:

1. Di dashboard Resend, buka menu **Domains**
2. Klik **Add Domain**
3. Masukkan domain Anda (contoh: `plazo.com`)
4. Tambahkan DNS records yang diberikan ke DNS provider Anda:
   - SPF record
   - DKIM record
   - DMARC record (opsional)
5. Tunggu verifikasi (biasanya 5-30 menit)

### 4. Update Environment Variables

Edit file `.env` di backend:

```env
# EMAIL SERVICE - Resend
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxx"
RESEND_FROM_EMAIL="Plazo Marketplace <noreply@yourdomain.com>"
FRONTEND_URL="http://localhost:3000"
```

**Catatan:**
- Untuk development/testing, gunakan `onboarding@resend.dev` sebagai from email
- Untuk production, gunakan domain yang sudah diverifikasi
- Format from email: `"Display Name <email@domain.com>"`

### 5. Test Email Service

Jalankan backend dan test endpoint email verification:

```bash
# Start backend
npm run start:dev

# Test register (akan trigger email verification)
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "password": "SecurePass123!",
    "phone": "+6281234567890"
  }'
```

Cek inbox email untuk menerima verification email.

## Fitur Email yang Tersedia

### 1. Email Verification
- Dikirim saat user register
- Link verifikasi berlaku 24 jam
- Endpoint: `POST /api/auth/register`

### 2. Password Reset
- Dikirim saat user request reset password
- Link reset berlaku 1 jam
- Endpoint: `POST /api/auth/forgot-password`

### 3. Order Notifications
- Dikirim saat status order berubah
- Otomatis trigger dari order service

### 4. Proposal Notifications
- Dikirim saat proposal diterima/ditolak
- Otomatis trigger dari proposal service

## Troubleshooting

### Email tidak terkirim

1. **Cek API Key**
   ```bash
   # Pastikan API key valid
   echo $RESEND_API_KEY
   ```

2. **Cek Logs**
   ```bash
   # Lihat log backend untuk error
   npm run start:dev
   ```

3. **Cek Domain Verification**
   - Pastikan domain sudah verified di Resend dashboard
   - Cek DNS records sudah benar

### Email masuk spam

1. Setup SPF, DKIM, dan DMARC records
2. Gunakan domain yang sudah diverifikasi
3. Hindari spam trigger words di subject/body
4. Tambahkan unsubscribe link (untuk marketing emails)

## Rate Limits

Resend Free Plan:
- 100 emails/day
- 3,000 emails/month

Untuk production, upgrade ke paid plan sesuai kebutuhan.

## Best Practices

1. **Gunakan Domain Sendiri**
   - Lebih profesional
   - Deliverability lebih baik
   - Tidak ada batasan "onboarding@resend.dev"

2. **Handle Errors Gracefully**
   - Email service sudah handle error dengan logging
   - Tidak akan crash aplikasi jika email gagal

3. **Test di Development**
   - Gunakan email testing service (Mailtrap, Mailhog)
   - Atau gunakan email pribadi untuk testing

4. **Monitor Email Delivery**
   - Cek dashboard Resend untuk delivery stats
   - Monitor bounce rate dan spam complaints

## Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend Node.js SDK](https://github.com/resendlabs/resend-node)
- [Email Best Practices](https://resend.com/docs/knowledge-base/best-practices)
