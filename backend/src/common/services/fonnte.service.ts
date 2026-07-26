import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface SendWhatsAppOTPParams {
  phone: string;
  code: string;
  type: 'registration' | 'forgot_password' | 'login_2fa';
}

@Injectable()
export class FontteService {
  private readonly logger = new Logger(FontteService.name);
  private readonly apiUrl = 'https://api.fonnte.com/send';
  private readonly token = process.env.FONNTE_API_TOKEN;

  /**
   * Send OTP via WhatsApp using Fonnte API
   */
  async sendOTP(params: SendWhatsAppOTPParams): Promise<boolean> {
    if (!this.token) {
      this.logger.error('FONNTE_API_TOKEN is not configured');
      throw new Error('WhatsApp service is not configured');
    }

    try {
      // Format phone number (remove +, spaces, dashes)
      const formattedPhone = this.formatPhoneNumber(params.phone);

      // Build message based on type
      const message = this.buildOTPMessage(params.code, params.type);

      this.logger.log(`Sending OTP to ${formattedPhone} via Fonnte`);

      const response = await axios.post(
        this.apiUrl,
        {
          target: formattedPhone,
          message: message,
          countryCode: '62', // Indonesia
        },
        {
          headers: {
            Authorization: this.token,
          },
        },
      );

      if (response.data.status === true || response.data.status === 'success') {
        this.logger.log(`OTP sent successfully to ${formattedPhone}`);
        return true;
      } else {
        this.logger.error(`Failed to send OTP: ${JSON.stringify(response.data)}`);
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error sending OTP via Fonnte: ${errorMessage}`);
      throw new Error('Failed to send OTP via WhatsApp');
    }
  }

  /**
   * Format phone number for Fonnte API
   * Removes +, spaces, dashes and ensures it starts with country code
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let formatted = phone.replace(/\D/g, '');

    // If starts with 0, replace with 62 (Indonesia)
    if (formatted.startsWith('0')) {
      formatted = '62' + formatted.substring(1);
    }

    // If doesn't start with country code, add 62
    if (!formatted.startsWith('62')) {
      formatted = '62' + formatted;
    }

    return formatted;
  }

  /**
   * Build OTP message based on type
   */
  private buildOTPMessage(code: string, type: string): string {
    const messages: Record<string, string> = {
      registration: `*Verifikasi Akun Plazo*\n\nKode OTP Anda: *${code}*\n\nGunakan kode ini untuk mengaktifkan akun Anda.\nKode berlaku selama 1 menit.\n\nJangan bagikan kode ini kepada siapapun.`,
      
      forgot_password: `*Reset Password Plazo*\n\nKode OTP Anda: *${code}*\n\nGunakan kode ini untuk reset password Anda.\nKode berlaku selama 1 menit.\n\nJika Anda tidak meminta reset password, abaikan pesan ini.`,
      
      login_2fa: `*Login Verification Plazo*\n\nKode OTP Anda: *${code}*\n\nGunakan kode ini untuk login ke akun Anda.\nKode berlaku selama 1 menit.\n\nJika Anda tidak mencoba login, segera amankan akun Anda.`,
    };

    return messages[type] || messages.registration;
  }

  /**
   * Send custom WhatsApp message
   */
  async sendMessage(phone: string, message: string): Promise<boolean> {
    if (!this.token) {
      this.logger.error('FONNTE_API_TOKEN is not configured');
      return false;
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phone);

      const response = await axios.post(
        this.apiUrl,
        {
          target: formattedPhone,
          message: message,
          countryCode: '62',
        },
        {
          headers: {
            Authorization: this.token,
          },
        },
      );

      return response.data.status === true || response.data.status === 'success';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error sending WhatsApp message: ${errorMessage}`);
      return false;
    }
  }
}
