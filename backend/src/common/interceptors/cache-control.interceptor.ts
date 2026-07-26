import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Reflector } from "@nestjs/core";

export const CACHE_TTL_KEY = "cache_ttl";

/**
 * Decorator to set Cache-Control header on specific endpoints.
 * Usage: @CacheResponse(60) // 60 seconds
 */
export const CacheResponse = (ttlSeconds: number) =>
  SetMetadata(CACHE_TTL_KEY, ttlSeconds);

/**
 * Interceptor that adds Cache-Control headers to responses.
 * Only applies to GET requests with @CacheResponse decorator.
 * Helps SEO crawlers and CDNs cache public content.
 */
@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ttl = this.reflector.getAllAndOverride<number>(CACHE_TTL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!ttl) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Only cache GET requests
    if (request.method !== "GET") {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        response.setHeader(
          "Cache-Control",
          `public, max-age=${ttl}, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`,
        );
      }),
    );
  }
}
