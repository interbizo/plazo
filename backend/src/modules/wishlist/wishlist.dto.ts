import { IsString, IsOptional } from "class-validator";

export class AddWishlistDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  serviceId?: string;
}
