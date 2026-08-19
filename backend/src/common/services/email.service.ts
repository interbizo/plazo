import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const secure = this.configService.get<boolean>('SMTP_SECURE');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');

    if (!host || !port || !user || !pass) {
      this.logger.warn('SMTP configuration is incomplete — email service disabled');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    this.logger.log('Email service initialized with SMTP');
  }

  /**
   * Send email using SMTP
   */
  async sendEmail(params: SendEmailParams): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`Email not sent (SMTP not configured): ${params.subject} to ${params.to}`);
      return false;
    }

    const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL');
    const fromName = this.configService.get<string>('SMTP_FROM_NAME');

    try {
      const info = await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });

      this.logger.log(`Email sent successfully to ${params.to}: ${info.messageId}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send email to ${params.to}: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, token: string, firstName: string): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    const html = this.getVerificationEmailTemplate(firstName, verificationUrl);
    const text = `Hi ${firstName},\n\nTerima kasih telah mendaftar di Plazo Marketplace!\n\nSilakan verifikasi email Anda dengan mengklik link berikut:\n${verificationUrl}\n\nLink ini berlaku selama 24 jam.\n\nJika Anda tidak mendaftar di Plazo, abaikan email ini.\n\nSalam,\nTim Plazo Marketplace`;

    return this.sendEmail({
      to: email,
      subject: 'Verifikasi Email Anda - Plazo Marketplace',
      html,
      text,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string, firstName: string): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const html = this.getPasswordResetEmailTemplate(firstName, resetUrl);
    const text = `Hi ${firstName},\n\nKami menerima permintaan untuk reset password akun Anda.\n\nSilakan klik link berikut untuk reset password:\n${resetUrl}\n\nLink ini berlaku selama 1 jam.\n\nJika Anda tidak meminta reset password, abaikan email ini dan password Anda akan tetap aman.\n\nSalam,\nTim Plazo Marketplace`;

    return this.sendEmail({
      to: email,
      subject: 'Reset Password - Plazo Marketplace',
      html,
      text,
    });
  }

  /**
   * Modern verification email template (Clean White & Blue Design)
   */
  private getVerificationEmailTemplate(firstName: string, verificationUrl: string): string {
    return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifikasi Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); overflow: hidden;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background-color: #2563eb; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                Plazo Marketplace
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 50px 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px; font-weight: 600;">
                Halo, ${firstName}!
              </h2>
              
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                Terima kasih telah mendaftar di <strong>Plazo Marketplace</strong>. Untuk mengaktifkan akun Anda, silakan verifikasi alamat email Anda dengan mengklik tombol di bawah ini:
              </p>
              
              <!-- Verify Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${verificationUrl}" style="display: inline-block; padding: 16px 40px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);">
                      Verifikasi Email Saya
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0; background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 6px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px; font-weight: 600;">
                      ⏰ Link verifikasi berlaku selama 24 jam
                    </p>
                    <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.5;">
                      Jika tombol tidak berfungsi, salin dan tempel link berikut ke browser Anda:
                    </p>
                    <p style="margin: 10px 0 0 0; color: #2563eb; font-size: 13px; word-break: break-all;">
                      ${verificationUrl}
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Jika Anda tidak mendaftar di Plazo Marketplace, abaikan email ini dan akun tidak akan dibuat.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px; text-align: center;">
                <strong>Plazo Marketplace</strong>
              </p>
              <p style="margin: 0 0 15px 0; color: #94a3b8; font-size: 13px; text-align: center;">
                Platform jual beli terpercaya untuk semua kebutuhan Anda
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} Plazo Marketplace. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Modern password reset email template (Clean White & Blue Design)
   */
  private getPasswordResetEmailTemplate(firstName: string, resetUrl: string): string {
    return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); overflow: hidden;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="background-color: #2563eb; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                Plazo Marketplace
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 50px 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px; font-weight: 600;">
                Halo, ${firstName}!
              </h2>
              
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                Kami menerima permintaan untuk reset password akun Plazo Marketplace Anda. Klik tombol di bawah ini untuk membuat password baru:
              </p>
              
              <!-- Reset Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);">
                      Reset Password Saya
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0; background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 6px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px; font-weight: 600;">
                      ⏰ Link reset password berlaku selama 1 jam
                    </p>
                    <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.5;">
                      Jika tombol tidak berfungsi, salin dan tempel link berikut ke browser Anda:
                    </p>
                    <p style="margin: 10px 0 0 0; color: #2563eb; font-size: 13px; word-break: break-all;">
                      ${resetUrl}
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Warning Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px; font-weight: 600;">
                      ⚠️ Penting
                    </p>
                    <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.5;">
                      Jika Anda tidak meminta reset password, abaikan email ini. Password Anda akan tetap aman dan tidak ada perubahan yang akan dilakukan pada akun Anda.
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Untuk keamanan akun Anda, jangan bagikan link ini kepada siapapun.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px; text-align: center;">
                <strong>Plazo Marketplace</strong>
              </p>
              <p style="margin: 0 0 15px 0; color: #94a3b8; font-size: 13px; text-align: center;">
                Platform jual beli terpercaya untuk semua kebutuhan Anda
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} Plazo Marketplace. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('SMTP not configured');
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`SMTP connection verification failed: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Send welcome email after successful verification
   */
  async sendWelcomeEmail(email: string, firstName: string, role: string): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://plazo.id';
    const dashboardUrl = role === 'SELLER' ? `${frontendUrl}/seller/dashboard` : `${frontendUrl}/dashboard`;

    return this.sendEmail({
      to: email,
      subject: `Selamat Datang di Plazo, ${firstName}! 🎉`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Selamat Datang di Plazo!</h2>
          <p>Halo <strong>${firstName}</strong>,</p>
          <p>Akun Anda berhasil dibuat dan diverifikasi. ${
            role === 'SELLER'
              ? 'Mulai atur toko Anda dan tambahkan produk atau jasa.'
              : 'Jelajahi produk dan jasa dari seller terpercaya.'
          }</p>
          <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Mulai Sekarang
          </a>
          <p style="color: #666; font-size: 14px;">Butuh bantuan? Hubungi kami di support@plazo.id</p>
        </div>
      `,
    });
  }
}
