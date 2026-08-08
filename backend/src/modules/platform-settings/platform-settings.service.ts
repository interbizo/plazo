import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '@modules/database/prisma.service';
import { REDIS_CLIENT } from '@modules/redis/redis.module';
import Redis from 'ioredis';

const FLAG_KEY_PREFIX = 'plazo:flags:';
const FLAG_TTL_SECONDS = 60;

@Injectable()
export class PlatformSettingsService implements OnModuleDestroy {
  private readonly logger = new Logger(PlatformSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  onModuleDestroy() {
    this.redis.disconnect();
  }

  // Ambil nilai flag tunggal
  async getFlag(key: string): Promise<string | null> {
    const redisKey = `${FLAG_KEY_PREFIX}${key}`;

    // Try Redis cache if client is ready
    if (this.redis.status === 'ready') {
      try {
        const cached = await this.redis.get(redisKey);
        if (cached !== null) return cached;
      } catch {
        // Silent fallback on cache miss/error
      }
    }

    // Fallback to DB
    const setting = await this.prisma.platformSetting.findUnique({ where: { key } });
    const value = setting?.value ?? null;

    if (value !== null && this.redis.status === 'ready') {
      try {
        await this.redis.set(redisKey, value, 'EX', FLAG_TTL_SECONDS);
      } catch {
        // Silent fallback
      }
    }

    return value;
  }

  // Periksa apakah boolean flag aktif
  async isFlagEnabled(key: string): Promise<boolean> {
    const value = await this.getFlag(key);
    return value === 'true';
  }

  // Ambil semua settings (untuk admin panel)
  async getAllSettings() {
    return this.prisma.platformSetting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  // Update flag
  async setFlag(key: string, value: string, description: string | undefined, adminId: string) {
    const setting = await this.prisma.platformSetting.upsert({
      where: { key },
      update: { value, description, updatedBy: adminId },
      create: { key, value, description, updatedBy: adminId },
    });

    // Update Redis cache immediately
    const redisKey = `${FLAG_KEY_PREFIX}${key}`;
    try {
      await this.redis.set(redisKey, value, 'EX', FLAG_TTL_SECONDS);
    } catch (err: unknown) {
      this.logger.warn(`[Redis] Failed to update cache for key "${key}": ${(err as Error).message}`);
    }

    // Audit log — use correct AuditLog schema fields: userId, entityType, entityId, changes
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

  // Maintenance mode helpers
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

  // Manajemen cache

  /** Flush the entire Redis DB — nuclear option, SUPER_ADMIN only */
  async flushRedisDb(): Promise<{ result: string; skipped?: boolean }> {
    if (this.redis.status !== 'ready') {
      this.logger.warn('[Cache] flushRedisDb skipped — Redis not connected');
      return { result: 'skipped', skipped: true };
    }
    try {
      const result = await this.redis.flushdb();
      this.logger.warn('[Cache] FLUSHDB executed — all Redis keys cleared');
      return { result };
    } catch (err: unknown) {
      this.logger.error(`[Redis] flushdb error: ${(err as Error).message}`);
      return { result: 'error', skipped: true };
    }
  }

  /** Get Redis INFO stats */
  async getCacheStats() {
    try {
      const info = await this.redis.info('all');
      const lines = info.split('\r\n');
      const parsed: Record<string, string> = {};
      for (const line of lines) {
        if (line && !line.startsWith('#')) {
          const [k, v] = line.split(':');
          if (k && v !== undefined) parsed[k.trim()] = v.trim();
        }
      }
      return {
        connected_clients: parsed['connected_clients'],
        used_memory_human: parsed['used_memory_human'],
        uptime_in_seconds: parsed['uptime_in_seconds'],
        total_commands_processed: parsed['total_commands_processed'],
        keyspace_hits: parsed['keyspace_hits'],
        keyspace_misses: parsed['keyspace_misses'],
        redis_version: parsed['redis_version'],
      };
    } catch (err: unknown) {
      this.logger.error(`[Redis] getCacheStats error: ${(err as Error).message}`);
      return { error: 'Redis not available', message: (err as Error).message };
    }
  }
}
