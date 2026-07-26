import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { EmailVerificationService } from '@common/services/email-verification.service';
import {
  SendVerificationEmailDto,
  VerifyEmailDto,
  ForgotPasswordEmailDto,
  ResetPasswordEmailDto,
  VerifyResetTokenDto,
} from './dto/email-verification.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PasswordHelper } from '@common/utils/password.helper';
import { PrismaService } from '@modules/database/prisma.service';
import { BadRequestException, Logger } from '@nestjs/common';

@Controller('auth/email')
export class EmailVerificationController {
  private readonly logger = new Logger(EmailVerificationController.name);

  constructor(
    private emailVerificationService: EmailVerificationService,
    private prisma: PrismaService,
  ) {}

  /**
   * Send verification email (for logged-in users)
   */
  @Post('send-verification')
  @UseGuards(JwtAuthGuard)
  async sendVerificationEmail(@Request() req: any) {
    return this.emailVerificationService.sendVerificationEmail(req.user.sub);
  }

  /**
   * Resend verification email (public endpoint)
   */
  @Post('resend-verification')
  async resendVerificationEmail(@Body() dto: SendVerificationEmailDto) {
    return this.emailVerificationService.resendVerificationEmail(dto.email);
  }

  /**
   * Verify email with token
   */
  @Post('verify')
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.emailVerificationService.verifyEmail(dto.token);
  }

  /**
   * Verify email with token (GET method for email links)
   */
  @Get('verify')
  async verifyEmailGet(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Token wajib diisi');
    }
    return this.emailVerificationService.verifyEmail(token);
  }

  /**
   * Check if user can resend verification email
   */
  @Get('can-resend')
  @UseGuards(JwtAuthGuard)
  async canResendVerificationEmail(@Request() req: any) {
    return this.emailVerificationService.canResendVerificationEmail(
      req.user.sub,
    );
  }

  /**
   * Send password reset email
   */
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordEmailDto) {
    return this.emailVerificationService.sendPasswordResetEmail(dto.email);
  }

  /**
   * Verify reset token
   */
  @Post('verify-reset-token')
  async verifyResetToken(@Body() dto: VerifyResetTokenDto) {
    return this.emailVerificationService.verifyResetToken(dto.token);
  }

  /**
   * Reset password with token
   */
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordEmailDto) {
    // Verify token first
    const tokenVerification =
      await this.emailVerificationService.verifyResetToken(dto.token);

    if (!tokenVerification.valid || !tokenVerification.userId) {
      throw new BadRequestException(tokenVerification.message);
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

    // Update password and clear reset token
    await this.prisma.user.update({
      where: { id: tokenVerification.userId },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Invalidate all refresh tokens (force re-login)
    await this.prisma.refreshToken.deleteMany({
      where: { userId: tokenVerification.userId },
    });

    this.logger.log(
      `User ${tokenVerification.userId} reset password via email`,
    );

    return {
      success: true,
      message: 'Password berhasil direset. Silakan login dengan password baru.',
    };
  }
}
