import { IsString, IsOptional, IsNumber, IsArray } from "class-validator";

export class CreateDisputeDto {
  @IsString()
  orderId: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence?: string[];
}

export class ResolveDisputeDto {
  @IsString()
  decision: "BUYER_WIN" | "SELLER_WIN" | "PARTIAL";

  @IsString()
  resolution: string; // Explanation of the decision

  @IsOptional()
  @IsString()
  adminNotes?: string;

  @IsOptional()
  @IsNumber()
  refundAmount?: number; // Required for BUYER_WIN and PARTIAL
}
