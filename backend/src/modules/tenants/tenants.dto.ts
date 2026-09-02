import { IsString, IsEmail, IsOptional, IsBoolean, IsIn, MaxLength, MinLength } from "class-validator";

export class CreateTenantDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  subdomain: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  province: string;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  address: string;

  @IsString()
  @MinLength(5)
  @MaxLength(10)
  postalCode: string;

  @IsString()
  @MaxLength(50)
  shippingOriginId: string;

  @IsString()
  @MaxLength(255)
  shippingOriginLabel: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  referralCode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  banner?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;
}

export class UpdateTenantThemeDto {
  @IsOptional()
  @IsString()
  themeColor?: string; // Primary color hex

  @IsOptional()
  @IsString()
  themeSecondary?: string; // Secondary color hex

  @IsOptional()
  @IsString()
  @IsIn(['emerald', 'ocean', 'sunset', 'purple', 'pink', 'default'])
  themePreset?: string; // Preset theme name

  @IsOptional()
  @IsString()
  @IsIn(['inter', 'poppins', 'playfair', 'roboto', 'montserrat'])
  themeFontFamily?: string; // Font family

  @IsOptional()
  @IsString()
  @IsIn(['none', 'sm', 'md', 'lg', 'full'])
  themeBorderRadius?: string; // Border radius style

  @IsOptional()
  @IsString()
  @IsIn(['none', 'soft', 'medium', 'hard'])
  themeShadowStyle?: string; // Shadow style
}

export class UpdateTenantSeoDto {
  @IsBoolean()
  isSeoActive: boolean;
}

export class TenantResponseDto {
  id: string;
  subdomain: string;
  name: string;
  description?: string;
  logo?: string;
  banner?: string;
  subscriptionPlan: string;
  isActive: boolean;
  isVerified: boolean;
  isSeoActive: boolean;
  seoActivatedAt?: Date;
  createdAt: Date;
}
