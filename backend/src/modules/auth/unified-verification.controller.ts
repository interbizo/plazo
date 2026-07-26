import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { UnifiedVerificationService, VerificationMethod } from '@common/services/unified-verification.service';
import { EmailVerificationService } from '@common/services/email-verification.service';
import { OTPService } from '@common/services/otp.service';
import {
  SendVerificationDto,
  VerifyWithMethodDto,
  ForgotPasswordWithMethodDto,
  ResetPasswordWithMethodDto,
  GetAvailableMethodsDto,
} from './dto/unified-verification.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PrismaService } from '@modules/database/prisma.service';
import { PasswordHelper } from '@common/utils/password.helper';
import { BadRequestException, Logger } from '@nestjs/common';
import { OTPType } from '@prisma/client';

@Controller('auth/verify')
export class UnifiedVerificationController {
  private readonly logger = new Logger(UnifiedVerificationController.name);

  constructor(
    private unifiedVerificationService: UnifiedVerificationService,
    private emailVerificationService: EmailVerificationService,
    private otpService: OTPService,
    private prisma: PrismaService,
  ) {}

  /**
   * Get available verification methods for user
   */
  @Post('available-methods')
  async getAvailableMethods(@Body() dto: GetAvailableMethodsDto) {
    const methods = await this.unifiedVerificationService.getAvailableMethods(
      dto.identifier,
    );

    return {
      success: true,
      methods,
      message: 'Metode verifikasi yang tersedia',
    };
  }

  /**
   * Send verification via selected method (authenticated)
   */
  @Post('send')
  @UseGuards(JwtAuthGuard)
  async sendVerification(@Request() req: any, @Body() dto: SendVerificationDto) {
    const result = await this.unifiedVerificationService.sendVerification({
      userId: req.user.sub,
      method: dto.method,
      type: 'registration',
    });

    return result;
  }

  /**
   * Resend verification via selected method (public)
   */
  @Post('resend')
  async resendVerification(@Body() dto: SendVerificationDto) {
    if (!dto.identifier) {
      throw new BadRequestException('Email atau nomor WhatsApp wajib diisi');
    }

    // Determine if identifier is email or phone
    const isEmail = dto.identifier.includes('@');
    
    const result = await this.unifiedVerificationService.sendVerification({
      email: isEmail ? dto.identifier : undefined,
      phone: !isEmail ? dto.identifier : undefined,
      method: dto.method,
      type: 'registration',
    });

    return result;
  }

  /**
   * Verify account with selected method
   */
  @Post('confirm')
  async verifyWithMethod(@Body() dto: VerifyWithMethodDto) {
    if (dto.method === VerificationMethod.EMAIL) {
      // Verify via email token
      const result = await this.emailVerificationService.verifyEmail(dto.code);
      
      // Get user from token to activate account
      const user = await this.prisma.user.findFirst({
        where: { isEmailVerified: true },
        orderBy: { emailVerifiedAt: 'desc' },
        take: 1,
      });

      if (user) {
        await this.unifiedVerificationService.activateAccount(user.id);
      }

      return result;
    } else {
      // Verify via WhatsApp OTP
      if (!dto.identifier) {
        throw new BadRequestException('Nomor WhatsApp wajib diisi untuk verifikasi OTP');
      }

      const result = await this.otpService.verify(
        dto.identifier,
        dto.code,
        OTPType.REGISTRATION,
      );

      if (!result.success) {
        throw new BadRequestException(result.message);
      }

      // Find user and activate account
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { phone: dto.identifier },
            { whatsappNumber: dto.identifier },
          ],
        },
      });

      if (!user) {
        throw new BadRequestException('User tidak ditemukan');
      }

      // Update phone verification
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          isPhoneVerified: true,
          phoneVerifiedAt: new Date(),
        },
      });

      // Activate account
      await this.unifiedVerificationService.activateAccount(user.id);

      this.logger.log(`User ${user.id} verified via phone and activated`);

      return {
        success: true,
        message: 'Verifikasi berhasil. Akun Anda telah aktif.',
      };
    }
  }

  /**
   * Check verification status
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async checkStatus(@Request() req: any) {
    const status = await this.unifiedVerificationService.getVerificationStatus(
      req.user.sub,
    );

    return {
      success: true,
      ...status,
    };
  }

  /**
   * Check if user can login
   */
  @Get('can-login')
  @UseGuards(JwtAuthGuard)
  async canLogin(@Request() req: any) {
    const result = await this.unifiedVerificationService.canLogin(req.user.sub);
    return result;
  }

  /**
   * Forgot password - send reset code via selected method
   */
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordWithMethodDto) {
    const result = await this.unifiedVerificationService.sendVerification({
      email: dto.method === VerificationMethod.EMAIL ? dto.identifier : undefined,
      phone: dto.method === VerificationMethod.PHONE ? dto.identifier : undefined,
      method: dto.method,
      type: 'forgot_password',
    });

    return {
      success: true,
      message:
        dto.method === VerificationMethod.EMAIL
          ? 'Link reset password telah dikirim ke email Anda.'
          : 'Kode OTP telah dikirim ke WhatsApp Anda.',
      method: dto.method,
    };
  }

  /**
   * Reset password with selected method
   */
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordWithMethodDto) {
    let user;

    if (dto.method === VerificationMethod.EMAIL) {
      // Verify email token
      const tokenVerification =
        await this.emailVerificationService.verifyResetToken(dto.code);

      if (!tokenVerification.valid || !tokenVerification.userId) {
        throw new BadRequestException(tokenVerification.message);
      }

      user = await this.prisma.user.findUnique({
        where: { id: tokenVerification.userId },
      });
    } else {
      // Verify OTP
      if (!dto.identifier) {
        throw new BadRequestException('Nomor WhatsApp wajib diisi untuk verifikasi OTP');
      }

      const otpResult = await this.otpService.verify(
        dto.identifier,
        dto.code,
        OTPType.FORGOT_PASSWORD,
      );

      if (!otpResult.success) {
        throw new BadRequestException(otpResult.message);
      }

      user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { phone: dto.identifier },
            { whatsappNumber: dto.identifier },
          ],
        },
      });
    }

    if (!user) {
      throw new BadRequestException('User tidak ditemukan');
    }

    // Validate password strength
    const passwordValidation = PasswordHelper.validatePasswordStrength(
      dto.newPassword,
    );
    if (!passwordValidation.isValid) {
      throw new BadRequestException({
        message: 'Password tidak memenuhi persyaratan',
        errors: passwordValidation.errors,
      });
    }

    // Hash new password
    const hashedPassword = await PasswordHelper.hashPassword(dto.newPassword);

    // Update password and clear reset tokens
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

    this.logger.log(
      `User ${user.id} reset password via ${dto.method}`,
    );

    return {
      success: true,
      message: 'Password berhasil direset. Silakan login dengan password baru.',
    };
  }
}
