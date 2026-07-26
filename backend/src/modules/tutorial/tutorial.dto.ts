import { IsString, IsOptional, IsBoolean, IsEnum, IsInt, Min, MaxLength } from "class-validator";
import { Type, Transform } from "class-transformer";

export enum TutorialCategory {
  GETTING_STARTED = "GETTING_STARTED",
  SELLER_GUIDE = "SELLER_GUIDE",
  BUYER_GUIDE = "BUYER_GUIDE",
  FEATURES = "FEATURES",
  PAYMENT = "PAYMENT",
  SHIPPING = "SHIPPING",
  TROUBLESHOOTING = "TROUBLESHOOTING",
  FAQ = "FAQ",
  OTHER = "OTHER",
}

export enum TutorialTargetRole {
  ALL = "ALL",
  BUYER = "BUYER",
  SELLER = "SELLER",
}

export class GetTutorialsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsEnum(TutorialCategory)
  category?: TutorialCategory;

  @IsOptional()
  @Transform(({ value }) => {
    // Handle case-insensitive enum values
    if (typeof value === 'string') {
      const upperValue = value.toUpperCase();
      if (Object.values(TutorialTargetRole).includes(upperValue as TutorialTargetRole)) {
        return upperValue;
      }
    }
    return value;
  })
  @IsEnum(TutorialTargetRole)
  targetRole?: TutorialTargetRole;

  @IsOptional()
  @IsString()
  search?: string;
}

export class GetFeaturedTutorialsQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    // Handle case-insensitive enum values
    if (typeof value === 'string') {
      const upperValue = value.toUpperCase();
      if (Object.values(TutorialTargetRole).includes(upperValue as TutorialTargetRole)) {
        return upperValue;
      }
    }
    return value;
  })
  @IsEnum(TutorialTargetRole)
  targetRole?: TutorialTargetRole;
}

export class CreateTutorialDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  content: string;

  @IsEnum(TutorialCategory)
  category: TutorialCategory;

  @IsEnum(TutorialTargetRole)
  targetRole: TutorialTargetRole;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  metaTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaDescription?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

export class UpdateTutorialDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(TutorialCategory)
  category?: TutorialCategory;

  @IsOptional()
  @IsEnum(TutorialTargetRole)
  targetRole?: TutorialTargetRole;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  metaTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaDescription?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
