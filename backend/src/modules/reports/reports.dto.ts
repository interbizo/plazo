import { IsString, IsOptional, IsArray } from "class-validator";

export class CreateReportDto {
  @IsString()
  targetType: string; // "user", "product", "service", "job", "review", "general"

  @IsOptional()
  @IsString()
  targetId?: string;

  @IsOptional()
  @IsString()
  targetUserId?: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence?: string[];
}

export class CreateReportMessageDto {
  @IsString()
  message: string;
}

export class AdminResolveReportDto {
  @IsString()
  action: "resolve" | "dismiss";

  @IsOptional()
  @IsString()
  adminNotes?: string;
}
