import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, IsEnum, IsIn } from 'class-validator';
import { SubscriptionPlan } from '@prisma/client';

export class CreateSubscriptionPaymentDto {
  @IsEnum(SubscriptionPlan)
  @IsNotEmpty()
  plan: SubscriptionPlan;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsNumber()
  @IsOptional()
  durationDays?: number; // 30 for monthly, 365 for yearly

  @IsString()
  @IsNotEmpty()
  proofImageUrl: string;

  @IsString()
  @IsOptional()
  accountName?: string;

  @IsString()
  @IsOptional()
  accountNumber?: string;

  @IsDateString()
  @IsOptional()
  transferDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  referralCode?: string;
}

export class ReviewSubscriptionPaymentDto {
  @IsIn(['APPROVED', 'REJECTED'])
  @IsNotEmpty()
  status: 'APPROVED' | 'REJECTED';

  @IsString()
  @IsOptional()
  reviewNotes?: string;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
