import { IsString, IsNumber, IsOptional, Min } from "class-validator";

export class CreateCustomOfferDto {
  @IsString()
  buyerId: string;

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
  @IsString()
  chatRoomId?: string;
}
