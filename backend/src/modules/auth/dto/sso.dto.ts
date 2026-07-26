import { IsString, IsUrl, IsOptional } from "class-validator";

/**
 * DTO for SSO login redirect
 */
export class SsoLoginDto {
  @IsString()
  @IsOptional()
  returnUrl?: string;
}

/**
 * DTO for SSO callback
 */
export class SsoCallbackDto {
  @IsString()
  token: string;

  @IsString()
  @IsOptional()
  returnUrl?: string;
}

/**
 * DTO for validating return URL
 */
export class ValidateReturnUrlDto {
  @IsUrl()
  returnUrl: string;
}
