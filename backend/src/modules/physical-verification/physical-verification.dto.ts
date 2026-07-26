import { IsString, IsOptional, IsDateString, IsArray, IsEnum, MaxLength } from "class-validator";

export enum PhysicalVerificationStatus {
  NOT_REQUESTED = "NOT_REQUESTED",
  PENDING = "PENDING",
  SCHEDULED = "SCHEDULED",
  IN_PROGRESS = "IN_PROGRESS",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export class RequestPhysicalVerificationDto {
  @IsString()
  @MaxLength(200)
  businessName: string;

  @IsString()
  @MaxLength(500)
  businessAddress: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  businessPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  requestNotes?: string;
}

export class ScheduleVisitDto {
  @IsDateString()
  scheduledDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UploadVisitPhotosDto {
  @IsArray()
  @IsString({ each: true })
  visitPhotos: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class ApproveVerificationDto {
  @IsString()
  @MaxLength(2000)
  verificationNotes: string;

  @IsOptional()
  @IsDateString()
  visitedDate?: string;
}

export class RejectVerificationDto {
  @IsString()
  @MaxLength(2000)
  rejectionReason: string;
}

export class UploadCertificateDto {
  @IsString()
  certificateUrl: string;
}
