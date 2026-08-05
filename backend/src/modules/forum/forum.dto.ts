import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class ForumPostListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(["recent", "popular"])
  sort?: "recent" | "popular";
}

export class ForumLikedPostQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  postIds?: string;
}

export class CreateForumPostDto {
  @IsString()
  @MaxLength(160)
  title: string;

  @IsString()
  @MaxLength(5000)
  content: string;
}

export class UpdateForumPostDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;
}

export class CreateForumCommentDto {
  @IsString()
  @MaxLength(2000)
  content: string;
}

export class UpdateForumCommentDto {
  @IsString()
  @MaxLength(2000)
  content: string;
}

export class BulkRemoveForumPostsDto {
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  postIds: string[];
}

export class UpdateForumModerationSettingsDto {
  @IsOptional()
  @IsBoolean()
  isAntiSpamEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  rateLimitWindowMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  postLimitPerWindow?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  commentLimitPerWindow?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  duplicateWindowMinutes?: number;
}

export class CreateForumStrikeDto {
  @IsString()
  userId: string;
  
  @IsString()
  @MaxLength(500)
  reason: string;

  @IsOptional()
  @IsString()
  postId?: string;

  @IsOptional()
  @IsString()
  commentId?: string;
}
