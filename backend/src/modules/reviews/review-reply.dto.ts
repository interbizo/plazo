import { IsString, MinLength, MaxLength } from "class-validator";

export class CreateReviewReplyDto {
  @IsString()
  reviewId: string;

  @IsString()
  @MinLength(1, { message: "Reply message cannot be empty" })
  @MaxLength(1000, { message: "Reply message cannot exceed 1000 characters" })
  message: string;
}
