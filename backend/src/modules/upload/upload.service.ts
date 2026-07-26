import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import sharp from "sharp";

/**
 * File type detection via magic bytes (file signatures).
 * More reliable than trusting client-provided Content-Type header.
 */
const MAGIC_BYTES: Array<{
  mime: string;
  bytes: number[];
  offset?: number;
}> = [
  // Images
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
  { mime: "image/bmp", bytes: [0x42, 0x4d] },
  { mime: "image/tiff", bytes: [0x49, 0x49, 0x2a, 0x00] },
  { mime: "image/tiff", bytes: [0x4d, 0x4d, 0x00, 0x2a] },
  // Documents
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  { mime: "application/zip", bytes: [0x50, 0x4b, 0x03, 0x04] },
];

const ALLOWED_MIME_TYPES = {
  image: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/avif",
    "image/tiff",
    "image/bmp",
  ],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
  ],
};

const VALID_FILE_CATEGORIES = [
  "PRODUCT_IMAGE",
  "SERVICE_IMAGE",
  "AVATAR",
  "CV",
  "PORTFOLIO",
  "ATTACHMENT",
  "BANNER",
  "LOGO",
  "KYC_DOCUMENT",
];

/**
 * Image processing configuration per category.
 * maxWidth: Maximum width in pixels (height auto-calculated to preserve aspect ratio)
 * maxFileSizeKB: Target max file size after compression
 * quality: Initial WebP quality (will be reduced iteratively if needed)
 */
const IMAGE_PROCESSING_CONFIG: Record<string, { maxWidth: number; maxFileSizeKB: number; quality: number }> = {
  AVATAR: { maxWidth: 512, maxFileSizeKB: 150, quality: 80 },
  LOGO: { maxWidth: 512, maxFileSizeKB: 150, quality: 85 },
  BANNER: { maxWidth: 1920, maxFileSizeKB: 500, quality: 82 },
  PRODUCT_IMAGE: { maxWidth: 1024, maxFileSizeKB: 300, quality: 82 },
  SERVICE_IMAGE: { maxWidth: 1024, maxFileSizeKB: 300, quality: 82 },
  PORTFOLIO: { maxWidth: 1280, maxFileSizeKB: 400, quality: 80 },
  KYC_DOCUMENT: { maxWidth: 1280, maxFileSizeKB: 300, quality: 80 },
  ATTACHMENT: { maxWidth: 1024, maxFileSizeKB: 300, quality: 80 },
};

