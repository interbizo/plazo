import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SendVerificationEmailDto {
  @IsEmail({}, { message: 'Email tidak valid' })
  @IsNotEmpty({ message: 'Email wajib diisi' })
  email: string;
}

export class VerifyEmailDto {
  @IsString({ message: 'Token harus berupa string' })
  @IsNotEmpty({ message: 'Token wajib diisi' })
  token: string;
}

export class ForgotPasswordEmailDto {
  @IsEmail({}, { message: 'Email tidak valid' })
  @IsNotEmpty({ message: 'Email wajib diisi' })
  email: string;
}

export class ResetPasswordEmailDto {
  @IsString({ message: 'Token harus berupa string' })
  @IsNotEmpty({ message: 'Token wajib diisi' })
  token: string;

  @IsString({ message: 'Password harus berupa string' })
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @IsNotEmpty({ message: 'Password wajib diisi' })
  newPassword: string;
}

export class VerifyResetTokenDto {
  @IsString({ message: 'Token harus berupa string' })
  @IsNotEmpty({ message: 'Token wajib diisi' })
  token: string;
}
