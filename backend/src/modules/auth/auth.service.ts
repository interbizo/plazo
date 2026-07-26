import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "@modules/database/prisma.service";
import { PasswordHelper } from "@common/utils/password.helper";
import { UserRole, OTPType } from "@prisma/client";
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  CreateTenantDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ChangePasswordDto,
} from "./dto/auth.dto";
import * as crypto from "crypto";
import { EmailService } from "@modules/email/email.service";
import { OTPService } from "@common/services/otp.service";
import { EmailVerificationService } from "@common/services/email-verification.service";

// Max failed login attempts before temporary lockout
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const MAX_TRACKED_IPS = 5000; // Prevent unbounded growth

// In-memory login attempt tracker with auto-cleanup
const loginAttempts = new Map<
  string,
  { count: number; lastAttempt: number; lockedUntil?: number }
>();

// Cleanup expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of loginAttempts) {
    // Remove entries older than lockout duration (stale)
    if (now - value.lastAttempt > LOCKOUT_DURATION_MS * 2) {
      loginAttempts.delete(key);
    }
  }
  // Hard cap: if still too large, remove oldest entries
  if (loginAttempts.size > MAX_TRACKED_IPS) {
    const entries = [...loginAttempts.entries()]
      .sort((a, b) => a[1].lastAttempt - b[1].lastAttempt);
    entries.slice(0, loginAttempts.size - MAX_TRACKED_IPS)
      .forEach(([key]) => loginAttempts.delete(key));
  }
}, 10 * 60 * 1000);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private otpService: OTPService,
    private emailVerificationService: EmailVerificationService,
  ) {
    // Cleanup expired refresh tokens every hour
    setInterval(() => this.cleanupExpiredTokens(), 60 * 60 * 1000);
  }

  /**
   * Hash a refresh token for secure storage (never store raw tokens)
   */
  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Generate a unique token family ID for rotation tracking
   */
  private generateFamily(): string {
    return crypto.randomUUID();
  }

  /**
   * Check and enforce login attempt rate limiting
   */
  private checkLoginAttempts(email: string): void {
    const key = email.toLowerCase();
    const record = loginAttempts.get(key);

    if (!record) return;

    // Check if currently locked out
    if (record.lockedUntil && Date.now() < record.lockedUntil) {
      const minutesLeft = Math.ceil(
        (record.lockedUntil - Date.now()) / 60000,
      );
      throw new UnauthorizedException(
        `Account temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minutes.`,
      );
    }

    // Reset if lockout has expired
    if (record.lockedUntil && Date.now() >= record.lockedUntil) {
      loginAttempts.delete(key);
    }
  }

  /**
   * Record a failed login attempt
   */
  private recordFailedAttempt(email: string): void {
    const key = email.toLowerCase();
    const record = loginAttempts.get(key) || { count: 0, lastAttempt: 0 };

    record.count += 1;
    record.lastAttempt = Date.now();

    if (record.count >= MAX_LOGIN_ATTEMPTS) {
      record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      this.logger.warn(
        `Account locked for ${email} after ${record.count} failed attempts`,
      );
    }

    loginAttempts.set(key, record);
  }

  /**
   * Clear failed login attempts on successful login
   */
  private clearFailedAttempts(email: string): void {
    loginAttempts.delete(email.toLowerCase());
  }

  /**
   * Cleanup expired refresh tokens from database
   */
  private async cleanupExpiredTokens() {
    try {
      const result = await this.prisma.refreshToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: new Date() } }, { isRevoked: true }],
        },
      });
      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} expired/revoked refresh tokens`);
      }
    } catch (error) {
      this.logger.error("Failed to cleanup expired tokens", error);
    }
  }

  /**
   * User Registration
   */
  async register(registerDto: RegisterDto) {
    const { 
      email, firstName, lastName, password, phone, role, 
      address, city, province, postalCode, whatsappNumber,
      storeName, storeSubdomain, storeCity, referralCode 
    } = registerDto;

    // Check email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    // Validate password strength
    const passwordValidation =
      PasswordHelper.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new BadRequestException({
        message: "Password does not meet requirements",
        errors: passwordValidation.errors,
      });
    }

    // Hash password
    const hashedPassword = await PasswordHelper.hashPassword(password);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Determine user role (only BUYER or SELLER allowed)
    const userRole = role === "SELLER" ? UserRole.SELLER : UserRole.BUYER;

    // Determine phone number to use (prefer whatsappNumber, fallback to phone)
    const phoneNumber = whatsappNumber || phone;
    
    if (!phoneNumber) {
      throw new BadRequestException("Nomor WhatsApp wajib diisi untuk verifikasi akun");
    }

    // Check if phone number already registered
    const existingPhone = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: phoneNumber },
          { whatsappNumber: phoneNumber },
        ],
      },
    });

    if (existingPhone) {
      throw new ConflictException("Nomor WhatsApp sudah terdaftar");
    }

    // Create user with address and WhatsApp (NOT ACTIVE YET - needs verification)
    const user = await this.prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        password: hashedPassword,
        phone: phoneNumber,
        whatsappNumber: phoneNumber,
        role: userRole,
        isEmailVerified: false, // Requires email verification
        isPhoneVerified: false, // Requires OTP verification
        isActive: false, // Will be activated after verification
        verificationToken,
        verificationTokenExpiry: new Date(Date.now() + 24 * 3600000), // 24 hours
        // Address fields (only include if provided)
        ...(address && { address }),
        ...(city && { city }),
        ...(province && { province }),
        ...(postalCode && { postalCode }),
      },
    });

    // If registering as SELLER, auto-create Tenant + SellerProfile
    if (userRole === UserRole.SELLER) {
      // Validate store data for seller
      if (!storeName || !storeSubdomain || !storeCity) {
        // Rollback user creation
        await this.prisma.user.delete({ where: { id: user.id } });
        throw new BadRequestException(
          "Nama toko, subdomain, dan kota wajib diisi untuk registrasi seller"
        );
      }

      // Validate subdomain format
      const RESERVED = [
        "www", "api", "admin", "app", "mail", "smtp", "ftp", "dashboard",
        "panel", "support", "help", "billing", "auth", "login", "register",
        "static", "assets", "cdn", "media", "upload", "uploads", "public",
      ];
      const cleanSub = storeSubdomain.toLowerCase().trim();
      
      if (cleanSub.length < 3 || cleanSub.length > 30) {
        await this.prisma.user.delete({ where: { id: user.id } });
        throw new BadRequestException("Subdomain harus 3-30 karakter");
      }
      
      if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(cleanSub)) {
        await this.prisma.user.delete({ where: { id: user.id } });
        throw new BadRequestException(
          "Subdomain hanya boleh mengandung huruf kecil, angka, dan tanda hubung"
        );
      }
      
      if (RESERVED.includes(cleanSub)) {
        await this.prisma.user.delete({ where: { id: user.id } });
        throw new BadRequestException(`"${cleanSub}" adalah subdomain yang sudah direservasi`);
      }

      // Check if subdomain already exists
      const existingTenant = await this.prisma.tenant.findUnique({
        where: { subdomain: cleanSub },
      });

      if (existingTenant) {
        await this.prisma.user.delete({ where: { id: user.id } });
        throw new ConflictException("Subdomain sudah digunakan, silakan pilih yang lain");
      }

      // Create tenant with store data
      const tenantData: any = {
        subdomain: cleanSub,
        name: storeName,
        city: storeCity,
        ownerId: user.id,
        subscriptionPlan: "FREE",
        sellerTier: "FREE",
      };

      // Save referral code if provided
      if (referralCode) {
        const cleanReferralCode = referralCode.trim().toUpperCase();
        // Verify referral code exists
        const affiliateProfile = await this.prisma.affiliateProfile.findUnique({
          where: { referralCode: cleanReferralCode },
        });
        
        if (affiliateProfile) {
          tenantData.referralCodeUsed = cleanReferralCode;
          tenantData.referredBy = affiliateProfile.userId;
          this.logger.log(`Referral code ${cleanReferralCode} applied for tenant ${cleanSub}`);
        } else {
          this.logger.warn(`Invalid referral code ${cleanReferralCode} provided during registration`);
        }
      }

      await this.prisma.tenant.create({
        data: tenantData,
      });

      await this.prisma.sellerProfile.create({
        data: { userId: user.id },
      });

      this.logger.log(
        `Seller tenant created: ${cleanSub} (${storeName}) in ${storeCity} for user ${user.id}`,
      );
    }

    // Don't send verification automatically - let user choose method first
    this.logger.log(`User registered: ${email} as ${userRole}. Waiting for user to choose verification method.`);

    const response = {
      success: true,
      message: "Registrasi berhasil! Silakan pilih metode verifikasi untuk mengaktifkan akun Anda.",
      requiresVerification: true,
      verificationMethods: {
        email: {
          available: true,
          sent: false,
          address: user.email,
        },
        phone: {
          available: true,
          sent: false,
          number: phoneNumber,
        },
      },
      user: {
        id: user.id,
        email: user.email,
        phone: phoneNumber,
        whatsappNumber: phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: false,
        isPhoneVerified: false,
        isActive: false,
      },
      nextStep: {
        action: "choose_verification_method",
        redirectTo: "/verify-account",
        message: "Pilih metode verifikasi: Email atau WhatsApp",
      },
    };

    this.logger.log(`📤 Returning registration response: ${JSON.stringify(response)}`);
    
    return response;
  }

  /**
   * User Login — with brute-force protection and token rotation
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Check brute-force lockout
    this.checkLoginAttempts(email);

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      this.recordFailedAttempt(email);
      throw new UnauthorizedException("Email atau password salah");
    }

    // Check if user is suspended — allow login but will be restricted by JWT guard
    if (user.accountStatus === "SUSPENDED" || user.accountStatus === "UNDER_APPEAL") {
      // Verify password first before revealing account status
      const passwordMatch = await PasswordHelper.comparePassword(
        password,
        user.password,
      );
      if (!passwordMatch) {
        this.recordFailedAttempt(email);
        throw new UnauthorizedException("Email atau password salah");
      }

      this.clearFailedAttempts(email);

      // Generate tokens — suspended users can login but only access appeal routes
      const family = crypto.randomUUID();
      const { accessToken, refreshToken } = await this.generateTokens(user, family);

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }).catch(() => {});

      // Get tenant subdomain
      let tenantSubdomain = null;
      if (user.role === UserRole.SELLER) {
        const tenant = await this.prisma.tenant.findFirst({
          where: { ownerId: user.id },
          select: { subdomain: true },
        });
        tenantSubdomain = tenant?.subdomain || null;
      }

      // Return with suspended flag so frontend knows to redirect
      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          accountStatus: user.accountStatus,
          tenantSubdomain,
        },
        suspended: true,
      };
    }

    if (!user.isActive) {
      // Log detailed status for debugging
      this.logger.warn(
        `Login attempt for inactive user ${user.id}: ` +
        `isEmailVerified=${user.isEmailVerified}, ` +
        `isPhoneVerified=${user.isPhoneVerified}, ` +
        `isActive=${user.isActive}, ` +
        `accountStatus=${user.accountStatus}`,
      );

      // Double-check: if accountStatus is not ACTIVE, do NOT reactivate
      if (user.accountStatus !== "ACTIVE") {
        throw new UnauthorizedException("Akun Anda tidak aktif. Silakan hubungi admin.");
      }

      // Check if at least one verification method is completed
      const hasVerification = user.isEmailVerified || user.isPhoneVerified;
      
      if (!hasVerification) {
        // No verification completed yet
        throw new UnauthorizedException({
          message: "Akun Anda belum diverifikasi. Silakan verifikasi akun Anda melalui email atau WhatsApp.",
          requiresVerification: true,
          availableMethods: ['email', 'phone'],
          email: user.email,
          phone: user.whatsappNumber || user.phone,
        });
      }
      
      // User has verification but account not active - activate it now
      // This only happens for accountStatus=ACTIVE users (e.g., after email verification)
      this.logger.warn(
        `User ${user.id} has verification but isActive=false. Activating now...`,
      );
      
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isActive: true },
      });
      
      this.logger.log(`✅ User ${user.id} activated during login`);
      
      // Refresh user data
      const updatedUser = await this.prisma.user.findUnique({
        where: { id: user.id },
      });
      
      if (!updatedUser) {
        throw new UnauthorizedException("User not found");
      }
      
      // Continue with updated user
      Object.assign(user, updatedUser);
    }

    // Verify password
    const passwordMatch = await PasswordHelper.comparePassword(
      password,
      user.password,
    );
    if (!passwordMatch) {
      this.recordFailedAttempt(email);
      throw new UnauthorizedException("Email atau password salah");
    }

    // Clear failed attempts on success
    this.clearFailedAttempts(email);

    // Check if 2FA is enabled — if so, return a challenge instead of tokens
    if (user.twoFactorEnabled) {
      this.logger.log(`2FA challenge issued for: ${email}`);
      return {
        message: "2FA verification required",
        requires2FA: true,
        userId: user.id,
      };
    }

    // No 2FA — issue tokens directly
    return this.issueLoginTokens(user);
  }

  /**
   * Complete login with 2FA code
   */
  async loginWith2FA(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        isActive: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        backupCodes: true,
        lastActiveAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("User not found or inactive");
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException("2FA is not enabled for this account");
    }

    // Validate TOTP code or backup code
    const isValidTOTP = this.verifyTOTPCode(user.twoFactorSecret, code);

    if (!isValidTOTP) {
      // Try backup code
      const codeHash = crypto
        .createHash("sha256")
        .update(code.toUpperCase())
        .digest("hex");

      const backupIndex = user.backupCodes.indexOf(codeHash);
      if (backupIndex === -1) {
        throw new UnauthorizedException("Invalid 2FA code");
      }

      // Remove used backup code
      const updatedCodes = [...user.backupCodes];
      updatedCodes.splice(backupIndex, 1);
      await this.prisma.user.update({
        where: { id: userId },
        data: { backupCodes: updatedCodes },
      });

      this.logger.warn(
        `Backup code used for user ${userId}. ${updatedCodes.length} remaining.`,
      );
    }

    return this.issueLoginTokens(user);
  }

  /**
   * Verify a TOTP code (inline for login flow — avoids circular dependency)
   */
  private verifyTOTPCode(secret: string, code: string): boolean {
    const PERIOD = 30;
    const WINDOW = 1;

    const base32Decode = (encoded: string): Buffer => {
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
      const clean = encoded.replace(/=+$/, "").toUpperCase();
      let bits = 0, value = 0;
      const output: number[] = [];
      for (const char of clean) {
        const idx = alphabet.indexOf(char);
        if (idx === -1) continue;
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) { output.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
      }
      return Buffer.from(output);
    };

    const now = Math.floor(Date.now() / 1000);
    for (let i = -WINDOW; i <= WINDOW; i++) {
      const counter = Math.floor((now + i * PERIOD) / PERIOD);
      const counterBuf = Buffer.alloc(8);
      counterBuf.writeUInt32BE(0, 0);
      counterBuf.writeUInt32BE(counter, 4);

      const key = base32Decode(secret);
      const hmac = crypto.createHmac("sha1", key).update(counterBuf).digest();
      const offset = hmac[hmac.length - 1] & 0x0f;
      const otp =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

      if (String(otp % 1000000).padStart(6, "0") === code) return true;
    }
    return false;
  }

  /**
   * Issue login tokens (shared between normal login and 2FA login)
   */
  private async issueLoginTokens(user: any) {
    const lastActiveAt = new Date();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt },
    });

    let tenantSubdomain = null;
    if (user.role === UserRole.SELLER) {
      const tenant = await this.prisma.tenant.findFirst({
        where: { ownerId: user.id, isActive: true },
        select: { subdomain: true },
      });
      tenantSubdomain = tenant?.subdomain || null;
    }

    const family = this.generateFamily();
    const { accessToken, refreshToken } = await this.generateTokens(user, family);

    // Track last login timestamp
    this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastActiveAt: new Date() },
    }).catch(() => {});

    this.logger.log(`User logged in: ${user.email}`);

    return {
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role,
        lastActiveAt,
        tenantSubdomain,
      },
    };
  }

  /**
   * Refresh Access Token — with token rotation and reuse detection
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    try {
      // Verify JWT signature and expiry
      const decoded = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      // Look up the token in database
      const tokenHash = this.hashToken(refreshToken);
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { tokenHash },
      });

      if (!storedToken) {
        // Token not found — might be a stolen token that was already rotated
        // Revoke ALL tokens in this family as a precaution
        this.logger.warn(
          `Refresh token reuse detected for user ${decoded.sub}. Revoking all tokens.`,
        );
        await this.prisma.refreshToken.updateMany({
          where: { userId: decoded.sub },
          data: { isRevoked: true },
        });
        throw new UnauthorizedException(
          "Token reuse detected. All sessions have been revoked for security.",
        );
      }

      if (storedToken.isRevoked) {
        // Revoked token used — potential token theft
        // Revoke entire family
        this.logger.warn(
          `Revoked refresh token used for family ${storedToken.family}. Revoking all family tokens.`,
        );
        await this.prisma.refreshToken.updateMany({
          where: { family: storedToken.family },
          data: { isRevoked: true },
        });
        throw new UnauthorizedException(
          "Session has been revoked. Please log in again.",
        );
      }

      if (storedToken.expiresAt < new Date()) {
        throw new UnauthorizedException("Refresh token has expired");
      }

      // Verify user still exists and is active
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { id: true, email: true, role: true, isActive: true, accountStatus: true, firstName: true, lastName: true },
      });

      if (!user) {
        throw new UnauthorizedException("User not found or inactive");
      }

      // Block suspended users from refreshing tokens
      if (user.accountStatus === "SUSPENDED" || user.accountStatus === "UNDER_APPEAL") {
        throw new UnauthorizedException(
          "Akun Anda di-suspend. Silakan ajukan banding melalui halaman appeal.",
        );
      }

      if (!user.isActive) {
        throw new UnauthorizedException("User not found or inactive");
      }

      // Rotate: revoke old token, issue new one in same family
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      });

      const { accessToken, refreshToken: newRefreshToken } =
        await this.generateTokens(user, storedToken.family);

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  /**
   * Logout — revoke all refresh tokens for the user
   */
  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    this.logger.log(`User logged out: ${userId} — all tokens revoked`);
    return { message: "Logged out successfully" };
  }

  /**
   * Logout from all devices — revoke ALL refresh tokens
   */
  async logoutAllDevices(userId: string) {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });

    this.logger.log(
      `User ${userId} logged out from all devices — ${result.count} tokens revoked`,
    );
    return {
      message: "Logged out from all devices",
      revokedSessions: result.count,
    };
  }

  /**
   * Create Tenant for Seller
   */
  async createTenant(userId: string, createTenantDto: CreateTenantDto) {
    const { subdomain, name, description } = createTenantDto;

    // Validate subdomain
    const RESERVED = [
      "www",
      "api",
      "admin",
      "app",
      "mail",
      "smtp",
      "ftp",
      "dashboard",
      "panel",
      "support",
      "help",
      "billing",
      "auth",
      "login",
      "register",
      "static",
      "assets",
      "cdn",
      "media",
      "upload",
      "uploads",
      "public",
    ];
    const cleanSub = subdomain.toLowerCase().trim();
    if (cleanSub.length < 3 || cleanSub.length > 30) {
      throw new BadRequestException("Subdomain must be 3-30 characters");
    }
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(cleanSub)) {
      throw new BadRequestException(
        "Subdomain can only contain lowercase letters, numbers, and hyphens",
      );
    }
    if (RESERVED.includes(cleanSub)) {
      throw new BadRequestException(`"${cleanSub}" is a reserved subdomain`);
    }

    // Check if user exists and is active
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new BadRequestException("User not found or inactive");
    }

    // Check if subdomain already exists
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { subdomain: cleanSub },
    });

    if (existingTenant) {
      throw new ConflictException("Subdomain already taken");
    }

    // Check if user already has a tenant (sellers can only have 1 for now)
    const userTenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId },
    });

    if (userTenant) {
      throw new BadRequestException("User already has a tenant");
    }

    // Create tenant
    const tenant = await this.prisma.tenant.create({
      data: {
        subdomain: cleanSub,
        name,
        description: description || null,
        ownerId: userId,
      },
    });

    // Update user role to SELLER if not already
    if (user.role === UserRole.BUYER) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { role: UserRole.SELLER },
      });
    }

    // Create seller profile if doesn't exist
    const existingProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!existingProfile) {
      await this.prisma.sellerProfile.create({
        data: { userId },
      });
    }

    this.logger.log(`Tenant created: ${subdomain} for user ${userId}`);

    return {
      message: "Tenant created successfully",
      tenant: {
        id: tenant.id,
        subdomain: tenant.subdomain,
        name: tenant.name,
        createdAt: tenant.createdAt,
      },
    };
  }

  /**
   * Get User Profile
   */
  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        phone: true,
        address: true,
        city: true,
        province: true,
        postalCode: true,
        whatsappNumber: true,
        role: true,
        isEmailVerified: true,
        isActive: true,
        accountStatus: true,
        lastActiveAt: true,
        createdAt: true,
        tenants: {
          where: { deletedAt: null },
          select: {
            id: true,
            subdomain: true,
            name: true,
            isActive: true,
          },
        },
        sellerProfile: {
          select: {
            totalEarnings: true,
            totalOrders: true,
            averageRating: true,
            skills: true,
          },
        },
      },
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    // Add tenantSubdomain to user object for convenience
    // Only get active tenant subdomain
    const activeTenant = user.tenants?.find(t => t.isActive);
    const tenantSubdomain = activeTenant?.subdomain || null;

    return {
      user: {
        ...user,
        tenantSubdomain,
      },
    };
  }

  /**
   * Generate JWT Tokens — stores refresh token hash in DB for revocation
   */
  private async generateTokens(user: any, family: string) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: parseInt(process.env.JWT_EXPIRES_IN || "900"),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN || "604800"),
    });

    // Store refresh token hash in database
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(
      Date.now() +
        parseInt(process.env.JWT_REFRESH_EXPIRES_IN || "604800") * 1000,
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        family,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Forgot Password - generate reset token
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: "If that email exists, a reset link has been sent." };
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpiry = new Date(Date.now() + 3600000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry: resetExpiry,
      },
    });

    this.logger.log(`Password reset requested for: ${dto.email}`);
    await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    return {
      message: "If that email exists, a reset link has been sent.",
    };
  }

  /**
   * Reset Password using token — also revokes all refresh tokens
   */
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: dto.token,
        resetTokenExpiry: { gte: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    const passwordValidation = PasswordHelper.validatePasswordStrength(
      dto.newPassword,
    );
    if (!passwordValidation.isValid) {
      throw new BadRequestException({
        message: "Password does not meet requirements",
        errors: passwordValidation.errors,
      });
    }

    const hashedPassword = await PasswordHelper.hashPassword(dto.newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Revoke all refresh tokens after password reset (force re-login)
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true },
    });

    this.logger.log(
      `Password reset for user ${user.email} — all sessions revoked`,
    );

    return { message: "Password reset successful" };
  }

  /**
   * Request Email Verification
   */
  async requestEmailVerification(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    if (user.isEmailVerified) {
      return { message: "Email already verified" };
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 24 * 3600000); // 24 hours

    await this.prisma.user.update({
      where: { id: userId },
      data: { verificationToken, verificationTokenExpiry },
    });

    this.logger.log(`Email verification requested for: ${user.email}`);
    await this.emailService.sendVerificationEmail(
      user.email,
      verificationToken,
    );

    return {
      message: "Verification email sent.",
    };
  }

  /**
   * Verify Email with token
   */
  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        verificationToken: dto.token,
        verificationTokenExpiry: { gte: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException("Invalid or expired verification token");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    return { message: "Email verified successfully" };
  }

  /**
   * Change Password (logged-in user) — also revokes all other sessions
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    const passwordMatch = await PasswordHelper.comparePassword(
      dto.currentPassword,
      user.password,
    );
    if (!passwordMatch) {
      throw new BadRequestException("Current password is incorrect");
    }

    const passwordValidation = PasswordHelper.validatePasswordStrength(
      dto.newPassword,
    );
    if (!passwordValidation.isValid) {
      throw new BadRequestException({
        message: "Password does not meet requirements",
        errors: passwordValidation.errors,
      });
    }

    const hashedPassword = await PasswordHelper.hashPassword(dto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Revoke all refresh tokens (force re-login on all devices)
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });

    this.logger.log(
      `Password changed for user: ${user.email} — all sessions revoked`,
    );
    return { message: "Password changed successfully. Please log in again." };
  }

  async updateProfile(
    userId: string,
    dto: { 
      avatar?: string; 
      firstName?: string; 
      lastName?: string; 
      phone?: string; 
      bio?: string;
      address?: string;
      city?: string;
      province?: string;
      postalCode?: string;
      whatsappNumber?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.avatar !== undefined && { avatar: dto.avatar }),
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.province !== undefined && { province: dto.province }),
        ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
        ...(dto.whatsappNumber !== undefined && { whatsappNumber: dto.whatsappNumber }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        phone: true,
        bio: true,
        role: true,
        lastActiveAt: true,
        address: true,
        city: true,
        province: true,
        postalCode: true,
        whatsappNumber: true,
      },
    });

    return { message: "Profile updated successfully", user: updated };
  }
}
