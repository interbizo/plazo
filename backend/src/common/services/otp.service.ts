import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@modules/database/prisma.service';
import { FontteService } from '@common/services/fonnte.service';
import { OTPType } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class OTPService {
  private readonly logger = new Logger(OTPService.name);
  private readonly OTP_EXPIRY_MINUTES = 1; // 1 minute
  private readonly OTP_COOLDOWN_SECONDS = 60; // 60 seconds cooldown
  private readonly MAX_ATTEMPTS = 3; // Max verification attempts

  constructor(
    private prisma: PrismaService,
    private fonnte: FontteService,
  ) {}

  /**
   * Normalize phone number to consistent format
   * Removes spaces, dashes, and ensures +62 prefix
   */
  private normalizePhone(phone: string): string {
    // Remove all spaces and dashes
    let normalized = phone.replace(/[\s-]/g, '');
    
    // If starts with 0, replace with +62
    if (normalized.startsWith('0')) {
      normalized = '+62' + normalized.substring(1);
    }
    
    // If doesn't start with +, add +62
    if (!normalized.startsWith('+')) {
      normalized = '+62' + normalized;
    }
    
    return normalized;
  }

  /**
   * Generate 6-digit OTP code
   */
  private generateOTPCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Check if cooldown period has passed
   */
  async checkCooldown(phone: string, type: OTPType): Promise<boolean> {
    const normalizedPhone = this.normalizePhone(phone);
    const cooldownTime = new Date(Date.now() - this.OTP_COOLDOWN_SECONDS * 1000);

    const recentOTP = await this.prisma.oTP.findFirst({
      where: {
        phone: normalizedPhone,
        type,
        createdAt: {
          gte: cooldownTime,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return !recentOTP; // true if no recent OTP (cooldown passed)
  }

  /**
   * Get remaining cooldown time in seconds
   */
  async getRemainingCooldown(phone: string, type: OTPType): Promise<number> {
    const normalizedPhone = this.normalizePhone(phone);
    const cooldownTime = new Date(Date.now() - this.OTP_COOLDOWN_SECONDS * 1000);

    const recentOTP = await this.prisma.oTP.findFirst({
      where: {
        phone: normalizedPhone,
        type,
        createdAt: {
          gte: cooldownTime,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!recentOTP) return 0;

    const elapsed = Date.now() - recentOTP.createdAt.getTime();
    const remaining = this.OTP_COOLDOWN_SECONDS - Math.floor(elapsed / 1000);

    return Math.max(0, remaining);
  }

  /**
   * Generate and send OTP
   */
  async generateAndSend(
    phone: string,
    type: OTPType,
    userId?: string,
  ): Promise<{ success: boolean; message: string; cooldown?: number }> {
    try {
      // Normalize phone number
      const normalizedPhone = this.normalizePhone(phone);
      
      this.logger.debug(`Generating OTP - Original: ${phone}, Normalized: ${normalizedPhone}, Type: ${type}`);
      
      // Check cooldown
      const canSend = await this.checkCooldown(normalizedPhone, type);
      if (!canSend) {
        const remaining = await this.getRemainingCooldown(normalizedPhone, type);
        return {
          success: false,
          message: `Mohon tunggu ${remaining} detik sebelum mengirim OTP lagi`,
          cooldown: remaining,
        };
      }

      // Invalidate all previous OTPs for this phone and type
      await this.prisma.oTP.updateMany({
        where: {
          phone: normalizedPhone,
          type,
          isUsed: false,
        },
        data: {
          isUsed: true,
        },
      });

      // Generate new OTP
      const code = this.generateOTPCode();
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

      // Save OTP to database
      const savedOTP = await this.prisma.oTP.create({
        data: {
          phone: normalizedPhone,
          code,
          type,
          expiresAt,
          userId,
        },
      });
      
      this.logger.log(`[OTP CREATE] ✅ OTP created - ID: ${savedOTP.id}, Phone: ${normalizedPhone}, Code: "${code}", Type: ${type}, Expires: ${expiresAt.toISOString()}`);

      // Send OTP via WhatsApp
      const otpType = type.toLowerCase().replace('_', '_') as 'registration' | 'forgot_password' | 'login_2fa';
      const sent = await this.fonnte.sendOTP({
        phone: normalizedPhone,
        code,
        type: otpType,
      });

      if (!sent) {
        throw new Error('Failed to send OTP via WhatsApp');
      }

      this.logger.log(`[OTP CREATE] ✅ OTP sent to ${phone} (normalized: ${normalizedPhone}) for ${type}`);

      return {
        success: true,
        message: 'Kode OTP telah dikirim ke WhatsApp Anda',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error generating OTP: ${errorMessage}`);
      throw new BadRequestException('Gagal mengirim kode OTP. Silakan coba lagi.');
    }
  }

  /**
   * Verify OTP code
   */
  async verify(
    phone: string,
    code: string,
    type: OTPType,
  ): Promise<{ success: boolean; message: string; userId?: string }> {
    try {
      // Normalize phone number and ensure code is string
      const normalizedPhone = this.normalizePhone(phone);
      const codeStr = String(code).trim();
      
      this.logger.log(`[OTP VERIFY] Original Phone: ${phone}, Normalized: ${normalizedPhone}, Code: "${codeStr}", Type: ${type}`);
      
      // Find valid OTP
      const otp = await this.prisma.oTP.findFirst({
        where: {
          phone: normalizedPhone,
          code: codeStr,
          type,
          isUsed: false,
          expiresAt: {
            gte: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      if (otp) {
        this.logger.log(`[OTP VERIFY] ✅ OTP FOUND - ID: ${otp.id}, Code: "${otp.code}", Expires: ${otp.expiresAt}`);
      } else {
        this.logger.warn(`[OTP VERIFY] ❌ OTP NOT FOUND - Searching for recent OTP...`);
        
        // Debug: Check all OTPs for this phone
        const allOTPs = await this.prisma.oTP.findMany({
          where: {
            phone: normalizedPhone,
            type,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 3,
        });
        
        this.logger.warn(`[OTP VERIFY] Recent OTPs for ${normalizedPhone}: Found ${allOTPs.length} OTP(s)`);
        
        if (allOTPs.length === 0) {
          this.logger.error(`[OTP VERIFY] ⚠️ NO OTP FOUND IN DATABASE for phone ${normalizedPhone} and type ${type}`);
          this.logger.error(`[OTP VERIFY] ⚠️ Possible causes:`);
          this.logger.error(`  1. OTP was never created (check OTP CREATE logs)`);
          this.logger.error(`  2. OTP was created with different phone number`);
          this.logger.error(`  3. OTP was already cleaned up (expired)`);
        } else {
          allOTPs.forEach((o, i) => {
            this.logger.warn(`  ${i + 1}. Code: "${o.code}", IsUsed: ${o.isUsed}, Expires: ${o.expiresAt}, Created: ${o.createdAt}`);
          });
        }
      }

      if (!otp) {
        // Check if OTP exists but expired
        const expiredOTP = await this.prisma.oTP.findFirst({
          where: {
            phone: normalizedPhone,
            code: codeStr,
            type,
            isUsed: false,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (expiredOTP) {
          this.logger.warn(`OTP expired for phone ${normalizedPhone}`);
          return {
            success: false,
            message: 'Kode OTP telah kadaluarsa. Silakan minta kode baru.',
          };
        }

        // Increment attempts for the most recent OTP
        const recentOTP = await this.prisma.oTP.findFirst({
          where: {
            phone: normalizedPhone,
            type,
            isUsed: false,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (recentOTP) {
          this.logger.warn(`Invalid OTP attempt for phone ${normalizedPhone}. Current attempts: ${recentOTP.attempts}, Code provided: ${codeStr}, Expected: ${recentOTP.code}`);
          
          await this.prisma.oTP.update({
            where: { id: recentOTP.id },
            data: {
              attempts: {
                increment: 1,
              },
            },
          });

          if (recentOTP.attempts + 1 >= this.MAX_ATTEMPTS) {
            await this.prisma.oTP.update({
              where: { id: recentOTP.id },
              data: { isUsed: true },
            });

            this.logger.warn(`Max attempts reached for phone ${normalizedPhone}. OTP invalidated.`);
            return {
              success: false,
              message: 'Terlalu banyak percobaan gagal. Silakan minta kode OTP baru.',
            };
          }
        }

        return {
          success: false,
          message: 'Kode OTP tidak valid',
        };
      }

      // Mark OTP as used
      await this.prisma.oTP.update({
        where: { id: otp.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      });

      this.logger.log(`OTP verified successfully for ${phone}`);

      return {
        success: true,
        message: 'Kode OTP berhasil diverifikasi',
        userId: otp.userId || undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error verifying OTP: ${errorMessage}`);
      throw new BadRequestException('Gagal memverifikasi kode OTP');
    }
  }

  /**
   * Clean up expired OTPs (can be run as cron job)
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.oTP.deleteMany({
      where: {
        OR: [
          {
            expiresAt: {
              lt: new Date(),
            },
          },
          {
            isUsed: true,
            usedAt: {
              lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
            },
          },
        ],
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired OTPs`);
    return result.count;
  }
}
