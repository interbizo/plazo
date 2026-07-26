import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsEnum,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { PackageTier } from "@prisma/client";

export class CreateServicePackageDto {
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

export class UpdateServicePackageDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  deliveryDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  revisions?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];
}

export class BulkCreatePackagesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateServicePackageDto)
  packages: CreateServicePackageDto[];
}
