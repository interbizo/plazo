import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsIn,
} from "class-validator";

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(["BUYER", "SELLER"])
  role?: string;

  // Address fields (optional for all users)
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  province?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(10)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  whatsappNumber?: string;

  // Store data for SELLER registration
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  storeName?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  storeSubdomain?: string;

  @IsOptional()
  @IsString()
  storeCity?: string;

  // Referral code (optional)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  referralCode?: string;

  // Turnstile token
  @IsString()
  turnstileToken: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  // Turnstile token
  @IsString()
  turnstileToken: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class CreateTenantDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  subdomain: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;

  // Turnstile token
  @IsString()
  turnstileToken: string;
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;

  // Turnstile token
  @IsString()
  turnstileToken: string;
}

export class VerifyEmailDto {
  @IsString()
  token: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

// ============ TWO-FACTOR AUTH ============

export class Verify2FADto {
  @IsString()
  code: string;
}

export class LoginWith2FADto {
  @IsString()
  userId: string;

  @IsString()
  code: string;
}

export class Disable2FADto {
  @IsString()
  code: string;
}

// ============ PROFILE UPDATE ============

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  // Address fields
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  province?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(10)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  whatsappNumber?: string;
}

// ============ GOOGLE AUTH ============

export class GoogleAuthDto {
  @IsString()
  @MinLength(10)
  idToken: string;

  @IsOptional()
  @IsIn(["BUYER", "SELLER"])
  role?: string;

  @IsOptional()
  @IsString()
  turnstileToken?: string;
}
