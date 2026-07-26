import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from "@nestjs/common";

interface TurnstileResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
}

@Injectable()
export class CaptchaGuard implements CanActivate {
  private readonly logger = new Logger(CaptchaGuard.name);
  private readonly verifyUrl =
    "https://challenges.cloudflare.com/turnstile/v0/siteverify";

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    // Skip verification in dev mode when secret key is not configured
    if (!secretKey) {
      this.logger.warn(
        "TURNSTILE_SECRET_KEY not set — CAPTCHA verification skipped (dev mode)",
      );
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const captchaToken: string | undefined = request.body?.captchaToken;

    if (!captchaToken) {
      throw new ForbiddenException("CAPTCHA token is required");
    }

    const remoteIp =
      request.headers["cf-connecting-ip"] ||
      request.headers["x-forwarded-for"] ||
      request.ip;

    try {
      const response = await fetch(this.verifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: secretKey,
          response: captchaToken,
          remoteip: typeof remoteIp === "string" ? remoteIp : "",
        }),
      });

      const result = (await response.json()) as TurnstileResponse;

      if (!result.success) {
        this.logger.warn(
          `CAPTCHA verification failed: ${result["error-codes"]?.join(", ") || "unknown error"}`,
        );
        throw new ForbiddenException(
          "CAPTCHA verification failed. Please try again.",
        );
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error("CAPTCHA verification request failed", error);
      throw new ForbiddenException(
        "CAPTCHA verification service unavailable. Please try again later.",
      );
    }
  }
}
