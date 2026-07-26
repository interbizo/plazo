import { IsString, IsNumber, IsOptional, IsArray, Min, MaxLength } from "class-validator";

export class CreateProposalDto {
  @IsString()
  jobId: string;

  @IsNumber()
  @Min(0)
  bidPrice: number;

  @IsString()
  @MaxLength(5000)
  message: string;

  @IsOptional()
  @IsArray()
  attachments?: string[];
}

export class UpdateProposalDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  bidPrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;

  @IsOptional()
  @IsArray()
  attachments?: string[];
}
