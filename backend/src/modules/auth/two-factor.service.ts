import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";
import * as crypto from "crypto";

/**
 * TOTP (Time-based One-Time Password) implementation for 2FA.
 * Uses HMAC-SHA1 as per RFC 6238 — compatible with Google Authenticator,
 * Authy, and other standard TOTP apps.
 *
 * NOTE: For production, consider using the `otplib` package for a more
 * battle-tested implementation. This is a self-contained implementation
 * to avoid adding dependencies.
 */

const TOTP_PERIOD = 30; // seconds
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1; // Allow 1 period before/after for clock drift
const BACKUP_CODE_COUNT = 8;
const APP_NAME = "Plazo Marketplace";

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate a random base32-encoded secret for TOTP
   */
  private generateSecret(): string {
    const buffer = crypto.randomBytes(20);
    return this.base32Encode(buffer);
  }

  /**
   * Base32 encode a buffer (RFC 4648)
   */
  private base32Encode(buffer: Buffer): string {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = 0;
    let value = 0;
    let output = "";

    for (const byte of buffer) {
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        output += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += alphabet[(value << (5 - bits)) & 31];
    }

    return output;
  }

  /**
   * Base32 decode a string to buffer
   */
  private base32Decode(encoded: string): Buffer {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const cleanInput = encoded.replace(/=+$/, "").toUpperCase();
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (const char of cleanInput) {
      const idx = alphabet.indexOf(char);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }

    return Buffer.from(output);
  }

  /**
   * Generate TOTP code for a given time
   */
  private generateTOTP(secret: string, time?: number): string {
    const now = time ?? Math.floor(Date.now() / 1000);
    const counter = Math.floor(now / TOTP_PERIOD);

    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeUInt32BE(0, 0);
    counterBuffer.writeUInt32BE(counter, 4);

    const key = this.base32Decode(secret);
    const hmac = crypto.createHmac("sha1", key).update(counterBuffer).digest();

    const offset = hmac[hmac.length - 1] & 0x0f;
    const code =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    return String(code % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
  }

  /**
   * Verify a TOTP code (with window for clock drift)
   */
  private verifyTOTP(secret: string, code: string): boolean {
    const now = Math.floor(Date.now() / 1000);

    for (let i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
      const time = now + i * TOTP_PERIOD;
      if (this.generateTOTP(secret, time) === code) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate backup codes (one-time use recovery codes)
   */
  private generateBackupCodes(): { plain: string[]; hashed: string[] } {
    const plain: string[] = [];
    const hashed: string[] = [];

    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      const code = crypto.randomBytes(4).toString("hex").toUpperCase();
      const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
      plain.push(formatted);
      hashed.push(
        crypto.createHash("sha256").update(formatted).digest("hex"),
      );
    }

    return { plain, hashed };
  }

  /**
   * Generate otpauth:// URI for QR code generation
   */
  private generateOtpAuthUri(
    email: string,
    secret: string,
  ): string {
    const encodedEmail = encodeURIComponent(email);
    const encodedIssuer = encodeURIComponent(APP_NAME);
    return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Setup 2FA — generate secret and return QR code URI
   */
  async setup2FA(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorEnabled: true },
    });

    if (!user) throw new BadRequestException("User not found");
    if (user.twoFactorEnabled) {
      throw new BadRequestException("2FA is already enabled. Disable it first to reconfigure.");
    }

    const secret = this.generateSecret();

    // Store secret (not yet enabled — user must verify first)
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret,
        twoFactorVerified: false,
      },
    });

    const otpauthUri = this.generateOtpAuthUri(user.email, secret);

    return {
      secret,
      otpauthUri,
      message: "Scan the QR code with your authenticator app, then verify with a code.",
    };
  }

  /**
   * Verify and enable 2FA — user must provide a valid TOTP code
   */
  async verify2FA(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user) throw new BadRequestException("User not found");
    if (!user.twoFactorSecret) {
      throw new BadRequestException("2FA setup not initiated. Call setup first.");
    }
    if (user.twoFactorEnabled) {
      throw new BadRequestException("2FA is already enabled.");
    }

    if (!this.verifyTOTP(user.twoFactorSecret, code)) {
      throw new BadRequestException("Invalid verification code. Please try again.");
    }

    // Generate backup codes
    const { plain: backupCodesPlain, hashed: backupCodesHashed } =
      this.generateBackupCodes();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorVerified: true,
        backupCodes: backupCodesHashed,
      },
    });

    this.logger.log(`2FA enabled for user ${userId}`);

    return {
      message: "2FA enabled successfully. Save your backup codes securely.",
      backupCodes: backupCodesPlain,
    };
  }

  /**
   * Validate a TOTP code during login
   */
  async validateLoginCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true, backupCodes: true },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }

    // Try TOTP code first
    if (this.verifyTOTP(user.twoFactorSecret, code)) {
      return true;
    }

    // Try backup code
    const codeHash = crypto
      .createHash("sha256")
      .update(code.toUpperCase())
      .digest("hex");

    const backupIndex = user.backupCodes.indexOf(codeHash);
    if (backupIndex !== -1) {
      // Remove used backup code
      const updatedCodes = [...user.backupCodes];
      updatedCodes.splice(backupIndex, 1);

      await this.prisma.user.update({
        where: { id: userId },
        data: { backupCodes: updatedCodes },
      });

      this.logger.warn(
        `Backup code used for user ${userId}. ${updatedCodes.length} codes remaining.`,
      );
      return true;
    }

    return false;
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId: string, code: string) {
    const isValid = await this.validateLoginCode(userId, code);
    if (!isValid) {
      throw new UnauthorizedException("Invalid 2FA code");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorVerified: false,
        twoFactorSecret: null,
        backupCodes: [],
      },
    });

    this.logger.log(`2FA disabled for user ${userId}`);
    return { message: "2FA disabled successfully" };
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string, code: string) {
    const isValid = await this.validateLoginCode(userId, code);
    if (!isValid) {
      throw new UnauthorizedException("Invalid 2FA code");
    }

    const { plain, hashed } = this.generateBackupCodes();

    await this.prisma.user.update({
      where: { id: userId },
      data: { backupCodes: hashed },
    });

    return {
      message: "Backup codes regenerated. Save them securely.",
      backupCodes: plain,
    };
  }

  /**
   * Check if user has 2FA enabled
   */
  async has2FA(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });
    return user?.twoFactorEnabled ?? false;
  }
}
