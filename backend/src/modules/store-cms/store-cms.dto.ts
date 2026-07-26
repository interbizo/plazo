import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsHexColor,
  IsUrl,
  IsObject,
  ValidateNested,
  IsArray,
} from "class-validator";
import { Type } from "class-transformer";

// ============================================
// THEME CUSTOMIZATION DTOs
// ============================================

export class UpdateThemeDto {
  @IsOptional()
  @IsHexColor()
  themeColor?: string;

  @IsOptional()
  @IsHexColor()
  themeSecondary?: string;

  @IsOptional()
  @IsString()
  themePreset?: string; // "emerald", "ocean", "sunset", "rose", "purple"

  @IsOptional()
  @IsString()
  themeFontFamily?: string; // "inter", "poppins", "playfair", "roboto"

  @IsOptional()
  @IsEnum(["none", "sm", "md", "lg", "xl", "full"])
  themeBorderRadius?: string;

  @IsOptional()
  @IsEnum(["none", "soft", "medium", "hard"])
  themeShadowStyle?: string;
}

export class UpdateStoreInfoDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  tagline?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  banner?: string;

  @IsOptional()
  @IsString()
  favicon?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  contactWhatsapp?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  storeAnnouncement?: string;
}

export class SocialLinksDto {
  @IsOptional()
  @IsUrl()
  instagram?: string;

  @IsOptional()
  @IsUrl()
  facebook?: string;

  @IsOptional()
  @IsUrl()
  twitter?: string;

  @IsOptional()
  @IsUrl()
  tiktok?: string;

  @IsOptional()
  @IsUrl()
  youtube?: string;

  @IsOptional()
  @IsUrl()
  website?: string;
}

export class UpdateSocialLinksDto {
  @IsObject()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks: SocialLinksDto;
}

// ============================================
// STORE PAGE DTOs
// ============================================

export class CreateStorePageDto {
  @IsString()
  slug: string;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;
}

export class UpdateStorePageDto {
  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;
}

// ============================================
// STORE MENU DTOs
// ============================================

export class CreateStoreMenuDto {
  @IsString()
  label: string;

  @IsEnum(["page", "products", "services", "external", "custom"])
  type: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  pageSlug?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateStoreMenuDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsEnum(["page", "products", "services", "external", "custom"])
  type?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  pageSlug?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class BulkUpdateMenuOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuOrderItem)
  items: MenuOrderItem[];
}

class MenuOrderItem {
  @IsString()
  id: string;

  @IsNumber()
  sortOrder: number;

  @IsOptional()
  @IsString()
  parentId?: string;
}
