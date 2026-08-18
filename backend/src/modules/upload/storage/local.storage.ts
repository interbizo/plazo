import { Injectable } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class LocalStorageService {
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
    this.ensureUploadDir();
  }

  private ensureUploadDir() {
    const dirs = ["images", "documents", "avatars", "cv", "portfolio"];
    for (const dir of dirs) {
      const fullPath = path.join(this.uploadDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }
  }

  async save(subDir: string, fileName: string, buffer: Buffer): Promise<string> {
    const filePath = path.join(this.uploadDir, subDir, fileName);

    // Prevent path traversal
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(this.uploadDir))) {
      throw new Error("Invalid file path");
    }

    const fullDir = path.dirname(resolvedPath);
    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, { recursive: true });
    }

    fs.writeFileSync(resolvedPath, buffer);

    // Store relative URL path — frontend prepends the API base URL
    const relativePath = `/uploads/${subDir}/${fileName}`;
    const baseUrl = process.env.APP_URL || "http://localhost:3001";
    return `${baseUrl}${relativePath}`;
  }

  async delete(subDir: string, fileName: string): Promise<void> {
    const filePath = path.join(this.uploadDir, subDir, fileName);
    const resolvedPath = path.resolve(filePath);
    if (fs.existsSync(resolvedPath)) {
      fs.unlinkSync(resolvedPath);
    }
  }

  getUploadDir(): string {
    return this.uploadDir;
  }
}