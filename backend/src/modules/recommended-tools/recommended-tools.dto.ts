import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsUrl,
  ValidateIf,
  IsNotEmpty,
} from "class-validator";

export enum ToolType {
  EBOOK_PDF = "EBOOK_PDF",
  APPLICATION = "APPLICATION",
  WEBSITE = "WEBSITE",
  TOOLS_ONLINE = "TOOLS_ONLINE",
}

export class CreateRecommendedToolDto {
  @IsString()
  @IsNotEmpty({ message: "Judul wajib diisi" })
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ToolType, { message: "Type harus salah satu dari: EBOOK_PDF, APPLICATION, WEBSITE, TOOLS_ONLINE" })
  type: ToolType;

  // File — optional (akan diisi dari upload)
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsNumber()
  fileSize?: number;

  // Redirect URL — wajib jika type bukan EBOOK_PDF
  @ValidateIf((o) => o.type !== ToolType.EBOOK_PDF)
  @IsString({ message: "Redirect URL wajib diisi untuk tipe Aplikasi/Website/Tools" })
  @IsNotEmpty({ message: "Redirect URL wajib diisi untuk tipe Aplikasi/Website/Tools" })
  redirectUrl?: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdateRecommendedToolDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ToolType)
  type?: ToolType;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @IsOptional()
  @IsString()
  redirectUrl?: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
