import { IsString, IsNotEmpty, IsEnum, IsPhoneNumber, Length, Matches } from 'class-validator';
import { OTPType } from '@prisma/client';

export class SendOTPDto {
  @IsPhoneNumber('ID', { message: 'Nomor WhatsApp tidak valid' })
  @IsNotEmpty({ message: 'Nomor WhatsApp wajib diisi' })
  phone: string;

  @IsEnum(OTPType, { message: 'Tipe OTP tidak valid' })
  @IsNotEmpty({ message: 'Tipe OTP wajib diisi' })
  type: OTPType;
}

export class VerifyOTPDto {
  @IsPhoneNumber('ID', { message: 'Nomor WhatsApp tidak valid' })
  @IsNotEmpty({ message: 'Nomor WhatsApp wajib diisi' })
  phone: string;

  @IsString({ message: 'Kode OTP harus berupa string' })
  @IsNotEmpty({ message: 'Kode OTP wajib diisi' })
  @Length(6, 6, { message: 'Kode OTP harus 6 digit' })
  @Matches(/^\d{6}$/, { message: 'Kode OTP harus berupa 6 digit angka' })
  code: string;

  @IsEnum(OTPType, { message: 'Tipe OTP tidak valid' })
  @IsNotEmpty({ message: 'Tipe OTP wajib diisi' })
  type: OTPType;
}

export class ResendOTPDto {
  @IsPhoneNumber('ID', { message: 'Nomor WhatsApp tidak valid' })
  @IsNotEmpty({ message: 'Nomor WhatsApp wajib diisi' })
  phone: string;

  @IsEnum(OTPType, { message: 'Tipe OTP tidak valid' })
  @IsNotEmpty({ message: 'Tipe OTP wajib diisi' })
  type: OTPType;
}

export class ForgotPasswordDto {
  @IsPhoneNumber('ID', { message: 'Nomor WhatsApp tidak valid' })
  @IsNotEmpty({ message: 'Nomor WhatsApp wajib diisi' })
  phone: string;
}

export class ResetPasswordDto {
  @IsPhoneNumber('ID', { message: 'Nomor WhatsApp tidak valid' })
  @IsNotEmpty({ message: 'Nomor WhatsApp wajib diisi' })
  phone: string;

  @IsString({ message: 'Kode OTP harus berupa string' })
  @IsNotEmpty({ message: 'Kode OTP wajib diisi' })
  @Length(6, 6, { message: 'Kode OTP harus 6 digit' })
  @Matches(/^\d{6}$/, { message: 'Kode OTP harus berupa 6 digit angka' })
  code: string;

  @IsString({ message: 'Password harus berupa string' })
  @IsNotEmpty({ message: 'Password baru wajib diisi' })
  @Length(8, 100, { message: 'Password harus minimal 8 karakter' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password harus mengandung huruf besar, huruf kecil, dan angka',
  })
  newPassword: string;
}
