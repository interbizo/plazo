import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@modules/database/prisma.service';
import { EmailService } from '@common/services/email.service';
import { PasswordHelper } from '@common/utils/password.helper';
import * as crypto from 'crypto';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);
  private readonly tokenExpirySeconds: number;
  private readonly resendCooldownSeconds: number;

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {
    this.tokenExpirySeconds = this.configService.get<number>(
      'EMAIL_VERIFICATION_TOKEN_EXPIRY',
      86400, // 24 hours default
    );
    this.resendCooldownSeconds = this.configService.get<number>(
      'EMAIL_VERIFICATION_RESEND_COOLDOWN',
      60, // 60 seconds default
    );
  }

  /**
   * Generate verification token
   */
  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Send verification email to user
   */
  async sendVerificationEmail(userId: string): Promise<{
    success: boolean;
    message: string;
    cooldown?: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        isEmailVerified: true,
        lastVerificationEmailSentAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User tidak ditemukan');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email sudah diverifikasi');
    }

    // Check cooldown
    const cooldownRemaining = this.getRemainingCooldown(
      user.lastVerificationEmailSentAt,
    );
    if (cooldownRemaining > 0) {
      return {
        success: false,
        message: `Mohon tunggu ${cooldownRemaining} detik sebelum mengirim email verifikasi lagi`,
        cooldown: cooldownRemaining,
      };
    }

    // Generate new token
    const token = this.generateVerificationToken();
    const expiresAt = new Date(Date.now() + this.tokenExpirySeconds * 1000);

    // Update user with new token
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        verificationToken: token,
        verificationTokenExpiry: expiresAt,
        lastVerificationEmailSentAt: new Date(),
      },
    });

    // Send email
    const emailSent = await this.emailService.sendVerificationEmail(
      user.email,
      token,
      user.firstName,
    );

    if (!emailSent) {
      this.logger.error(`Failed to send verification email to ${user.email}`);
      throw new BadRequestException('Gagal mengirim email verifikasi');
    }

    this.logger.log(`Verification email sent to ${user.email}`);

    return {
      success: true,
      message: 'Email verifikasi telah dikirim. Silakan cek inbox Anda.',
    };
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{
    success: boolean;
    message: string;
    accessToken?: string;
    refreshToken?: string;
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      isEmailVerified: boolean;
      isPhoneVerified: boolean;
      verificationMethod: string;
      isActive: boolean;
    };
  }> {
    const user = await this.prisma.user.findFirst({
      where: {
        verificationToken: token,
      },
    });

    if (!user) {
      throw new BadRequestException('Token verifikasi tidak valid');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email sudah diverifikasi');
    }

    // Check if token expired
    if (
      !user.verificationTokenExpiry ||
      user.verificationTokenExpiry < new Date()
    ) {
      throw new BadRequestException(
        'Token verifikasi sudah kadaluarsa. Silakan minta token baru.',
      );
    }

    // Mark BOTH email AND phone as verified, set verification method, and activate account
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        isPhoneVerified: true, // Also mark phone as verified
        phoneVerifiedAt: new Date(), // Set phone verification timestamp
        verificationMethod: 'EMAIL', // Track that user verified via Email
        verificationToken: null,
        verificationTokenExpiry: null,
        isActive: true, // Activate account immediately after verification
      },
    });

    this.logger.log(
      `✅ User ${user.id} (${user.email}) verified via EMAIL - Both email and phone marked as verified - account activated`,
    );

    // Send welcome email (non-blocking)
    this.emailService.sendWelcomeEmail(user.email, user.firstName || "User", user.role).catch(() => {});

    // Generate tokens for auto-login
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Hash and store refresh token
    const hashedRefreshToken = await PasswordHelper.hashPassword(refreshToken);
    const tokenFamily = crypto.randomBytes(16).toString('hex');
    
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashedRefreshToken,
        family: tokenFamily,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      success: true,
      message: 'Email berhasil diverifikasi. Akun Anda telah aktif.',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: true,
        isPhoneVerified: true,
        verificationMethod: 'EMAIL',
        isActive: true,
      },
    };
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<{
    success: boolean;
    message: string;
    cooldown?: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        isEmailVerified: true,
        lastVerificationEmailSentAt: true,
      },
    });

    if (!user) {
      // Don't reveal if user exists (security)
      return {
        success: true,
        message: 'Jika email terdaftar, email verifikasi akan dikirim.',
      };
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email sudah diverifikasi');
    }

    return this.sendVerificationEmail(user.id);
  }

  /**
   * Get remaining cooldown in seconds
   */
  private getRemainingCooldown(lastSentAt: Date | null): number {
    if (!lastSentAt) return 0;

    const elapsedSeconds = Math.floor(
      (Date.now() - lastSentAt.getTime()) / 1000,
    );
    const remaining = this.resendCooldownSeconds - elapsedSeconds;

    return remaining > 0 ? remaining : 0;
  }

  /**
   * Check if user can resend verification email
   */
  async canResendVerificationEmail(userId: string): Promise<{
    canSend: boolean;
    cooldown: number;
    message: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isEmailVerified: true,
        lastVerificationEmailSentAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User tidak ditemukan');
    }

    if (user.isEmailVerified) {
      return {
        canSend: false,
        cooldown: 0,
        message: 'Email sudah diverifikasi',
      };
    }

    const cooldown = this.getRemainingCooldown(
      user.lastVerificationEmailSentAt,
    );

    return {
      canSend: cooldown === 0,
      cooldown,
      message:
        cooldown > 0
          ? `Mohon tunggu ${cooldown} detik sebelum mengirim email lagi`
          : 'Email verifikasi dapat dikirim',
    };
  }

  /**
   * Generate password reset token and send email
   */
  async sendPasswordResetEmail(email: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
      },
    });

    if (!user) {
      // Don't reveal if user exists (security)
      return {
        success: true,
        message: 'Jika email terdaftar, link reset password akan dikirim.',
      };
    }

    // Generate reset token
    const token = this.generateVerificationToken();
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

    // Update user with reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiry: expiresAt,
      },
    });

    // Send email
    const emailSent = await this.emailService.sendPasswordResetEmail(
      user.email,
      token,
      user.firstName,
    );

    if (!emailSent) {
      this.logger.error(`Failed to send password reset email to ${user.email}`);
      throw new BadRequestException('Gagal mengirim email reset password');
    }

    this.logger.log(`Password reset email sent to ${user.email}`);

    return {
      success: true,
      message: 'Link reset password telah dikirim ke email Anda.',
    };
  }

  /**
   * Verify password reset token
   */
  async verifyResetToken(token: string): Promise<{
    valid: boolean;
    userId?: string;
    message: string;
  }> {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
      },
      select: {
        id: true,
        resetTokenExpiry: true,
      },
    });

    if (!user) {
      return {
        valid: false,
        message: 'Token reset password tidak valid',
      };
    }

    // Check if token expired
    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return {
        valid: false,
        message: 'Token reset password sudah kadaluarsa',
      };
    }

    return {
      valid: true,
      userId: user.id,
      message: 'Token valid',
    };
  }
}
