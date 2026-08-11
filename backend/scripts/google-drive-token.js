// Script untuk mendapatkan Google Drive refresh token (OAuth).
// Run dari folder backend: node scripts/google-drive-token.js
// Prasyarat: GOOGLE_DRIVE_CLIENT_ID dan GOOGLE_DRIVE_CLIENT_SECRET sudah diisi di .env,
// OAuth consent screen sudah dibuat, dan redirect URI http://localhost:3005/oauth sudah didaftarkan.
require("dotenv").config();
const http = require("http");
const { auth } = require("@googleapis/drive");

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3005/oauth";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("GOOGLE_DRIVE_CLIENT_ID / GOOGLE_DRIVE_CLIENT_SECRET belum diisi di .env");
  process.exit(1);
}

const oauth2Client = new auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const scopes = ["https://www.googleapis.com/auth/drive.file"];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: scopes,
});

console.log("1. Buka URL berikut di browser dan login dengan akun Google yang tujuannya dipakai untuk backup:");
console.log("\n   " + authUrl + "\n");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:3005");
  if (url.pathname !== "/oauth") return;

  const code = url.searchParams.get("code");
  if (!code) {
    res.end("Kode tidak ditemukan. Tutup tab ini dan ulangi.");
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    res.end("Berhasil! Silakan tutup tab ini.");
    console.log("\n2. Refresh token berhasil didapat. Salin nilai berikut ke .env:");
    console.log("\n   GOOGLE_DRIVE_REFRESH_TOKEN=" + tokens.refresh_token + "\n");
    console.log("3. Restart backend, lalu klik 'Uji Koneksi' di halaman Database Backup.");
  } catch (error) {
    console.error("Gagal menukar kode:", error.message);
    res.end("Gagal. Periksa console.");
  } finally {
    server.close();
    process.exit(0);
  }
});

server.listen(3005, () => {
  console.log("Menunggu redirect dari browser di http://localhost:3005/oauth ...");
});
