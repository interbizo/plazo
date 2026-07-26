import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "@modules/database/database.module";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { AuthOTPService } from "./auth-otp.service";
import { TwoFactorService } from "./two-factor.service";
import { GoogleAuthService } from "./google-auth.service";
import { SsoService } from "./sso.service";
import { TurnstileService } from "./turnstile.service";
import { OTPService } from "@common/services/otp.service";
import { FontteService } from "@common/services/fonnte.service";
import { EmailService } from "@common/services/email.service";
import { EmailVerificationService } from "@common/services/email-verification.service";
import { EmailVerificationController } from "./email-verification.controller";
import { UnifiedVerificationService } from "@common/services/unified-verification.service";
import { UnifiedVerificationController } from "./unified-verification.controller";

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "15m" },
    }),
  ],
  controllers: [AuthController, EmailVerificationController, UnifiedVerificationController],
  providers: [
    AuthService, 
    AuthOTPService,
    TwoFactorService, 
    GoogleAuthService, 
    SsoService, 
    TurnstileService,
    OTPService,
    FontteService,
    EmailService,
    EmailVerificationService,
    UnifiedVerificationService,
  ],
  exports: [
    AuthService, 
    AuthOTPService,
    TwoFactorService, 
    GoogleAuthService, 
    SsoService, 
    TurnstileService, 
    JwtModule
  ],
})
export class AuthModule {}
