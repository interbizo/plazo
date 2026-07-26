import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsInt,
} from "class-validator";
import { Type } from "class-transformer";

export class BuyerDashboardQueryDto {
  @IsOptional()
  @IsString()
  period?: string; // 7d, 30d, 90d, 1y
}

export class BuyerUpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  whatsappNumber?: string;
}

export class BuyerListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sort?: string; // newest, oldest, price_asc, price_desc
}

export class BuyerReviewDto {
  @IsString()
  orderId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class BuyerReportDto {
  @IsString()
  targetId: string;

  @IsString()
  targetType: string; // user, product, service, order

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  description?: string;
}
