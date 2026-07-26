import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  IsEnum,
  Min,
  Max,
  MinLength,
  MaxLength,
} from "class-validator";
import { StoreDisplayMode } from "@prisma/client";

export class UpdateSellerProfileDto {
  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsString()
  certifications?: string;

  @IsOptional()
  @IsString()
  portfolio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  portfolioFiles?: string[];

  @IsOptional()
  @IsString()
  cvUrl?: string;

  @IsOptional()
  @IsString()
  cvFileName?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  linkedin?: string;

  @IsOptional()
  @IsString()
  github?: string;
}

export class SellerDashboardQueryDto {
  @IsOptional()
  @IsString()
  period?: "7d" | "30d" | "90d" | "1y";
}

// ============ PORTFOLIO ============

export class AddPortfolioItemDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdatePortfolioItemDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

// ============ STORE SETTINGS (Full CMS) ============

export class UpdateStoreSettingsDto {
  // Basic Info
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(300, { message: 'Deskripsi minimal 300 karakter untuk SEO yang baik' })
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  tagline?: string;

  // Media
  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  banner?: string;

  @IsOptional()
  @IsString()
  favicon?: string;

  // Contact
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
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  // Theme
  @IsOptional()
  @IsString()
  themeColor?: string;

  @IsOptional()
  @IsString()
  themeSecondary?: string;

  @IsOptional()
  @IsString()
  themePreset?: string;

  @IsOptional()
  @IsString()
  themeFontFamily?: string;

  @IsOptional()
  @IsString()
  themeBorderRadius?: string;

  @IsOptional()
  @IsString()
  themeShadowStyle?: string;

  // Social Links: {instagram, facebook, twitter, tiktok, youtube, website}
  @IsOptional()
  socialLinks?: Record<string, string>;

  // Announcement
  @IsOptional()
  @IsString()
  @MaxLength(500)
  storeAnnouncement?: string;

  // Display Mode
  @IsOptional()
  @IsEnum(StoreDisplayMode)
  displayMode?: StoreDisplayMode;

  // SEO
  @IsOptional()
  @IsString()
  @MaxLength(70)
  metaTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaDescription?: string;

  @IsOptional()
  @IsString()
  metaKeywords?: string;

  @IsOptional()
  @IsString()
  ogImage?: string;

  // Policies (HTML)
  @IsOptional()
  @IsString()
  returnPolicy?: string;

  @IsOptional()
  @IsString()
  shippingPolicy?: string;

  @IsOptional()
  @IsString()
  termsOfService?: string;

  @IsOptional()
  @IsString()
  privacyPolicy?: string;

  // Store Hours
  @IsOptional()
  storeHours?: Record<string, any>;

  // Pinned items
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pinnedProductIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pinnedServiceIds?: string[];
}

// ============ STORE PAGE CMS ============

export class CreateStorePageDto {
  @IsString()
  @MaxLength(100)
  slug: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
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
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
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

// ============ REVIEW RESPONSE ============

export class RespondToReviewDto {
  @IsString()
  response: string;
}

// ============ STORE MENU ============

export class CreateStoreMenuDto {
  @IsString()
  @MaxLength(50)
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
  @MaxLength(50)
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
