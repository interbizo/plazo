import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsBoolean,
  Min,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class UploadPaymentProofDto {
  @IsString()
  orderId: string;

  @IsString()
  imageUrl: string;

  @IsNumber()
  amount: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsDateString()
  transactionDate?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;
}

export class VerifyPaymentProofDto {
  @IsEnum(['VERIFY', 'REJECT'])
  action: 'VERIFY' | 'REJECT';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class RequestWithdrawalDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  accountRef: string;
}

// ============ PAYMENT ACCOUNT CRUD ============

export class CreatePaymentAccountDto {
  @IsEnum(PaymentMethod)
  type: PaymentMethod;

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
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class UpdatePaymentAccountDto {
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
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
