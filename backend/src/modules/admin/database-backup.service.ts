import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../database/prisma.service';
import { GoogleDriveService } from './google-drive.service';

const execAsync = promisify(exec);

interface BackupInfo {
  filename: string;
  filepath: string;
  size: number;
  createdAt: Date;
  type: 'manual' | 'auto';
  driveFileId?: string;
}

export { BackupInfo };

@Injectable()
export class DatabaseBackupService {
  private readonly logger = new Logger(DatabaseBackupService.name);
  private readonly backupDir: string;
  private readonly maxBackups: number = 30; // Keep last 30 backups

  constructor(
    private prisma: PrismaService,
    private googleDrive: GoogleDriveService,
  ) {
    // Create backup directory if not exists
    this.backupDir = path.join(process.cwd(), 'backups', 'database');
    this.ensureBackupDirectory();
  }

  // True bila Google Drive aktif & terkonfigurasi -> penyimpanan utama adalah Drive.
  // Bila false (Drive belum diatur), backup fallback ke folder lokal.
  private isDriveStorage(): boolean {
    return this.googleDrive.isEnabled() && this.googleDrive.isConfigured();
  }

  /**
   * Ensure backup directory exists
   */
  private ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`[Backup] Created backup directory: ${this.backupDir}`);
    }
  }

  /**
   * Create database backup
   */
  async createBackup(adminId: string, type: 'manual' | 'auto' = 'manual'): Promise<BackupInfo> {
    try {
      console.log(`[Backup] Starting ${type} backup by admin: ${adminId}`);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-${timestamp}.sql`;
      const filepath = path.join(this.backupDir, filename);

      // Get database connection info from environment
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new BadRequestException('DATABASE_URL not configured');
      }

      // Parse database URL
      const dbConfig = this.parseDatabaseUrl(databaseUrl);

      // Create backup using pg_dump (PostgreSQL)
      const command = this.buildBackupCommand(dbConfig, filepath);
      
      console.log(`[Backup] Executing backup command...`);
      await execAsync(command, { env: { ...process.env, PGPASSWORD: dbConfig.password } });

      // Get file stats
      const stats = fs.statSync(filepath);
      
      console.log(`[Backup] Backup created successfully: ${filename} (${this.formatBytes(stats.size)})`);

      // Upload to Google Drive bila diaktifkan
      let driveFileId: string | undefined;
      if (this.googleDrive.isEnabled() && this.googleDrive.isConfigured()) {
        try {
          driveFileId = await this.googleDrive.uploadFile(filepath, filename);
        } catch (uploadError) {
          console.error('[Backup] Error uploading to Google Drive:', uploadError);
        }
      }

      // Mode Drive: hapus file lokal (temp) setelah upload sukses ke Drive
      if (driveFileId) {
        fs.unlinkSync(filepath);
        console.log(`[Backup] Local temp file removed (${filename})`);
      }

      // Log backup to database
      await this.logBackup(adminId, filename, stats.size, type, driveFileId);

      // Cleanup old backups
      await this.cleanupOldBackups();

      return {
        filename,
        filepath,
        size: stats.size,
        createdAt: new Date(),
        type,
        driveFileId,
      };
    } catch (error) {
      console.error('[Backup] Error creating backup:', error);
      throw new BadRequestException(
        `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Auto backup berjalan sesuai jadwal di env BACKUP_CRON_SCHEDULE (default setiap hari 01:00).
  // Aktif bila BACKUP_AUTO_ENABLED=true.
  @Cron(process.env.BACKUP_CRON_SCHEDULE || "0 1 * * *")
  async handleAutoBackup(): Promise<void> {
    if (process.env.BACKUP_AUTO_ENABLED !== "true") return;

    this.logger.log("Running scheduled auto backup");
    try {
      await this.createBackup("system", "auto");
    } catch (error) {
      this.logger.error("Auto backup failed:", error);
    }
  }

  // Status konfigurasi backup (auto + Google Drive) dari environment.
  getBackupConfig() {
    return {
      autoBackup: {
        enabled: process.env.BACKUP_AUTO_ENABLED === "true",
        cronSchedule: process.env.BACKUP_CRON_SCHEDULE || "0 1 * * *",
      },
      googleDrive: this.googleDrive.getStatus(),
    };
  }

  // Uji koneksi Google Drive untuk verifikasi konfigurasi dari UI.
  async testGoogleDrive() {
    return this.googleDrive.testConnection();
  }

  /**
   * Parse database URL
   */
  private parseDatabaseUrl(url: string): {
    host: string;
    port: string;
    database: string;
    username: string;
    password: string;
  } {
    try {
      // Format: postgresql://username:password@host:port/database
      const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
      const match = url.match(regex);

      if (!match) {
        throw new Error('Invalid DATABASE_URL format');
      }

      return {
        username: decodeURIComponent(match[1]),
        password: decodeURIComponent(match[2]), // Decode URL-encoded characters like %40 -> @
        host: match[3],
        port: match[4],
        database: match[5].split('?')[0], // Remove query params
      };
    } catch (error) {
      throw new BadRequestException('Failed to parse DATABASE_URL');
    }
  }

  /**
   * Build backup command for PostgreSQL
   */
  private buildBackupCommand(
    config: { host: string; port: string; database: string; username: string; password: string },
    filepath: string,
  ): string {
    // Use 127.0.0.1 instead of localhost to avoid IPv6 issues
    const host = config.host === 'localhost' ? '127.0.0.1' : config.host;
    
    // Use pg_dump for PostgreSQL. Password dikirim via env (PGPASSWORD) agar
    // kompatibel lintas OS (prefix PGPASSWORD='...' hanya berfungsi di Unix shell).
    return `pg_dump -h ${host} -p ${config.port} -U ${config.username} -d ${config.database} -F p -f "${filepath}"`;
  }

  /**
   * Get list of backups
   */
  async listBackups(): Promise<BackupInfo[]> {
    try {
      console.log('[Backup] Listing backups');

      // Mode Drive: baca daftar langsung dari Google Drive
      if (this.isDriveStorage()) {
        const driveFiles = await this.googleDrive.listBackupFiles();
        const backups: BackupInfo[] = driveFiles.map((file) => ({
          filename: file.name,
          filepath: file.id, // gunakan fileId sebagai identitas
          size: Number(file.size || 0),
          createdAt: file.createdTime ? new Date(file.createdTime) : new Date(),
          type: 'auto',
          driveFileId: file.id,
        }));

        console.log(`[Backup] Found ${backups.length} backups on Google Drive`);
        return backups;
      }

      const files = fs.readdirSync(this.backupDir);
      const backups: BackupInfo[] = [];

      for (const file of files) {
        if (file.endsWith('.sql')) {
          const filepath = path.join(this.backupDir, file);
          const stats = fs.statSync(filepath);

          backups.push({
            filename: file,
            filepath,
            size: stats.size,
            createdAt: stats.birthtime,
            type: 'manual', // Default to manual, can be enhanced with metadata
          });
        }
      }

      // Sort by creation date (newest first)
      backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      console.log(`[Backup] Found ${backups.length} backups`);
      return backups;
    } catch (error) {
      console.error('[Backup] Error listing backups:', error);
      throw new BadRequestException('Failed to list backups');
    }
  }

  /**
   * Get backup file path
   */
  async getBackupPath(filename: string): Promise<string> {
    // Mode Drive: download dari Google Drive ke folder temp dulu
    if (this.isDriveStorage()) {
      const driveFiles = await this.googleDrive.listBackupFiles();
      const driveFile = driveFiles.find((file) => file.name === filename);

      if (!driveFile) {
        throw new BadRequestException('Backup file not found on Google Drive');
      }

      const tempDir = path.join(this.backupDir, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempPath = path.join(tempDir, filename);
      await this.googleDrive.downloadFile(driveFile.id, tempPath);
      return tempPath;
    }

    const filepath = path.join(this.backupDir, filename);

    if (!fs.existsSync(filepath)) {
      throw new BadRequestException('Backup file not found');
    }

    return filepath;
  }

  /**
   * Delete backup
   */
  async deleteBackup(filename: string, adminId: string): Promise<void> {
    try {
      console.log(`[Backup] Deleting backup: ${filename} by admin: ${adminId}`);

      // Mode Drive: hapus dari Google Drive
      if (this.isDriveStorage()) {
        const driveFiles = await this.googleDrive.listBackupFiles();
        const driveFile = driveFiles.find((file) => file.name === filename);

        if (!driveFile) {
          throw new BadRequestException('Backup file not found on Google Drive');
        }

        await this.googleDrive.deleteFile(driveFile.id);
        console.log(`[Backup] Backup deleted from Google Drive: ${filename}`);
        return;
      }

      const filepath = path.join(this.backupDir, filename);

      if (!fs.existsSync(filepath)) {
        throw new BadRequestException('Backup file not found');
      }

      fs.unlinkSync(filepath);
      console.log(`[Backup] Backup deleted: ${filename}`);
    } catch (error) {
      console.error('[Backup] Error deleting backup:', error);
      throw new BadRequestException('Failed to delete backup');
    }
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(filename: string, adminId: string): Promise<void> {
    try {
      console.log(`[Backup] Starting restore from: ${filename} by admin: ${adminId}`);

      const filepath = await this.getBackupPath(filename);

      // Get database connection info
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new BadRequestException('DATABASE_URL not configured');
      }

      const dbConfig = this.parseDatabaseUrl(databaseUrl);

      // Use 127.0.0.1 instead of localhost to avoid IPv6 issues
      const host = dbConfig.host === 'localhost' ? '127.0.0.1' : dbConfig.host;
      
      // Restore using psql (password dikirim via env, kompatibel lintas OS)
      const command = `psql -h ${host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -f "${filepath}"`;

      console.log(`[Backup] Executing restore command...`);
      await execAsync(command, { env: { ...process.env, PGPASSWORD: dbConfig.password } });

      console.log(`[Backup] Database restored successfully from: ${filename}`);

      // Hapus file temp hasil download dari Drive setelah restore selesai
      if (this.isDriveStorage() && fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }

      // Log restore action
      await this.logRestore(adminId, filename);
    } catch (error) {
      console.error('[Backup] Error restoring backup:', error);
      throw new BadRequestException(
        `Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Cleanup old backups (keep only last N backups)
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.listBackups();

      if (backups.length > this.maxBackups) {
        const toDelete = backups.slice(this.maxBackups);
        
        console.log(`[Backup] Cleaning up ${toDelete.length} old backups`);

        for (const backup of toDelete) {
          if (this.isDriveStorage() && backup.driveFileId) {
            await this.googleDrive.deleteFile(backup.driveFileId);
          } else if (fs.existsSync(backup.filepath)) {
            fs.unlinkSync(backup.filepath);
          }
          console.log(`[Backup] Deleted old backup: ${backup.filename}`);
        }
      }

      // Mode lokal: cleanup file backup lama di Google Drive juga (di luar retensi)
      if (
        !this.isDriveStorage() &&
        this.googleDrive.isEnabled() &&
        this.googleDrive.isConfigured()
      ) {
        const driveFiles = await this.googleDrive.listBackupFiles();
        const driveToDelete = driveFiles.slice(this.maxBackups);

        for (const file of driveToDelete) {
          try {
            await this.googleDrive.deleteFile(file.id);
          } catch (error) {
            console.error(`[Backup] Error deleting Google Drive file ${file.name}:`, error);
          }
        }

        if (driveToDelete.length > 0) {
          console.log(`[Backup] Deleted ${driveToDelete.length} old Google Drive backups`);
        }
      }
    } catch (error) {
      console.error('[Backup] Error cleaning up old backups:', error);
    }
  }

  /**
   * Log backup to database
   */
  private async logBackup(adminId: string, filename: string, size: number, type: string, driveFileId?: string): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId: adminId,
          action: 'database_backup',
          metadata: {
            filename,
            size,
            type,
            sizeFormatted: this.formatBytes(size),
            driveFileId: driveFileId || null,
          },
        } as any,
      });
    } catch (error) {
      console.error('[Backup] Error logging backup:', error);
    }
  }

  /**
   * Log restore to database
   */
  private async logRestore(adminId: string, filename: string): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId: adminId,
          action: 'database_restore',
          metadata: {
            filename,
          },
        } as any,
      });
    } catch (error) {
      console.error('[Backup] Error logging restore:', error);
    }
  }

  /**
   * Format bytes to human readable
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    totalSize: string;
    tableCount: number;
    recordCount: number;
  }> {
    try {
      // Get database size
      const sizeResult = await this.prisma.$queryRaw<Array<{ size: bigint }>>`
        SELECT pg_database_size(current_database()) as size
      `;
      
      const totalSize = this.formatBytes(Number(sizeResult[0].size));

      // Get table count
      const tableResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `;
      
      const tableCount = Number(tableResult[0].count);

      // Get approximate record count (sum of all tables)
      const recordResult = await this.prisma.$queryRaw<Array<{ total: bigint }>>`
        SELECT SUM(n_live_tup) as total
        FROM pg_stat_user_tables
      `;
      
      const recordCount = Number(recordResult[0].total || 0);

      return {
        totalSize,
        tableCount,
        recordCount,
      };
    } catch (error) {
      console.error('[Backup] Error getting database stats:', error);
      return {
        totalSize: 'Unknown',
        tableCount: 0,
        recordCount: 0,
      };
    }
  }
}
