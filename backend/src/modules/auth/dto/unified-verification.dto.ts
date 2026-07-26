import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';

export enum VerificationMethod {
  EMAIL = 'email',
  PHONE = 'phone',
}

export class SendVerificationDto {
  @IsEnum(VerificationMethod, { message: 'Metode verifikasi harus email atau phone' })
  @IsNotEmpty({ message: 'Metode verifikasi wajib dipilih' })
  method: VerificationMethod;

  @IsString({ message: 'Identifier harus berupa string' })
  @IsOptional()
  identifier?: string; // Email or phone number
}

export class VerifyWithMethodDto {
  @IsEnum(VerificationMethod, { message: 'Metode verifikasi harus email atau phone' })
  @IsNotEmpty({ message: 'Metode verifikasi wajib dipilih' })
  method: VerificationMethod;

  @IsString({ message: 'Code/Token harus berupa string' })
  @IsNotEmpty({ message: 'Code/Token wajib diisi' })
  code: string; // OTP code for phone, token for email

  @IsString({ message: 'Identifier harus berupa string' })
  @IsOptional()
  identifier?: string; // Phone number for OTP verification
}

export class ForgotPasswordWithMethodDto {
  @IsEnum(VerificationMethod, { message: 'Metode reset harus email atau phone' })
  @IsNotEmpty({ message: 'Metode reset wajib dipilih' })
  method: VerificationMethod;

  @IsString({ message: 'Identifier harus berupa string' })
  @IsNotEmpty({ message: 'Email atau nomor WhatsApp wajib diisi' })
  identifier: string; // Email or phone number
}

export class ResetPasswordWithMethodDto {
  @IsEnum(VerificationMethod, { message: 'Metode reset harus email atau phone' })
  @IsNotEmpty({ message: 'Metode reset wajib dipilih' })
  method: VerificationMethod;

  @IsString({ message: 'Code/Token harus berupa string' })
  @IsNotEmpty({ message: 'Code/Token wajib diisi' })
  code: string; // OTP code for phone, token for email

  @IsString({ message: 'Password harus berupa string' })
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @IsNotEmpty({ message: 'Password wajib diisi' })
  newPassword: string;

  @IsString({ message: 'Identifier harus berupa string' })
  @IsOptional()
  identifier?: string; // Phone number for OTP method
}

export class GetAvailableMethodsDto {
  @IsString({ message: 'Identifier harus berupa string' })
  @IsNotEmpty({ message: 'Email atau nomor WhatsApp wajib diisi' })
  identifier: string; // Email or phone number
}

export class CheckVerificationStatusDto {
  @IsString({ message: 'User ID harus berupa string' })
  @IsOptional()
  userId?: string;

  @IsString({ message: 'Identifier harus berupa string' })
  @IsOptional()
  identifier?: string;
}
