import { IsOptional, IsString, IsEnum } from "class-validator";

export enum UploadCategory {
  PRODUCT_IMAGE = "PRODUCT_IMAGE",
  SERVICE_IMAGE = "SERVICE_IMAGE",
  AVATAR = "AVATAR",
  CV = "CV",
  PORTFOLIO = "PORTFOLIO",
  ATTACHMENT = "ATTACHMENT",
  BANNER = "BANNER",
  LOGO = "LOGO",
  ARTICLE_THUMBNAIL = "ARTICLE_THUMBNAIL",
}

export class UploadFileDto {
  @IsOptional()
  @IsEnum(UploadCategory)
  category?: UploadCategory;
}
