import { IsEnum, IsBoolean, IsString, IsNumber, IsOptional, IsArray, IsNotEmpty, Min, Max, IsIn } from "class-validator";
import { SubscriptionPlan } from "@prisma/client";

export class ChangePlanDto {
  @IsEnum(SubscriptionPlan, { message: "Plan harus salah satu dari: FREE, BASIC, PREMIUM, PROFESSIONAL, ENTERPRISE, ULTIMATE" })
  plan: SubscriptionPlan;
}

export class UpdateAutoRenewDto {
  @IsBoolean()
  autoRenew: boolean;
}

export class CreatePlanConfigDto {
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  badge?: string;

  @IsNumber()
  @Min(0)
  monthlyPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  yearlyPrice?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsNumber()
  @Min(1)
  postsLimit: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxImagesPerPost?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxFileSize?: number;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Feature flags
  @IsOptional() @IsBoolean() canPublishToMarketplace?: boolean;
  @IsOptional() @IsBoolean() canVerifiedBadge?: boolean;
  @IsOptional() @IsBoolean() canFeaturedStore?: boolean;
  @IsOptional() @IsBoolean() canHighlightProducts?: boolean;
  @IsOptional() @IsBoolean() canPriorityListing?: boolean;
  @IsOptional() @IsBoolean() canAdvancedAnalytics?: boolean;
  @IsOptional() @IsBoolean() canBulkUpload?: boolean;
  @IsOptional() @IsBoolean() canExportData?: boolean;
  @IsOptional() @IsBoolean() canFlashSale?: boolean;
  @IsOptional() @IsBoolean() canCustomTheme?: boolean;
  @IsOptional() @IsBoolean() canRemoveBranding?: boolean;
  @IsOptional() @IsBoolean() canRequestPhysicalVerification?: boolean;
  @IsOptional() @IsBoolean() canSubmitProposal?: boolean;
  @IsOptional() @IsBoolean() canWhatsappCheckout?: boolean;
  @IsOptional() @IsBoolean() canToolsRecommendation?: boolean;
  @IsOptional() @IsBoolean() canBecomeAffiliate?: boolean;
  @IsOptional() @IsBoolean() canBoostListing?: boolean;

  @IsOptional()
  @IsArray()
  features?: string[];
}

export class UpdatePlanConfigDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() badge?: string;
  @IsOptional() @IsNumber() @Min(0) monthlyPrice?: number;
  @IsOptional() @IsNumber() @Min(0) yearlyPrice?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsNumber() @Min(1) postsLimit?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(20) maxImagesPerPost?: number;
  @IsOptional() @IsNumber() @Min(1) maxFileSize?: number;
  @IsOptional() @IsNumber() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;

  // Feature flags
  @IsOptional() @IsBoolean() canPublishToMarketplace?: boolean;
  @IsOptional() @IsBoolean() canVerifiedBadge?: boolean;
  @IsOptional() @IsBoolean() canFeaturedStore?: boolean;
  @IsOptional() @IsBoolean() canHighlightProducts?: boolean;
  @IsOptional() @IsBoolean() canPriorityListing?: boolean;
  @IsOptional() @IsBoolean() canAdvancedAnalytics?: boolean;
  @IsOptional() @IsBoolean() canBulkUpload?: boolean;
  @IsOptional() @IsBoolean() canExportData?: boolean;
  @IsOptional() @IsBoolean() canFlashSale?: boolean;
  @IsOptional() @IsBoolean() canCustomTheme?: boolean;
  @IsOptional() @IsBoolean() canRemoveBranding?: boolean;
  @IsOptional() @IsBoolean() canRequestPhysicalVerification?: boolean;
  @IsOptional() @IsBoolean() canSubmitProposal?: boolean;
  @IsOptional() @IsBoolean() canWhatsappCheckout?: boolean;
  @IsOptional() @IsBoolean() canToolsRecommendation?: boolean;
  @IsOptional() @IsBoolean() canBecomeAffiliate?: boolean;
  @IsOptional() @IsBoolean() canBoostListing?: boolean;

  @IsOptional() @IsArray() features?: string[];
}

export class CreateAffiliateClaimDto {
  @IsString()
  @IsNotEmpty()
  bankAccountName: string;

  @IsString()
  @IsNotEmpty()
  bankAccountNumber: string;

  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAffiliateCityDto {
  @IsBoolean()
  isCitySpecial: boolean;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReviewAffiliateClaimDto {
  @IsIn(["APPROVED", "REJECTED", "PAID"])
  status: "APPROVED" | "REJECTED" | "PAID";

  @IsOptional()
  @IsString()
  adminNotes?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  paymentProofUrl?: string; // Bukti transfer untuk status PAID
}

// ============ PLATFORM PAYMENT ACCOUNTS ============

export class CreatePlatformPaymentAccountDto {
  @IsIn(["BANK_TRANSFER", "E_WALLET"])
  type: "BANK_TRANSFER" | "E_WALLET";

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsString()
  accountNumber: string;

  @IsString()
  accountName: string;

  @IsOptional()
  @IsString()
  walletType?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdatePlatformPaymentAccountDto {
  @IsOptional()
  @IsIn(["BANK_TRANSFER", "E_WALLET"])
  type?: "BANK_TRANSFER" | "E_WALLET";

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsString()
  walletType?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class SearchAffiliatorsDto {
  @IsOptional()
  @IsString()
  search?: string; // Search by name, email, or tenant ID

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsIn(["createdAt", "name", "subscriptionPlan"])
  sortBy?: "createdAt" | "name" | "subscriptionPlan";

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc";
}
