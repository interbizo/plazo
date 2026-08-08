import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@modules/database/prisma.service';

@Injectable()
export class PlatformSettingsService {
  private readonly logger = new Logger(PlatformSettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getFlag(key: string): Promise<string | null> {
    const setting = await this.prisma.platformSetting.findUnique({ where: { key } });
    return setting?.value ?? null;
  }

  async isFlagEnabled(key: string): Promise<boolean> {
    const value = await this.getFlag(key);
    return value === 'true';
  }

  async getAllSettings() {
    return this.prisma.platformSetting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async setFlag(key: string, value: string, description: string | undefined, adminId: string) {
    const setting = await this.prisma.platformSetting.upsert({
      where: { key },
      update: { value, description, updatedBy: adminId },
      create: { key, value, description, updatedBy: adminId },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'UPDATE_PLATFORM_SETTING',
        entityType: 'PlatformSetting',
        entityId: setting.id,
        changes: JSON.stringify({ key, value, description }),
      },
    });

    this.logger.log(`[PlatformSettings] Flag "${key}" set to "${value}" by admin ${adminId}`);
    return setting;
  }

  async getMaintenanceStatus() {
    const [enabled, message, title, estimatedEnd] = await Promise.all([
      this.getFlag('maintenance.enabled'),
      this.getFlag('maintenance.message'),
      this.getFlag('maintenance.title'),
      this.getFlag('maintenance.estimated_end'),
    ]);

    return {
      enabled: enabled === 'true',
      message: message ?? 'Sedang dalam perbaikan.',
      title: title ?? 'Sedang Dalam Perbaikan',
      estimatedEnd: estimatedEnd || null,
    };
  }
}
