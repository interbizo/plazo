import {
  Injectable,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "@modules/database/prisma.service";
import { UserRole } from "@prisma/client";
import * as crypto from "crypto";

/**
 * Google OAuth authentication service.
 * Handles the server-side token verification and user creation/login.
 *
 * Flow:
 * 1. Frontend gets Google ID token via Google Sign-In button
 * 2. Frontend sends ID token to POST /api/auth/google
 * 3. This service verifies the token with Google's tokeninfo endpoint
 * 4. Creates user if new, or logs in existing user
 * 5. Returns JWT tokens
 *
 * Required env vars:
 * - GOOGLE_CLIENT_ID: Your Google OAuth client ID
 */

interface GoogleUserInfo {
  sub: string; // Google user ID
  email: string;
  email_verified: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Verify Google ID token and return user info
   */
  private async verifyGoogleToken(idToken: string): Promise<GoogleUserInfo> {
    try {
      // Verify token with Google's tokeninfo endpoint
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
      );

      if (!response.ok) {
        throw new BadRequestException("Invalid Google token");
      }

      const payload = (await response.json()) as any;

      // Verify the token was issued for our app
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (clientId && payload.aud !== clientId) {
        throw new BadRequestException("Token was not issued for this application");
      }

      if (!payload.email_verified) {
        throw new BadRequestException("Google email is not verified");
      }

      return {
        sub: payload.sub,
        email: payload.email,
        email_verified: payload.email_verified === "true" || payload.email_verified === true,
        name: payload.name || "",
        given_name: payload.given_name || payload.name?.split(" ")[0] || "",
        family_name: payload.family_name || payload.name?.split(" ").slice(1).join(" ") || "",
        picture: payload.picture || "",
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error("Google token verification failed", error);
      throw new BadRequestException("Failed to verify Google token");
    }
  }

  /**
   * Authenticate with Google — creates account if new, logs in if existing
   */
  async authenticateWithGoogle(idToken: string, role?: string) {
    const googleUser = await this.verifyGoogleToken(idToken);

    // Check if user already exists
    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (user) {
      // Existing user — check if active
      if (!user.isActive) {
        throw new BadRequestException("Account is inactive");
      }

      // Update avatar if not set
      if (!user.avatar && googleUser.picture) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { avatar: googleUser.picture },
        });
      }

      this.logger.log(`Google login: ${googleUser.email} (existing user)`);
    } else {
      // New user — create account
      const userRole = role === "SELLER" ? UserRole.SELLER : UserRole.BUYER;

      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          firstName: googleUser.given_name || "User",
          lastName: googleUser.family_name || "",
          password: await this.generateRandomPassword(),
          avatar: googleUser.picture || null,
          role: userRole,
          isEmailVerified: true, // Google already verified the email
          isActive: true,
        },
      });

      // If registering as SELLER, auto-create Tenant + SellerProfile
      if (userRole === UserRole.SELLER) {
        const randomSuffix = crypto.randomBytes(2).toString("hex");
        const subdomain =
          googleUser.given_name.toLowerCase().replace(/[^a-z0-9]/g, "") +
          randomSuffix;

        await this.prisma.tenant.create({
          data: {
            subdomain,
            name: `${googleUser.given_name}'s Store`,
            ownerId: user.id,
            subscriptionPlan: "FREE",
            sellerTier: "FREE",
          },
        });

        await this.prisma.sellerProfile.create({
          data: { userId: user.id },
        });
      }

      this.logger.log(
        `Google signup: ${googleUser.email} as ${userRole} (new user)`,
      );
    }

    // Get tenant subdomain
    let tenantSubdomain = null;
    if (user.role === UserRole.SELLER) {
      const tenant = await this.prisma.tenant.findFirst({
        where: { ownerId: user.id, isActive: true },
        select: { subdomain: true },
      });
      tenantSubdomain = tenant?.subdomain || null;
    }

    // Generate tokens
    const family = crypto.randomUUID();
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: parseInt(process.env.JWT_EXPIRES_IN || "900"),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN || "604800"),
    });

    // Store refresh token
    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    const expiresAt = new Date(
      Date.now() +
        parseInt(process.env.JWT_REFRESH_EXPIRES_IN || "604800") * 1000,
    );

    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, family, expiresAt },
    });

    return {
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
        tenantSubdomain,
      },
    };
  }

  /**
   * Generate a random password for OAuth users (they won't use it directly)
   */
  private async generateRandomPassword(): Promise<string> {
    const bcrypt = await import("bcryptjs");
    const random = crypto.randomBytes(32).toString("hex");
    return bcrypt.hash(random, 10);
  }
}
