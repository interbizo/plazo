import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_FLAG_KEY } from '@common/decorators/require-feature-flag.decorator';
import { PlatformSettingsService } from '@modules/platform-settings/platform-settings.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly platformSettings: PlatformSettingsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const flagKey = this.reflector.getAllAndOverride<string>(FEATURE_FLAG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!flagKey) return true;

    const req = context.switchToHttp().getRequest();
    // Gunakan originalUrl — NestJS menerapkan guard per-route sehingga req.path/req.url dipotong menjadi "/" di dalam route
    const path: string = (req.originalUrl || req.url || '').split('?')[0];
    const user = req.user;

    // Rute admin dan pengguna admin SELALU bypass module toggle
    if (
      path.startsWith('/admin') ||
      path.startsWith('/api/admin') ||
      user?.role === UserRole.ADMIN ||
      user?.role === UserRole.SUPER_ADMIN
    ) {
      return true;
    }

    const isEnabled = await this.platformSettings.isFlagEnabled(flagKey);
    if (!isEnabled) {
      // Kembalikan 404 Not Found saat module OFF
      throw new NotFoundException('Halaman tidak ditemukan');
    }

    return true;
  }
}
