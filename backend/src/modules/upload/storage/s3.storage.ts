import { Injectable, Logger } from "@nestjs/common";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

@Injectable()
export class S3StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly client: S3Client | null = null;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor() {
    const endpoint = process.env.S3_ENDPOINT;
    const accessKey = process.env.S3_ACCESS_KEY;
    const secretKey = process.env.S3_SECRET_KEY;
    this.bucket = process.env.S3_BUCKET || "";
    this.publicUrl = (process.env.S3_PUBLIC_URL || "").replace(/\/$/, "");

    if (!endpoint || !accessKey || !secretKey || !this.bucket) {
      this.logger.warn(
        "S3 config incomplete — S3 storage unavailable. Check S3_ENDPOINT/S3_ACCESS_KEY/S3_SECRET_KEY/S3_BUCKET/S3_PUBLIC_URL",
      );
      return;
    }

    if (!this.publicUrl) {
      this.logger.warn(
        "S3_PUBLIC_URL kosong — URL file yang dikembalikan akan relatif dan tidak bisa diakses browser. Pastikan diisi di .env",
      );
    }

    this.client = new S3Client({
      endpoint,
      region: process.env.S3_REGION || "us-east-1",
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true, // NetaCloud / MinIO / sebagian besar object storage butuh path-style
    });
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async save(subDir: string, fileName: string, buffer: Buffer, mimeType?: string): Promise<string> {
    if (!this.client) {
      throw new Error("S3 storage is not configured");
    }

    const key = `${subDir}/${fileName}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType || "application/octet-stream",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    return `${this.publicUrl}/${key}`;
  }

  async delete(subDir: string, fileName: string): Promise<void> {
    if (!this.client) return;

    const key = `${subDir}/${fileName}`;
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.error(`[S3] Failed to delete ${key}: ${(error as Error).message}`);
    }
  }

  getBucket(): string {
    return this.bucket;
  }

  getPublicUrl(): string {
    return this.publicUrl;
  }
}