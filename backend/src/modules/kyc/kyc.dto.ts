import { IsString, IsOptional, IsNotEmpty, Matches, MinLength, MaxLength } from "class-validator";

export class SubmitKycDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{16}$/, { message: 'NIK harus 16 digit angka' })
  ktpNumber: string; // Will be encrypted and hashed

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  fullName: string; // Will be encrypted

  @IsOptional()
  @IsString()
  address?: string; // Will be encrypted

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format tanggal lahir: YYYY-MM-DD' })
  dateOfBirth?: string; // Will be encrypted

  @IsString()
  @IsNotEmpty()
  ktpPhotoPath: string; // File path from upload module

  @IsString()
  @IsNotEmpty()
  selfieWithKtpPath: string; // Selfie holding KTP (REQUIRED)
}

export class AdminReviewKycDto {
  @IsString()
  action: "approve" | "reject";

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
