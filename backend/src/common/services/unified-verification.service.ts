import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@modules/database/prisma.service';
import { EmailVerificationService } from './email-verification.service';
import { OTPService } from './otp.service';
import { OTPType } from '@prisma/client';

export enum VerificationMethod {
  EMAIL = 'email',
  PHONE = 'phone',
}

export interface SendVerificationOptions {
  userId?: string;
  email?: string;
  phone?: string;
  method: VerificationMethod;
  type: 'registration' | 'forgot_password';
}

export interface VerificationStatus {
  isVerified: boolean;
  verifiedVia?: VerificationMethod;
  emailVerified: boolean;
  phoneVerified: boolean;
}

@Injectable()
export class UnifiedVerificationService {
  private readonly logger = new Logger(UnifiedVerificationService.name);

  constructor(
    private prisma: PrismaService,
    private emailVerificationService: EmailVerificationService,
    private otpService: OTPService,
  ) {}

  /**
   * Send verification via selected method
   */
  async sendVerification(options: SendVerificationOptions): Promise<{
    success: boolean;
    message: string;
    method: VerificationMethod;
    cooldown?: number;
  }> {
    const { userId, email, phone, method, type } = options;

    // Get user info
    let user;
    if (userId) {
      user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          whatsappNumber: true,
          isEmailVerified: true,
          isPhoneVerified: true,
        },
      });
    } else if (email) {
      user = await this.prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          phone: true,
          whatsappNumber: true,
          isEmailVerified: true,
          isPhoneVerified: true,
        },
      });
    } else if (phone) {
      user = await this.prisma.user.findFirst({
        where: {
          OR: [{ phone }, { whatsappNumber: phone }],
        },
        select: {
          id: true,
          email: true,
          phone: true,
          whatsappNumber: true,
          isEmailVerified: true,
          isPhoneVerified: true,
        },
      });
    }

    if (!user) {
      // For security, return generic success message
      return {
        success: true,
        message: 'Jika akun terdaftar, kode verifikasi akan dikirim.',
        method,
      };
    }

    // Send via selected method
    if (method === VerificationMethod.EMAIL) {
      const result = await this.emailVerificationService.sendVerificationEmail(
        user.id,
      );
      return {
        ...result,
        method: VerificationMethod.EMAIL,
      };
    } else {
      // Send via WhatsApp
      const phoneNumber = user.whatsappNumber || user.phone;
      if (!phoneNumber) {
        throw new BadRequestException('Nomor WhatsApp tidak ditemukan');
      }

      const otpType =
        type === 'registration' ? OTPType.REGISTRATION : OTPType.FORGOT_PASSWORD;
      const result = await this.otpService.generateAndSend(
        phoneNumber,
        otpType,
        user.id,
      );

      return {
        success: result.success,
        message: result.message,
        method: VerificationMethod.PHONE,
        cooldown: result.cooldown,
      };
    }
  }

  /**
   * Check if user has completed at least one verification method
   */
  async getVerificationStatus(userId: string): Promise<VerificationStatus> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isEmailVerified: true,
        isPhoneVerified: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User tidak ditemukan');
    }

    const isVerified = user.isEmailVerified || user.isPhoneVerified;
    let verifiedVia: VerificationMethod | undefined;

    if (user.isEmailVerified && user.isPhoneVerified) {
      // Both verified, determine which was first
      if (user.emailVerifiedAt && user.phoneVerifiedAt) {
        verifiedVia =
          user.emailVerifiedAt < user.phoneVerifiedAt
            ? VerificationMethod.EMAIL
            : VerificationMethod.PHONE;
      } else if (user.emailVerifiedAt) {
        verifiedVia = VerificationMethod.EMAIL;
      } else {
        verifiedVia = VerificationMethod.PHONE;
      }
    } else if (user.isEmailVerified) {
      verifiedVia = VerificationMethod.EMAIL;
    } else if (user.isPhoneVerified) {
      verifiedVia = VerificationMethod.PHONE;
    }

    return {
      isVerified,
      verifiedVia,
      emailVerified: user.isEmailVerified,
      phoneVerified: user.isPhoneVerified,
    };
  }

  /**
   * Check if user can login (at least one method verified)
   */
  async canLogin(userId: string): Promise<{
    canLogin: boolean;
    reason?: string;
    requiresVerification?: boolean;
    availableMethods?: VerificationMethod[];
  }> {
    const status = await this.getVerificationStatus(userId);

    if (status.isVerified) {
      return { canLogin: true };
    }

    return {
      canLogin: false,
      reason: 'Akun Anda belum diverifikasi. Silakan verifikasi akun Anda terlebih dahulu.',
      requiresVerification: true,
      availableMethods: [VerificationMethod.EMAIL, VerificationMethod.PHONE],
    };
  }

  /**
   * Activate user account after verification
   */
  async activateAccount(userId: string): Promise<void> {
    const status = await this.getVerificationStatus(userId);

    if (status.isVerified) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isActive: true },
      });

      this.logger.log(
        `User ${userId} activated via ${status.verifiedVia} verification`,
      );
    }
  }

  /**
   * Get available verification methods for user
   */
  async getAvailableMethods(
    identifier: string,
  ): Promise<VerificationMethod[]> {
    // Try to find user by email or phone
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier },
          { whatsappNumber: identifier },
        ],
      },
      select: {
        email: true,
        phone: true,
        whatsappNumber: true,
      },
    });

    if (!user) {
      // Return both methods for security (don't reveal if user exists)
      return [VerificationMethod.EMAIL, VerificationMethod.PHONE];
    }

    const methods: VerificationMethod[] = [];

    if (user.email) {
      methods.push(VerificationMethod.EMAIL);
    }

    if (user.phone || user.whatsappNumber) {
      methods.push(VerificationMethod.PHONE);
    }

    return methods;
  }
}
