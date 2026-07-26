import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@modules/database/prisma.service';
import { OTPService } from '@common/services/otp.service';
import { PasswordHelper } from '@common/utils/password.helper';
import { OTPType } from '@prisma/client';
import {
  VerifyOTPDto,
  ResendOTPDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/otp.dto';

@Injectable()
export class AuthOTPService {
  private readonly logger = new Logger(AuthOTPService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private otpService: OTPService,
  ) {}

  /**
   * Verify OTP (for registration or forgot password verification)
   */
  async verifyRegistrationOTP(dto: VerifyOTPDto) {
    const { phone, code, type } = dto;

    // Verify OTP with the specified type
    const result = await this.otpService.verify(phone, code, type);

    if (!result.success) {
      throw new BadRequestException(result.message);
    }

    // Find user by phone
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone },
          { whatsappNumber: phone },
        ],
      },
    });

    if (!user) {
      throw new BadRequestException('User tidak ditemukan');
    }

    // Handle based on OTP type
    if (type === OTPType.REGISTRATION) {
      // Check if already verified
      if (user.isPhoneVerified) {
        throw new BadRequestException('Nomor WhatsApp sudah diverifikasi');
      }

      // Update user: mark BOTH phone AND email as verified, set verification method, and activate account
      const updatedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          isPhoneVerified: true,
          phoneVerifiedAt: new Date(),
          isEmailVerified: true, // Also mark email as verified
          emailVerifiedAt: new Date(), // Set email verification timestamp
          verificationMethod: 'WHATSAPP', // Track that user verified via WhatsApp
          isActive: true, // Activate account after verification
        },
      });

      this.logger.log(`✅ User ${user.id} (${user.email}) verified via WHATSAPP OTP - Both email and phone marked as verified - isActive: ${updatedUser.isActive}`);

      // Generate tokens for auto-login after verification
      const payload = { sub: user.id, email: user.email, role: user.role };
      const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

      // Hash and store refresh token
      const hashedRefreshToken = await PasswordHelper.hashPassword(refreshToken);
      const tokenFamily = require('crypto').randomBytes(16).toString('hex');
      
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
        message: 'Verifikasi berhasil. Akun Anda telah aktif.',
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isPhoneVerified: true,
          isEmailVerified: true,
        },
      };
    } else if (type === OTPType.FORGOT_PASSWORD) {
      // For forgot password, just verify OTP is valid
      // Don't generate tokens, user will reset password next
      this.logger.log(`✅ OTP verified for forgot password - User ${user.id}`);

      return {
        success: true,
        message: 'Kode OTP valid. Silakan masukkan password baru.',
        userId: user.id,
      };
    }

    throw new BadRequestException('Tipe OTP tidak valid');
  }

  /**
   * Resend OTP
   */
  async resendOTP(dto: ResendOTPDto) {
    const { phone, type } = dto;

    // For registration, check if user exists
    if (type === OTPType.REGISTRATION) {
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { phone },
            { whatsappNumber: phone },
          ],
        },
      });

      if (!user) {
        throw new BadRequestException('User tidak ditemukan');
      }

      if (user.isPhoneVerified) {
        throw new BadRequestException('Nomor WhatsApp sudah diverifikasi');
      }
    }

    // For forgot password, check if user exists
    if (type === OTPType.FORGOT_PASSWORD) {
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { phone },
            { whatsappNumber: phone },
          ],
        },
      });

      if (!user) {
        throw new BadRequestException('Nomor WhatsApp tidak terdaftar');
      }
    }

    // Send OTP
    const result = await this.otpService.generateAndSend(phone, type);

    if (!result.success) {
      throw new BadRequestException(result.message);
    }

    return {
      message: result.message,
      cooldown: result.cooldown,
    };
  }

  /**
   * Forgot Password - Send OTP
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const { phone } = dto;

    this.logger.log(`[FORGOT PASSWORD] Request OTP - Phone: "${phone}"`);

    // Check if user exists
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone },
          { whatsappNumber: phone },
        ],
      },
    });

    if (!user) {
      this.logger.warn(`[FORGOT PASSWORD] User not found for phone: "${phone}"`);
      // Don't reveal if user exists or not (security)
      return {
        message: 'Jika nomor WhatsApp terdaftar, kode OTP akan dikirim.',
      };
    }

    this.logger.log(`[FORGOT PASSWORD] User found - ID: ${user.id}, Email: ${user.email}`);

    // Send OTP
    const result = await this.otpService.generateAndSend(
      phone,
      OTPType.FORGOT_PASSWORD,
      user.id,
    );

    if (!result.success) {
      throw new BadRequestException(result.message);
    }

    this.logger.log(`[FORGOT PASSWORD] OTP sent successfully to ${phone}`);

    return {
      message: 'Kode OTP telah dikirim ke WhatsApp Anda.',
      cooldown: result.cooldown,
    };
  }

  /**
   * Reset Password with OTP
   */
  async resetPassword(dto: ResetPasswordDto) {
    const { phone, code, newPassword } = dto;

    this.logger.log(`[RESET PASSWORD] Attempting reset - Phone: "${phone}", Code: "${code}"`);

    // Verify OTP
    const result = await this.otpService.verify(
      phone,
      code,
      OTPType.FORGOT_PASSWORD,
    );

    this.logger.log(`[RESET PASSWORD] OTP verification result: ${result.success ? 'SUCCESS' : 'FAILED'} - ${result.message}`);

    if (!result.success) {
      throw new BadRequestException(result.message);
    }

    // Find user by phone
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone },
          { whatsappNumber: phone },
        ],
      },
    });

    if (!user) {
      throw new BadRequestException('User tidak ditemukan');
    }

    // Validate new password
    const passwordValidation = PasswordHelper.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new BadRequestException({
        message: 'Password tidak memenuhi persyaratan',
        errors: passwordValidation.errors,
      });
    }

    // Hash new password
    const hashedPassword = await PasswordHelper.hashPassword(newPassword);

    // Update password
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Invalidate all refresh tokens (force re-login)
    await this.prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    this.logger.log(`User ${user.id} reset password via OTP`);

    return {
      message: 'Password berhasil direset. Silakan login dengan password baru.',
    };
  }

  /**
   * Check OTP cooldown status
   */
  async checkCooldown(phone: string, type: OTPType) {
    const remaining = await this.otpService.getRemainingCooldown(phone, type);

    return {
      canSend: remaining === 0,
      cooldown: remaining,
      message:
        remaining > 0
          ? `Mohon tunggu ${remaining} detik sebelum mengirim OTP lagi`
          : 'OTP dapat dikirim',
    };
  }
}
