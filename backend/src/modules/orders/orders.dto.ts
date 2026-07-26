import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  Min,
  MaxLength,
} from "class-validator";
import { PackageTier, OrderStatus } from "@prisma/client";

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  proposalId?: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  deliveryDeadline?: Date;

  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsOptional()
  @IsEnum(PackageTier)
  packageTier?: PackageTier;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}

// Order Delivery
export class SubmitDeliveryDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  files?: string[];
}

export class RespondDeliveryDto {
  @IsString()
  action: "accept" | "request_revision";

  @IsOptional()
  @IsString()
  message?: string; // Response message from buyer

  @IsOptional()
  @IsString()
  revisionNote?: string;
}

// Cancellation
export class RequestCancellationDto {
  @IsString()
  reason: string;
}

export class RespondCancellationDto {
  @IsString()
  action: "accept" | "decline";

  @IsOptional()
  @IsString()
  declineReason?: string;
}

// Extension
export class RequestExtensionDto {
  @IsNumber()
  @Min(1)
  extraDays: number;

  @IsString()
  reason: string;
}

export class RespondExtensionDto {
  @IsString()
  action: "accept" | "decline";
}

// Milestones
export class CreateMilestoneDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  dueDate?: Date;
}
