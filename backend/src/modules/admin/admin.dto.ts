import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  Min,
  MinLength,
  MaxLength,
  IsDateString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { UserRole, OrderStatus, SubscriptionPlan, PackageTier } from "@prisma/client";
import {
  CreateProductDto,
  UpdateProductDto,
} from "@modules/marketplace/products/products.dto";
import {
  CreateServiceDto,
  UpdateServiceDto,
} from "@modules/marketplace/services/services.dto";

// ============ USER MANAGEMENT ============

export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isEmailVerified?: boolean;
}

export class AdminCreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEnum(UserRole)
  role: UserRole;
}

export class AdminListUsersQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============ TENANT MANAGEMENT ============

export class AdminUpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  subscriptionPlan?: string;

  @IsOptional()
  @IsNumber()
  postsLimit?: number;
}

// ============ MODERATION ============

export class AdminModerateListingDto {
  @IsBoolean()
  isPublished: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdminCreateInternalProductDto extends CreateProductDto {}

export class AdminUpdateInternalProductDto extends UpdateProductDto {}

export class AdminInternalServicePackageDto {
  @IsEnum(PackageTier)
  tier: PackageTier;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(1)
  price: number;

  @IsNumber()
  @Min(1)
  deliveryDays: number;

  @IsNumber()
  @Min(0)
  revisions: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];
}

export class AdminCreateInternalServiceDto extends CreateServiceDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminInternalServicePackageDto)
  packages?: AdminInternalServicePackageDto[];
}

export class AdminUpdateInternalServiceDto extends UpdateServiceDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminInternalServicePackageDto)
  packages?: AdminInternalServicePackageDto[];
}

// ============ SYSTEM NOTIFICATION ============

export class AdminBroadcastNotificationDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsEnum(UserRole)
  targetRole?: UserRole;
}

// ============ KYC MANAGEMENT ============

export class AdminReviewKycDto {
  @IsIn(['approve', 'reject'])
  action: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

// ============ WITHDRAWAL MANAGEMENT ============

export class AdminProcessWithdrawalDto {
  @IsIn(['approve', 'reject'])
  action: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

// ============ FEATURED STORE MANAGEMENT ============

export class AdminFeatureStoreDto {
  @IsBoolean()
  isFeatured: boolean;

  @IsOptional()
  @IsNumber()
  featuredOrder?: number;
}

export class AdminVerifyStoreDto {
  @IsBoolean()
  isVerified: boolean;
}

// ============ DISPUTE MANAGEMENT ============

export class AdminResolveDisputeDto {
  @IsIn(['buyer', 'seller'])
  resolution: string;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}

// ============ REPORT MANAGEMENT ============

export class AdminResolveReportDto {
  @IsString()
  action: string; // 'resolve' | 'dismiss'

  @IsOptional()
  @IsString()
  adminNotes?: string;
}

// ============ CATEGORY MANAGEMENT ============

export class AdminCreateCategoryDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AdminUpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============ JOB MODERATION ============

export class AdminModerateJobDto {
  @IsString()
  status: string; // 'OPEN' | 'CANCELLED'

  @IsOptional()
  @IsString()
  reason?: string;
}

// ============ REVIEW MODERATION ============

export class AdminDeleteReviewDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

// ============ SUBSCRIPTION MANAGEMENT ============

export class AdminUpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  subscriptionPlan?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsNumber()
  postsLimit?: number;
}

// ============ SELLER LEVEL MANAGEMENT ============

export class AdminSetSellerLevelDto {
  @IsString()
  level: string; // 'NEW' | 'LEVEL_1' | 'LEVEL_2' | 'TOP_RATED'
}

// ============ BOOST MANAGEMENT ============

export class AdminBoostListingDto {
  @IsString()
  type: string; // 'product' | 'service' | 'job'

  @IsString()
  listingId: string;

  @IsNumber()
  @Min(1)
  days: number;
}

export class AdminRemoveBoostDto {
  @IsString()
  type: string; // 'product' | 'service' | 'job'

  @IsString()
  listingId: string;
}

// ============ PROMOTION / COUPON ============

export class AdminCreatePromotionDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsNumber()
  value: number;

  @IsOptional()
  @IsNumber()
  minOrderAmount?: number;

  @IsOptional()
  @IsNumber()
  maxDiscount?: number;

  @IsOptional()
  @IsNumber()
  usageLimit?: number;

  @IsOptional()
  @IsNumber()
  perUserLimit?: number;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  applicableTo?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

export class AdminUpdatePromotionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsNumber()
  usageLimit?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// ============ CHANGE USER ROLE ============

export class ChangeUserRoleDto {
  @IsIn(["BUYER", "SELLER", "ADMIN"])
  role: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

// ============ CHANGE TENANT PLAN ============

export class ChangeTenantPlanDto {
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

// ============ BULK ACTIONS ============

export class AdminBulkUserActionDto {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @IsIn(['ban', 'unban', 'activate', 'deactivate', 'delete'])
  action: string;
}
