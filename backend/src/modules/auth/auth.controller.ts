import { Controller, Post, Body, Get, UseGuards, Patch, Res, Req, Query, Ip } from "@nestjs/common";
import { Response, Request } from "express";
import { AuthService } from "./auth.service";
import { AuthOTPService } from "./auth-otp.service";
import { TwoFactorService } from "./two-factor.service";
import { GoogleAuthService } from "./google-auth.service";
import { SsoService } from "./sso.service";
import { TurnstileService } from "./turnstile.service";
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  CreateTenantDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ChangePasswordDto,
  Verify2FADto,
  LoginWith2FADto,
  Disable2FADto,
  UpdateProfileDto,
  GoogleAuthDto,
} from "./dto/auth.dto";
import {
  VerifyOTPDto,
  ResendOTPDto,
  ForgotPasswordDto as ForgotPasswordOtpDto,
  ResetPasswordDto as ResetPasswordOtpDto,
} from "./dto/otp.dto";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { GetUser } from "@common/decorators/get-user.decorator";

@Controller("api/auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private otpAuthService: AuthOTPService,
    private twoFactorService: TwoFactorService,
    private googleAuthService: GoogleAuthService,
    private ssoService: SsoService,
    private turnstileService: TurnstileService,
  ) {}

  @Post("register")
  async register(@Body() registerDto: RegisterDto, @Ip() ip: string) {
    // Verify Turnstile token first
    await this.turnstileService.verifyOrThrow(registerDto.turnstileToken, ip);
    
    return this.authService.register(registerDto);
  }

  @Post("login")
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Query("returnUrl") returnUrl?: string,
    @Ip() ip?: string,
  ) {
    // Verify Turnstile token first
    await this.turnstileService.verifyOrThrow(loginDto.turnstileToken, ip);
    
    const result = await this.authService.login(loginDto);
    
    // If 2FA is required, don't set cookies yet
    if ('requires2FA' in result && result.requires2FA) {
      return result;
    }
    
    // Type guard: at this point we know it's a successful login response
    const loginResult = result as { 
      message: string; 
      accessToken: string; 
      refreshToken: string; 
      user: any;
    };
    
    // Set HTTP-only cookie for cross-subdomain SSO
    const cookieDomain = this.ssoService.getCookieDomain();
    const isProduction = process.env.NODE_ENV === "production";
    
    res.cookie("auth_token", loginResult.accessToken, {
      httpOnly: true,
      secure: isProduction, // HTTPS only in production
      sameSite: "lax",
      domain: cookieDomain,
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: "/",
    });

    res.cookie("refresh_token", loginResult.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      domain: cookieDomain,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    // If returnUrl is provided and valid, include it in response
    if (returnUrl && this.ssoService.validateReturnUrl(returnUrl)) {
      return {
        ...loginResult,
        returnUrl,
      };
    }

    return loginResult;
  }

  @Post("login/2fa")
  async loginWith2FA(@Body() dto: LoginWith2FADto) {
    return this.authService.loginWith2FA(dto.userId, dto.code);
  }

  @Post("refresh")
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refreshToken(refreshTokenDto);
    
    // Update cookies with new tokens
    const cookieDomain = this.ssoService.getCookieDomain();
    const isProduction = process.env.NODE_ENV === "production";
    
    res.cookie("auth_token", result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      domain: cookieDomain,
      maxAge: 15 * 60 * 1000,
      path: "/",
    });

    // Only set refresh token cookie if a new one was issued
    if ('refreshToken' in result && result.refreshToken) {
      res.cookie("refresh_token", result.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        domain: cookieDomain,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });
    }

    return result;
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  async logout(
    @GetUser("id") userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Clear cookies
    const cookieDomain = this.ssoService.getCookieDomain();
    
    res.clearCookie("auth_token", {
      domain: cookieDomain,
      path: "/",
    });
    
    res.clearCookie("refresh_token", {
      domain: cookieDomain,
      path: "/",
    });

    return this.authService.logout(userId);
  }

  @Post("logout-all")
  @UseGuards(JwtAuthGuard)
  async logoutAllDevices(
    @GetUser("id") userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Clear cookies
    const cookieDomain = this.ssoService.getCookieDomain();
    
    res.clearCookie("auth_token", {
      domain: cookieDomain,
      path: "/",
    });
    
    res.clearCookie("refresh_token", {
      domain: cookieDomain,
      path: "/",
    });

    return this.authService.logoutAllDevices(userId);
  }

  @Get("profile")
  @UseGuards(JwtAuthGuard)
  async getProfile(@GetUser("id") userId: string) {
    return this.authService.getUserProfile(userId);
  }

  @Post("tenant/create")
  @UseGuards(JwtAuthGuard)
  async createTenant(
    @GetUser("id") userId: string,
    @Body() createTenantDto: CreateTenantDto,
  ) {
    return this.authService.createTenant(userId, createTenantDto);
  }

  @Post("forgot-password")
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Ip() ip: string) {
    // Verify Turnstile token first
    await this.turnstileService.verifyOrThrow(dto.turnstileToken, ip);
    
    return this.authService.forgotPassword(dto);
  }

  @Post("reset-password")
  async resetPassword(@Body() dto: ResetPasswordDto, @Ip() ip: string) {
    // Verify Turnstile token first
    await this.turnstileService.verifyOrThrow(dto.turnstileToken, ip);
    
    return this.authService.resetPassword(dto);
  }

  @Post("verify-email")
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post("request-verification")
  @UseGuards(JwtAuthGuard)
  async requestVerification(@GetUser("id") userId: string) {
    return this.authService.requestEmailVerification(userId);
  }

  @Post("change-password")
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @GetUser("id") userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }

  @Patch("profile")
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @GetUser("id") userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(userId, dto);
  }

  // ============ GOOGLE OAUTH ============

  @Post("google")
  async googleAuth(
    @Body() dto: GoogleAuthDto,
    @Res({ passthrough: true }) res?: Response,
    @Query("returnUrl") returnUrl?: string,
  ) {
    const result = await this.googleAuthService.authenticateWithGoogle(dto.idToken, dto.role);
    
    // Set cookies for SSO
    if (res) {
      const cookieDomain = this.ssoService.getCookieDomain();
      const isProduction = process.env.NODE_ENV === "production";
      
      res.cookie("auth_token", result.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        domain: cookieDomain,
        maxAge: 15 * 60 * 1000,
        path: "/",
      });

      res.cookie("refresh_token", result.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        domain: cookieDomain,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });
    }

    // Include returnUrl if valid
    if (returnUrl && this.ssoService.validateReturnUrl(returnUrl)) {
      return {
        ...result,
        returnUrl,
      };
    }

    return result;
  }

  // ============ SSO ENDPOINTS ============

  /**
   * Validate if user is authenticated (for SSO check from subdomains)
   */
  @Get("sso/check")
  @UseGuards(JwtAuthGuard)
  async checkSsoAuth(@GetUser() user: any) {
    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  /**
   * Get SSO login URL with return URL
   */
  @Get("sso/login-url")
  async getSsoLoginUrl(@Query("returnUrl") returnUrl?: string) {
    return {
      loginUrl: this.ssoService.buildLoginUrl(returnUrl),
    };
  }

  /**
   * Get SSO register URL with return URL
   */
  @Get("sso/register-url")
  async getSsoRegisterUrl(@Query("returnUrl") returnUrl?: string) {
    return {
      registerUrl: this.ssoService.buildRegisterUrl(returnUrl),
    };
  }

  /**
   * Validate return URL
   */
  @Get("sso/validate-url")
  async validateReturnUrl(@Query("url") url: string) {
    return {
      valid: this.ssoService.validateReturnUrl(url),
    };
  }

  // ============ TWO-FACTOR AUTH ============

  @Post("2fa/setup")
  @UseGuards(JwtAuthGuard)
  async setup2FA(@GetUser("id") userId: string) {
    return this.twoFactorService.setup2FA(userId);
  }

  @Post("2fa/verify")
  @UseGuards(JwtAuthGuard)
  async verify2FA(
    @GetUser("id") userId: string,
    @Body() dto: Verify2FADto,
  ) {
    return this.twoFactorService.verify2FA(userId, dto.code);
  }

  @Post("2fa/disable")
  @UseGuards(JwtAuthGuard)
  async disable2FA(
    @GetUser("id") userId: string,
    @Body() dto: Disable2FADto,
  ) {
    return this.twoFactorService.disable2FA(userId, dto.code);
  }

  @Post("2fa/backup-codes")
  @UseGuards(JwtAuthGuard)
  async regenerateBackupCodes(
    @GetUser("id") userId: string,
    @Body() dto: Verify2FADto,
  ) {
    return this.twoFactorService.regenerateBackupCodes(userId, dto.code);
  }

  @Get("2fa/status")
  @UseGuards(JwtAuthGuard)
  async get2FAStatus(@GetUser("id") userId: string) {
    const enabled = await this.twoFactorService.has2FA(userId);
    return { twoFactorEnabled: enabled };
  }

  // ============ OTP WHATSAPP VERIFICATION ============

  /**
   * Verify OTP after registration
   */
  @Post("verify-otp")
  async verifyOtp(@Body() dto: VerifyOTPDto) {
    return this.otpAuthService.verifyRegistrationOTP(dto);
  }

  /**
   * Resend OTP (with cooldown)
   */
  @Post("resend-otp")
  async resendOtp(@Body() dto: ResendOTPDto) {
    return this.otpAuthService.resendOTP(dto);
  }

  /**
   * Forgot password - send OTP to WhatsApp
   */
  @Post("forgot-password-otp")
  async forgotPasswordOtp(@Body() dto: ForgotPasswordOtpDto) {
    return this.otpAuthService.forgotPassword(dto);
  }

  /**
   * Reset password with OTP verification
   */
  @Post("reset-password-otp")
  async resetPasswordOtp(@Body() dto: ResetPasswordOtpDto) {
    return this.otpAuthService.resetPassword(dto);
  }
}