// Accept up to 10MB from client — we'll compress it down automatically
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB raw upload limit
const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024; // 5MB for non-image documents

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir: string;

  constructor(private prisma: PrismaService) {
    this.uploadDir =
      process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
    this.ensureUploadDir();
  }

  private ensureUploadDir() {
    const dirs = ["images", "documents", "avatars", "cv", "portfolio"];
    for (const dir of dirs) {
      const fullPath = path.join(this.uploadDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        this.logger.log(`Created upload directory: ${fullPath}`);
      }
    }
    this.logger.log(`Upload directories ensured at: ${this.uploadDir}`);
  }

  /**
   * Detect actual MIME type from file content (magic bytes).
   */
  private detectMimeType(buffer: Buffer): string | null {
    for (const sig of MAGIC_BYTES) {
      const offset = sig.offset || 0;
      if (buffer.length < offset + sig.bytes.length) continue;

      const matches = sig.bytes.every(
        (byte, i) => buffer[offset + i] === byte,
      );

      if (matches) {
        if (sig.mime === "image/webp") {
          if (buffer.length >= 12) {
            const webpSig = buffer.slice(8, 12).toString("ascii");
            if (webpSig === "WEBP") return "image/webp";
          }
          continue;
        }

        if (sig.mime === "application/zip") {
          const content = buffer.toString("ascii", 0, Math.min(buffer.length, 500));
          if (content.includes("[Content_Types]") || content.includes("word/")) {
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          }
          return "application/zip";
        }

        return sig.mime;
      }
    }

    return null;
  }

  /**
   * Validate that the file's actual content matches an allowed MIME type.
   * Falls back to client MIME type for formats not detectable via magic bytes (HEIC, AVIF, etc.)
   */
  private validateFileContent(
    buffer: Buffer,
    clientMimeType: string,
  ): string {
    const detectedMime = this.detectMimeType(buffer);

    const allAllowed = [
      ...ALLOWED_MIME_TYPES.image,
      ...ALLOWED_MIME_TYPES.document,
    ];

    // If magic bytes detected a type, validate it
    if (detectedMime) {
      if (!allAllowed.includes(detectedMime)) {
        throw new BadRequestException(
          `File type "${detectedMime}" is not allowed. ` +
            `Allowed: JPEG, PNG, GIF, WEBP, BMP, TIFF, PDF, DOC, DOCX`,
        );
      }

      if (clientMimeType !== detectedMime) {
        this.logger.warn(
          `MIME type mismatch: client sent "${clientMimeType}" but file content is "${detectedMime}"`,
        );
      }

      return detectedMime;
    }

    // Magic bytes couldn't detect — fallback to client MIME type
    // This handles HEIC, AVIF, and other newer formats
    // The actual processing (sharp) will fail if the file is truly invalid
    const imageClientTypes = [
      'image/heic', 'image/heif', 'image/avif',
      ...ALLOWED_MIME_TYPES.image,
    ];

    if (imageClientTypes.includes(clientMimeType)) {
      this.logger.warn(
        `Magic bytes detection failed, trusting client MIME: ${clientMimeType}`,
      );
      return clientMimeType;
    }

    if (allAllowed.includes(clientMimeType)) {
      this.logger.warn(
        `Magic bytes detection failed, trusting client MIME: ${clientMimeType}`,
      );
      return clientMimeType;
    }

    throw new BadRequestException(
      `Could not verify file type. The file content does not match any allowed format. ` +
        `Allowed: JPEG, PNG, GIF, WEBP, BMP, TIFF, PDF, DOC, DOCX`,
    );
  }

  async uploadFile(
    userId: string,
    file: Express.Multer.File,
    category: string = "ATTACHMENT",
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    // Check raw upload size limit (10MB for images, 5MB for documents)
    if (file.size > MAX_UPLOAD_SIZE) {
      throw new BadRequestException(
        `Ukuran file melebihi batas maksimal 10MB. Ukuran file Anda: ${(file.size / (1024 * 1024)).toFixed(1)}MB`,
      );
    }

    // Validate category
    if (!VALID_FILE_CATEGORIES.includes(category)) {
      this.logger.error(`[Upload] Invalid category: ${category}`);
      throw new BadRequestException(
        `Invalid file category "${category}". Valid categories: ${VALID_FILE_CATEGORIES.join(", ")}`,
      );
    }

    // Validate actual file content (magic bytes)
    const verifiedMimeType = this.validateFileContent(
      file.buffer,
      file.mimetype,
    );

    const subDir = this.getSubDir(category);
    const isImage = ALLOWED_MIME_TYPES.image.includes(verifiedMimeType) ||
      verifiedMimeType.startsWith('image/');

    // For non-image documents, enforce smaller size limit
    if (!isImage && file.size > MAX_DOCUMENT_SIZE) {
      throw new BadRequestException(
        `Ukuran dokumen melebihi batas maksimal 5MB. Ukuran file Anda: ${(file.size / (1024 * 1024)).toFixed(1)}MB`,
      );
    }

    let buffer = file.buffer;
    let finalMimeType = verifiedMimeType;
    let finalExt: string;
    let finalSize: number;

    if (isImage) {
      // === AUTO IMAGE PROCESSING ===
      const config = IMAGE_PROCESSING_CONFIG[category] || IMAGE_PROCESSING_CONFIG.ATTACHMENT;

      try {
        const processed = await this.processImage(file.buffer, config, file.originalname);

        buffer = processed.buffer;
        finalMimeType = "image/webp";
        finalExt = ".webp";
        finalSize = processed.buffer.length;

        this.logger.log(
          `[Upload] Image processed: ${file.originalname} ` +
          `(${(file.size / 1024).toFixed(0)}KB → ${(finalSize / 1024).toFixed(0)}KB WebP, ` +
          `${processed.originalWidth}x${processed.originalHeight} → ${processed.finalWidth}x${processed.finalHeight})`,
        );
      } catch (processError) {
        // If image processing fails (unsupported format, corrupt file), throw clear error
        this.logger.error(`[Upload] Image processing failed for ${file.originalname}:`, processError);
        throw new BadRequestException(
          `Gagal memproses gambar "${file.originalname}". Pastikan file tidak corrupt dan gunakan format JPEG, PNG, GIF, atau WebP.`,
        );
      }
    } else {
      // Non-image: sanitize extension
      finalExt = path
        .extname(file.originalname)
        .replace(/[^a-zA-Z0-9.]/g, "");
      if (verifiedMimeType === "application/pdf" && finalExt !== ".pdf") {
        finalExt = ".pdf";
      }
      finalSize = file.size;
    }

    const fileName = `${crypto.randomUUID()}${finalExt}`;
    const filePath = path.join(this.uploadDir, subDir, fileName);

    // Prevent path traversal
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(this.uploadDir))) {
      this.logger.error(`[Upload] Invalid file path detected: ${resolvedPath}`);
      throw new BadRequestException("Invalid file path");
    }

    fs.writeFileSync(filePath, buffer);

    // Store relative URL path — frontend will prepend the API base URL
    // This makes the system portable across environments (dev/staging/production)
    const relativePath = `/uploads/${subDir}/${fileName}`;
    const baseUrl = process.env.APP_URL || "http://localhost:3001";
    const fullUrl = `${baseUrl}${relativePath}`;

    const record = await this.prisma.fileUpload.create({
      data: {
        userId,
        originalName: file.originalname,
        fileName,
        mimeType: finalMimeType,
        size: finalSize,
        url: fullUrl,
        category: category as any,
      },
    });

    this.logger.log(`[Upload] Upload completed - URL: ${fullUrl}, Size: ${(finalSize / 1024).toFixed(0)}KB`);

    return {
      message: "File uploaded successfully",
      file: {
        id: record.id,
        url: record.url,
        originalName: record.originalName,
        mimeType: record.mimeType,
        size: record.size,
        category: record.category,
      },
    };
  }

  async uploadMultiple(
    userId: string,
    files: Express.Multer.File[],
    category: string = "ATTACHMENT",
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException("No files provided");
    }

    if (files.length > 10) {
      throw new BadRequestException("Maximum 10 files per upload");
    }

    const results = [];
    for (const file of files) {
      const result = await this.uploadFile(userId, file, category);
      results.push(result.file);
    }

    return {
      message: `${results.length} file(s) uploaded successfully`,
      files: results,
    };
  }

  async getUserFiles(userId: string, category?: string) {
    const where: any = { userId };
    if (category) where.category = category;

    return this.prisma.fileUpload.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  async deleteFile(userId: string, fileId: string) {
    const file = await this.prisma.fileUpload.findFirst({
      where: { id: fileId, userId },
    });

    if (!file) {
      throw new BadRequestException("File not found");
    }

    const subDir = this.getSubDir(file.category);
    const filePath = path.join(this.uploadDir, subDir, file.fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await this.prisma.fileUpload.delete({ where: { id: fileId } });

    return { message: "File deleted successfully" };
  }

  /**
   * Auto Image Processing Pipeline:
   * 1. Read metadata (dimensions, format)
   * 2. Resize to max width (preserve aspect ratio, never upscale)
   * 3. Convert to WebP format
   * 4. Iteratively reduce quality until target file size is met
   *
   * This runs automatically on ALL image uploads regardless of category.
   */
  private async processImage(
    inputBuffer: Buffer,
    config: { maxWidth: number; maxFileSizeKB: number; quality: number },
    originalName: string,
  ): Promise<{
    buffer: Buffer;
    originalWidth: number;
    originalHeight: number;
    finalWidth: number;
    finalHeight: number;
  }> {
    const metadata = await sharp(inputBuffer).metadata();
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;

    // Step 1: Resize if wider than maxWidth (preserve aspect ratio, never upscale)
    let pipeline = sharp(inputBuffer).rotate(); // auto-rotate based on EXIF

    if (originalWidth > config.maxWidth) {
      pipeline = pipeline.resize({
        width: config.maxWidth,
        withoutEnlargement: true,
        fit: "inside",
      });
    }

    // Step 2: Convert to WebP with initial quality
    let quality = config.quality;
    let result = await pipeline.webp({ quality, effort: 4 }).toBuffer();

    // Step 3: Iteratively reduce quality until under target size
    const targetSize = config.maxFileSizeKB * 1024;

    while (result.length > targetSize && quality > 15) {
      quality -= 8;
      result = await sharp(inputBuffer)
        .rotate()
        .resize({ width: config.maxWidth, withoutEnlargement: true, fit: "inside" })
        .webp({ quality, effort: 4 })
        .toBuffer();
    }

    // Step 4: If still too large, progressively reduce dimensions
    if (result.length > targetSize) {
      let resizeWidth = Math.round(config.maxWidth * 0.75);

      while (result.length > targetSize && resizeWidth >= 320) {
        result = await sharp(inputBuffer)
          .rotate()
          .resize({ width: resizeWidth, withoutEnlargement: true, fit: "inside" })
          .webp({ quality: Math.max(quality, 20), effort: 4 })
          .toBuffer();
        resizeWidth = Math.round(resizeWidth * 0.75);
      }
    }

    // Get final dimensions
    const finalMeta = await sharp(result).metadata();

    return {
      buffer: result,
      originalWidth,
      originalHeight,
      finalWidth: finalMeta.width || 0,
      finalHeight: finalMeta.height || 0,
    };
  }

  private getSubDir(category: string): string {
    switch (category) {
      case "PRODUCT_IMAGE":
      case "SERVICE_IMAGE":
      case "BANNER":
      case "LOGO":
        return "images";
      case "AVATAR":
        return "avatars";
      case "CV":
        return "cv";
      case "PORTFOLIO":
        return "portfolio";
      default:
        return "documents";
    }
  }
}
