import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PlatformSettingsService } from '@modules/platform-settings/platform-settings.service';

/** Rute yang bypass mode maintenance */
const BYPASS_PREFIXES = [
  '/admin',
  '/api/admin',
  '/auth',
  '/api/auth',
  '/health',
  '/uploads',
  // Endpoint feature-flag publik: navbar/feature-gate frontend membutuhkannya untuk merender visibilitas modul yang benar
  '/api/public/platform-settings',
  // Notifikasi bersifat user-scoped dan di-poll oleh dashboard admin; pertahankan admin panel tetap dapat digunakan
  '/api/notifications',
];

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  constructor(private readonly platformSettings: PlatformSettingsService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Gunakan req.originalUrl — NestJS menerapkan middleware global per-route sehingga req.url dipotong menjadi path yang tersisa
    const path = (req.originalUrl || req.url || "").split("?")[0];

    // Bypass untuk rute admin & auth
    const isBypassed = BYPASS_PREFIXES.some((prefix) => path.startsWith(prefix));
    if (isBypassed) return next();

    try {
      const status = await this.platformSettings.getMaintenanceStatus();
      if (status.enabled) {
        return res.status(503).json({
          statusCode: 503,
          error: 'Service Unavailable',
          maintenance: true,
          title: status.title,
          message: status.message,
          estimatedEnd: status.estimatedEnd,
        });
      }
    } catch (err: unknown) {
      // Jika terjadi kesalahan saat memeriksa maintenance, biarkan request lewat
      // untuk menghindari situs down
      console.error('[MaintenanceMiddleware] Error checking maintenance status:', (err as Error).message);
    }

    return next();
  }
}
