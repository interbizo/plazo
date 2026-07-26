import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  Min,
  Max,
  MaxLength,
  ArrayMaxSize,
} from "class-validator";

export class CreateReviewDto {
  @IsOptional()
  @IsString()
  orderId?: string; // Optional — transaksi internal dihapus

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsOptional()
  @IsString()
  sellerId?: string; // Untuk review langsung ke seller tanpa order

  @IsOptional()
  @IsString()
  chatTransactionId?: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  images?: string[];
}
