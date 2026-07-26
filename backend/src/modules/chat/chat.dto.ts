import { IsString, IsOptional, IsArray, IsNumber, MaxLength } from "class-validator";

export class SendMessageDto {
  @IsString()
  roomId: string;

  @IsString()
  @MaxLength(2000)
  text: string;

  @IsOptional()
  @IsArray()
  attachments?: string[];
}

export class GetMessagesDto {
  @IsString()
  roomId: string;

  page?: number;
  limit?: number;
}

export class OpenChatRoomDto {
  @IsString()
  tenantId: string;

  @IsString()
  targetUserId: string;

  // Item context IDs
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsOptional()
  @IsString()
  jobId?: string;

  // Item details untuk template pesan
  @IsOptional()
  @IsString()
  itemTitle?: string;

  @IsOptional()
  @IsString()
  itemDescription?: string;

  // Product-specific details
  @IsOptional()
  @IsString()
  variantName?: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  price?: number;

  // Service-specific details
  @IsOptional()
  @IsString()
  packageTier?: string;

  @IsOptional()
  @IsString()
  packageTitle?: string;

  @IsOptional()
  @IsNumber()
  packagePrice?: number;

  @IsOptional()
  @IsString()
  packageDescription?: string;
}
