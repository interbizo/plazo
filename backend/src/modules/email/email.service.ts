import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import { escapeHtml, sanitizeUrl } from "@common/utils/html-sanitizer";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private readonly frontendUrl: string;
  private readonly isConfigured: boolean;
  private readonly apiKey: string | undefined;

  constructor(private configService: ConfigService) {
    // Get API key from ConfigService
    this.apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || "http://localhost:3000";
    
    // Check if API key is configured
    if (!this.apiKey || this.apiKey === "your-resend-api-key-here" || this.apiKey.trim() === "") {
      this.logger.warn(
        "⚠️  RESEND_API_KEY not configured. Email service will not work. " +
        "Please set RESEND_API_KEY in your .env file."
      );
      this.isConfigured = false;
      this.resend = null;
    } else {
      try {
        this.resend = new Resend(this.apiKey);
        this.isConfigured = true;
        this.logger.log("✅ Email service initialized successfully with Resend API");
      } catch (error) {
        this.logger.error("❌ Failed to initialize Resend:", error);
        this.isConfigured = false;
        this.resend = null;
      }
    }
  }

  /**
   * Check if email service is properly configured
   */
  isEmailServiceAvailable(): boolean {
    return this.isConfigured && this.resend !== null;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Check if service is configured
      if (!this.isEmailServiceAvailable()) {
        this.logger.warn(
          `📧 Email not sent (service not configured): ${options.subject} to ${options.to}`
        );
        return false;
      }

      // Send email using Resend
      const { data, error } = await this.resend!.emails.send({
        from:
          this.configService.get<string>('RESEND_FROM_EMAIL') ||
          "Plazo Marketplace <onboarding@resend.dev>",
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        this.logger.error(`❌ Failed to send email to ${options.to}:`, error);
        return false;
      }

      this.logger.log(
        `✅ Email sent to ${options.to}: ${options.subject} (ID: ${data?.id})`
      );
      return true;
    } catch (error) {
      this.logger.error(`❌ Exception while sending email to ${options.to}:`, error);
      return false;
    }
  }

  /**
   * Shared email wrapper with consistent branding
   */
  private wrapTemplate(content: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        ${content}
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
        <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
          &copy; ${new Date().getFullYear()} Plazo Marketplace. All rights reserved.
        </p>
      </div>
    `;
  }

  async sendVerificationEmail(email: string, token: string) {
    // Token is hex-safe, but sanitize the URL anyway
    const verifyUrl = sanitizeUrl(`${this.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`);
    return this.sendEmail({
      to: email,
      subject: "Verify Your Email - Plazo Marketplace",
      html: this.wrapTemplate(`
        <h2 style="color: #333;">Welcome to Plazo Marketplace!</h2>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Verify Email
        </a>
        <p style="color: #666; font-size: 12px;">
          Or copy this link: ${verifyUrl}
        </p>
        <p style="color: #666; font-size: 12px;">This link expires in 24 hours.</p>
      `),
    });
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = sanitizeUrl(`${this.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`);
    return this.sendEmail({
      to: email,
      subject: "Reset Your Password - Plazo Marketplace",
      html: this.wrapTemplate(`
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested a password reset. Click the button below to set a new password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 12px;">
          Or copy this link: ${resetUrl}
        </p>
        <p style="color: #666; font-size: 12px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      `),
    });
  }

  async sendPaymentReminderEmail(
    email: string,
    orderTitle: string,
    paymentCode: string,
    deadline: Date,
  ) {
    const hoursLeft = Math.floor(
      (deadline.getTime() - Date.now()) / (1000 * 60 * 60),
    );
    const safeTitle = escapeHtml(orderTitle);
    const safeCode = escapeHtml(paymentCode);
    const dashboardUrl = sanitizeUrl(`${this.frontendUrl}/dashboard/orders`);

    return this.sendEmail({
      to: email,
      subject: `Payment Reminder: ${safeTitle} - ${hoursLeft}h left`,
      html: this.wrapTemplate(`
        <h2 style="color: #DC2626;">Payment Reminder</h2>
        <p>Your order <strong>&ldquo;${safeTitle}&rdquo;</strong> is waiting for payment.</p>
        <div style="background: #FEF2F2; border-left: 4px solid #DC2626; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; color: #991B1B;"><strong>Time remaining: ${escapeHtml(hoursLeft)} hours</strong></p>
          <p style="margin: 8px 0 0 0; color: #7F1D1D;">Payment Code: <strong>${safeCode}</strong></p>
        </div>
        <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 24px; background: #DC2626; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Complete Payment Now
        </a>
        <p style="color: #666; font-size: 14px;">If payment is not completed within ${escapeHtml(hoursLeft)} hours, your order will be automatically cancelled.</p>
      `),
    });
  }

  async sendPaymentReceivedEmail(
    email: string,
    orderTitle: string,
    paymentCode: string,
  ) {
    const safeTitle = escapeHtml(orderTitle);
    const safeCode = escapeHtml(paymentCode);
    const dashboardUrl = sanitizeUrl(`${this.frontendUrl}/dashboard/orders`);

    return this.sendEmail({
      to: email,
      subject: `Payment Received: ${safeTitle}`,
      html: this.wrapTemplate(`
        <h2 style="color: #059669;">Payment Received!</h2>
        <p>We have received your payment proof for order <strong>&ldquo;${safeTitle}&rdquo;</strong>.</p>
        <div style="background: #ECFDF5; border-left: 4px solid #059669; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; color: #065F46;">Payment Code: <strong>${safeCode}</strong></p>
          <p style="margin: 8px 0 0 0; color: #047857;">Status: Under Verification</p>
        </div>
        <p>Our team will verify your payment within 1-2 hours. You will receive a notification once verified.</p>
        <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 24px; background: #059669; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          View Order Status
        </a>
      `),
    });
  }

  async sendPaymentVerifiedEmail(email: string, orderTitle: string) {
    const safeTitle = escapeHtml(orderTitle);
    const dashboardUrl = sanitizeUrl(`${this.frontendUrl}/dashboard/orders`);

    return this.sendEmail({
      to: email,
      subject: `Payment Verified: ${safeTitle}`,
      html: this.wrapTemplate(`
        <h2 style="color: #059669;">Payment Verified!</h2>
        <p>Great news! Your payment for <strong>&ldquo;${safeTitle}&rdquo;</strong> has been verified.</p>
        <div style="background: #ECFDF5; border-left: 4px solid #059669; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; color: #065F46;"><strong>Payment Confirmed</strong></p>
          <p style="margin: 8px 0 0 0; color: #047857;">The seller will now process your order.</p>
        </div>
        <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 24px; background: #059669; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Track Your Order
        </a>
      `),
    });
  }

  async sendPaymentRejectedEmail(
    email: string,
    orderTitle: string,
    reason: string,
  ) {
    const safeTitle = escapeHtml(orderTitle);
    const safeReason = escapeHtml(reason);
    const dashboardUrl = sanitizeUrl(`${this.frontendUrl}/dashboard/orders`);

    return this.sendEmail({
      to: email,
      subject: `Payment Rejected: ${safeTitle}`,
      html: this.wrapTemplate(`
        <h2 style="color: #DC2626;">Payment Rejected</h2>
        <p>Unfortunately, your payment proof for <strong>&ldquo;${safeTitle}&rdquo;</strong> could not be verified.</p>
        <div style="background: #FEF2F2; border-left: 4px solid #DC2626; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; color: #991B1B;"><strong>Reason:</strong></p>
          <p style="margin: 8px 0 0 0; color: #7F1D1D;">${safeReason}</p>
        </div>
        <p>Please upload a new payment proof with the correct information.</p>
        <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 24px; background: #DC2626; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Upload New Proof
        </a>
      `),
    });
  }

  async sendPaymentProofUploadedEmail(
    email: string,
    paymentCode: string,
    amount: number,
  ) {
    const safeCode = escapeHtml(paymentCode);
    const safeAmount = escapeHtml(amount.toLocaleString("id-ID"));
    const adminUrl = sanitizeUrl(`${this.frontendUrl}/admin/payments`);

    return this.sendEmail({
      to: email,
      subject: `New Payment Proof - ${safeCode}`,
      html: this.wrapTemplate(`
        <h2 style="color: #2563EB;">New Payment Proof Uploaded</h2>
        <p>A buyer has uploaded payment proof that needs verification.</p>
        <div style="background: #EFF6FF; border-left: 4px solid #2563EB; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; color: #1E40AF;"><strong>Payment Code:</strong> ${safeCode}</p>
          <p style="margin: 8px 0 0 0; color: #1E3A8A;"><strong>Amount:</strong> Rp ${safeAmount}</p>
        </div>
        <p>Please verify this payment as soon as possible.</p>
        <a href="${adminUrl}" style="display: inline-block; padding: 12px 24px; background: #2563EB; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Verify Payment
        </a>
      `),
    });
  }

  async sendOrderNotificationEmail(
    email: string,
    orderTitle: string,
    status: string,
  ) {
    const safeTitle = escapeHtml(orderTitle);
    const safeStatus = escapeHtml(status);
    const dashboardUrl = sanitizeUrl(`${this.frontendUrl}/dashboard/orders`);

    return this.sendEmail({
      to: email,
      subject: `Order Update: ${safeTitle} - Plazo Marketplace`,
      html: this.wrapTemplate(`
        <h2 style="color: #333;">Order Update</h2>
        <p>Your order <strong>&ldquo;${safeTitle}&rdquo;</strong> status has been updated to: <strong>${safeStatus}</strong></p>
        <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          View Order
        </a>
      `),
    });
  }

  async sendProposalNotificationEmail(
    email: string,
    jobTitle: string,
    status: string,
  ) {
    const safeTitle = escapeHtml(jobTitle);
    const safeStatus = escapeHtml(status);
    const dashboardUrl = sanitizeUrl(`${this.frontendUrl}/dashboard/proposals`);

    return this.sendEmail({
      to: email,
      subject: `Proposal ${safeStatus}: ${safeTitle} - Plazo Marketplace`,
      html: this.wrapTemplate(`
        <h2 style="color: #333;">Proposal Update</h2>
        <p>Your proposal for <strong>&ldquo;${safeTitle}&rdquo;</strong> has been <strong>${safeStatus.toLowerCase()}</strong>.</p>
        <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          View Details
        </a>
      `),
    });
  }

  // ============ WELCOME EMAIL ============

  async sendWelcomeEmail(email: string, firstName: string, role: string) {
    const safeName = escapeHtml(firstName);
    const dashboardUrl = sanitizeUrl(
      role === "SELLER"
        ? `${this.frontendUrl}/seller/dashboard`
        : `${this.frontendUrl}/dashboard`,
    );

    return this.sendEmail({
      to: email,
      subject: `Selamat Datang di Plazo, ${safeName}! 🎉`,
      html: this.wrapTemplate(`
        <h2 style="color: #333;">Selamat Datang di Plazo!</h2>
        <p>Halo <strong>${safeName}</strong>,</p>
        <p>Akun Anda berhasil dibuat. ${
          role === "SELLER"
            ? "Mulai atur toko Anda dan tambahkan produk atau jasa untuk menjangkau lebih banyak pelanggan."
            : "Jelajahi ribuan produk dan jasa dari seller terpercaya di Plazo."
        }</p>
        <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Mulai Sekarang
        </a>
        <p style="color: #666; font-size: 14px;">Butuh bantuan? Hubungi kami di support@plazo.id</p>
      `),
    });
  }

  // ============ SUBSCRIPTION EMAIL ============

  async sendSubscriptionUpgradeEmail(email: string, firstName: string, plan: string) {
    const safeName = escapeHtml(firstName);
    const safePlan = escapeHtml(plan);

    return this.sendEmail({
      to: email,
      subject: `Upgrade Berhasil ke ${safePlan} - Plazo`,
      html: this.wrapTemplate(`
        <h2 style="color: #333;">Upgrade Berhasil! 🚀</h2>
        <p>Halo <strong>${safeName}</strong>,</p>
        <p>Paket langganan Anda berhasil di-upgrade ke <strong>${safePlan}</strong>.</p>
        <p>Fitur premium Anda sekarang aktif. Nikmati semua keuntungan paket baru Anda!</p>
        <a href="${sanitizeUrl(`${this.frontendUrl}/seller/dashboard/subscription`)}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Lihat Paket Saya
        </a>
      `),
    });
  }

  async sendSubscriptionExpiredEmail(email: string, firstName: string, plan: string) {
    const safeName = escapeHtml(firstName);
    const safePlan = escapeHtml(plan);

    return this.sendEmail({
      to: email,
      subject: `Langganan ${safePlan} Anda Telah Berakhir - Plazo`,
      html: this.wrapTemplate(`
        <h2 style="color: #333;">Langganan Berakhir</h2>
        <p>Halo <strong>${safeName}</strong>,</p>
        <p>Paket <strong>${safePlan}</strong> Anda telah berakhir. Akun Anda sekarang kembali ke paket Gratis.</p>
        <p>Perpanjang langganan untuk tetap menikmati fitur premium seperti boost listing, verified badge, dan tampil di marketplace.</p>
        <a href="${sanitizeUrl(`${this.frontendUrl}/seller/dashboard/subscription`)}" style="display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Perpanjang Sekarang
        </a>
      `),
    });
  }

  // ============ KYC EMAIL ============

  async sendKycApprovedEmail(email: string, firstName: string) {
    const safeName = escapeHtml(firstName);

    return this.sendEmail({
      to: email,
      subject: `KYC Disetujui - Akun Anda Terverifikasi! ✅`,
      html: this.wrapTemplate(`
        <h2 style="color: #333;">KYC Disetujui! ✅</h2>
        <p>Halo <strong>${safeName}</strong>,</p>
        <p>Selamat! Verifikasi identitas (KYC) Anda telah <strong>disetujui</strong>.</p>
        <p>Toko Anda sekarang mendapat badge terverifikasi yang meningkatkan kepercayaan buyer.</p>
        <a href="${sanitizeUrl(`${this.frontendUrl}/seller/dashboard`)}" style="display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Lihat Dashboard
        </a>
      `),
    });
  }

  async sendKycRejectedEmail(email: string, firstName: string, reason: string) {
    const safeName = escapeHtml(firstName);
    const safeReason = escapeHtml(reason);

    return this.sendEmail({
      to: email,
      subject: `KYC Ditolak - Silakan Perbaiki Dokumen`,
      html: this.wrapTemplate(`
        <h2 style="color: #333;">KYC Ditolak</h2>
        <p>Halo <strong>${safeName}</strong>,</p>
        <p>Maaf, verifikasi identitas (KYC) Anda <strong>ditolak</strong>.</p>
        <p><strong>Alasan:</strong> ${safeReason}</p>
        <p>Silakan perbaiki dokumen dan ajukan ulang.</p>
        <a href="${sanitizeUrl(`${this.frontendUrl}/seller/dashboard/verification`)}" style="display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Ajukan Ulang
        </a>
      `),
    });
  }
}
