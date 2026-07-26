import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@modules/database/prisma.service';

@Injectable()
export class OtpCleanupTask {
  private readonly logger = new Logger(OtpCleanupTask.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Cleanup expired OTPs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupExpiredOtps() {
    try {
      const now = new Date();
      
      const result = await this.prisma.oTP.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } }, // Expired
            { 
              isUsed: true,
              usedAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } // Used more than 24h ago
            },
          ],
        },
      });

      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} expired/used OTPs`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired OTPs', error);
    }
  }

  /**
   * Cleanup old unused OTPs (older than 1 hour)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldUnusedOtps() {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const result = await this.prisma.oTP.deleteMany({
        where: {
          isUsed: false,
          createdAt: { lt: oneHourAgo },
        },
      });

      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} old unused OTPs`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old unused OTPs', error);
    }
  }
}
