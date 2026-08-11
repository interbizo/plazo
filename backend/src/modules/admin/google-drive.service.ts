import { Injectable, Logger } from "@nestjs/common";
import { drive, auth, drive_v3 } from "@googleapis/drive";
import * as fs from "fs";

// Service untuk upload backup database ke Google Drive.
// Auth memakai OAuth refresh token (GOOGLE_DRIVE_CLIENT_ID/SECRET/REFRESH_TOKEN) -
// file masuk ke akun Google pengguna. (Service Account tidak dipakai: Google
// memblokir upload service account ke My Drive karena tidak punya storage quota.)
@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  private drive: drive_v3.Drive | null = null;

  isEnabled(): boolean {
    return process.env.GOOGLE_DRIVE_ENABLED === "true";
  }

  isConfigured(): boolean {
    return Boolean(
      process.env.GOOGLE_DRIVE_CLIENT_ID &&
        process.env.GOOGLE_DRIVE_CLIENT_SECRET &&
        process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
    );
  }

  getStatus() {
    return {
      enabled: this.isEnabled(),
      configured: this.isConfigured(),
      authMode: "oauth",
      folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || null,
    };
  }

  private getClient(): drive_v3.Drive | null {
    if (this.drive) return this.drive;
    if (!this.isConfigured()) return null;

    try {
      const authClient = new auth.OAuth2({
        clientId: process.env.GOOGLE_DRIVE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      });
      authClient.setCredentials({
        refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
      });

      this.drive = drive({ version: "v3", auth: authClient });
      return this.drive;
    } catch (error) {
      this.logger.error("Failed to init Google Drive client:", error);
      return null;
    }
  }

  // Upload file backup ke Google Drive (folder target bila dikonfigurasi). Return fileId.
  async uploadFile(filepath: string, filename: string): Promise<string> {
    const drive = this.getClient();
    if (!drive) throw new Error("Google Drive not configured");

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    const res = await drive.files.create({
      requestBody: {
        name: filename,
        parents: folderId ? [folderId] : undefined,
        mimeType: "application/sql",
      },
      media: {
        mimeType: "application/sql",
        body: fs.createReadStream(filepath),
      },
      fields: "id,name,size",
    });

    if (!res.data.id) throw new Error("Google Drive upload returned no file id");
    this.logger.log(`Uploaded ${filename} to Google Drive (fileId: ${res.data.id})`);
    return res.data.id;
  }

  // Daftar file backup di Google Drive (hanya yang berawalan backup-).
  async listBackupFiles(): Promise<
    Array<{ id: string; name: string; size?: string | null; createdTime?: string | null }>
  > {
    const drive = this.getClient();
    if (!drive) return [];

    const res = await drive.files.list({
      q: "name contains 'backup-' and trashed = false",
      pageSize: 100,
      fields: "files(id,name,size,createdTime)",
      orderBy: "createdTime desc",
    });

    return (res.data.files || [])
      .filter((file) => (file.name || "").startsWith("backup-"))
      .map((file) => ({
        id: file.id || "",
        name: file.name || "",
        size: file.size || null,
        createdTime: file.createdTime || null,
      }));
  }

  // Download file dari Google Drive ke path lokal. Return path tujuan.
  async downloadFile(fileId: string, destPath: string): Promise<string> {
    const drive = this.getClient();
    if (!drive) throw new Error("Google Drive not configured");

    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" },
    );

    await new Promise<void>((resolve, reject) => {
      const writer = fs.createWriteStream(destPath);
      res.data
        .on("error", reject)
        .pipe(writer)
        .on("finish", () => resolve())
        .on("error", reject);
    });

    return destPath;
  }

  // Hapus file di Google Drive berdasarkan fileId.
  async deleteFile(fileId: string): Promise<void> {
    const drive = this.getClient();
    if (!drive) throw new Error("Google Drive not configured");

    await drive.files.delete({ fileId });
    this.logger.log(`Deleted Google Drive file: ${fileId}`);
  }

  // Uji koneksi ke Google Drive API.
  async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.isEnabled()) {
      return { ok: false, message: "Google Drive dinonaktifkan (GOOGLE_DRIVE_ENABLED != true)" };
    }
    if (!this.isConfigured()) {
      return { ok: false, message: "Kredensial OAuth Google Drive belum dikonfigurasi (CLIENT_ID/SECRET/REFRESH_TOKEN)" };
    }

    try {
      const drive = this.getClient();
      if (!drive) throw new Error("Client gagal diinisialisasi");

      const res = await drive.files.list({ pageSize: 1, fields: "files(id,name)" });
      return {
        ok: true,
        message: `Koneksi berhasil (OAuth). File terlihat: ${res.data.files?.length || 0}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { ok: false, message: `Gagal koneksi: ${message}` };
    }
  }
}
