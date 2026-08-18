import { Injectable, Logger } from "@nestjs/common";
import { LocalStorageService } from "./local.storage";
import { S3StorageService } from "./s3.storage";

export type StorageMode = "local" | "s3";

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly mode: StorageMode;

  constructor(
    private readonly local: LocalStorageService,
    private readonly s3: S3StorageService,
  ) {
    this.mode = (process.env.UPLOAD_STORAGE || "local").toLowerCase() === "s3"
      ? "s3"
      : "local";
    this.logger.log(`[Storage] Mode: ${this.mode}`);
  }

  getMode(): StorageMode {
    return this.mode;
  }

  isS3(): boolean {
    return this.mode === "s3" && this.s3.isAvailable();
  }

  // Fail-fast: jangan diam-diam menulis ke lokal saat mode s3 tapi config tidak lengkap.
  // Menyimpan ke lokal secara diam-diam di production berbahaya (file tidak tersedia publik).
  private ensureS3Ready(): void {
    if (this.mode === "s3" && !this.s3.isAvailable()) {
      this.logger.error(
        "UPLOAD_STORAGE=s3 tetapi konfigurasi S3 tidak lengkap (S3_ENDPOINT/S3_ACCESS_KEY/S3_SECRET_KEY/S3_BUCKET). Upload dibatalkan.",
      );
      throw new Error(
        "S3 storage tidak tersedia. Periksa konfigurasi S3 di environment.",
      );
    }
  }

  async save(
    subDir: string,
    fileName: string,
    buffer: Buffer,
    mimeType?: string,
  ): Promise<string> {
    this.ensureS3Ready();
    if (this.isS3()) {
      return this.s3.save(subDir, fileName, buffer, mimeType);
    }
    return this.local.save(subDir, fileName, buffer);
  }

  async delete(subDir: string, fileName: string): Promise<void> {
    this.ensureS3Ready();
    if (this.isS3()) {
      await this.s3.delete(subDir, fileName);
      return;
    }
    await this.local.delete(subDir, fileName);
  }

  /**
   * Bangun full URL dari path relatif yang disimpan di DB (mis. "/uploads/images/x.webp").
   * - Mode local: baseUrl = APP_URL, path apa adanya.
   * - Mode S3: baseUrl = S3_PUBLIC_URL, prefix "/uploads/" di-strip
   *   (key di bucket langsung "images/x.webp", tanpa folder "uploads").
   * - URL sudah lengkap (http/https) dikembalikan apa adanya.
   */
  buildFullUrl(relativeUrl: string | null | undefined): string {
    if (!relativeUrl) return "";
    if (/^https?:\/\//i.test(relativeUrl)) return relativeUrl;

    if (this.isS3()) {
      const key = relativeUrl.replace(/^\/?uploads\//, "");
      return `${this.s3.getPublicUrl()}/${key}`;
    }

    const baseUrl = process.env.APP_URL || "http://localhost:3001";
    return `${baseUrl}${relativeUrl.startsWith("/") ? relativeUrl : `/${relativeUrl}`}`;
  }
}