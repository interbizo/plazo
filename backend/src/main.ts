import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "@common/filters/all-exceptions.filter";
import { setupSwagger } from "./swagger";
import { PrismaService } from "@modules/database/prisma.service";
import * as path from "path";

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === "production";

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: (origin, callback) => {
        // Requests without an Origin header come from same-origin navigation,
        // server-to-server calls, health checks, curl, or mobile clients.
        // CORS is a browser boundary, so do not fail those requests.
        if (!origin) {
          return callback(null, true);
        }

        // Browsers can send the literal "null" origin for file://, sandboxed
        // iframes, and some opaque origins. Keep that blocked in production.
        if (origin === "null") {
          return callback(
            isProduction ? new Error("Not allowed by CORS") : null,
            !isProduction,
          );
        }

        const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [
          "http://localhost:3000",
          "http://localhost:3001",
          "https://plazo.id",
          "https://api.plazo.id",
          "https://ehftest.dev",
          "https://api.ehftest.dev",
        ];

        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Check wildcard patterns for subdomain support
        // Example: https://tokobudi.plazo.id
        const wildcardPatterns = [
          /^https?:\/\/[\w-]+\.localhost(:\d+)?$/, // *.localhost for local testing
          /^https:\/\/[\w-]+\.plazo\.id$/, // *.plazo.id (production)
          /^https:\/\/plazo\.id$/, // Main domain
          /^https:\/\/www\.plazo\.id$/, // WWW subdomain
          /^https:\/\/[\w-]+\.ehftest\.dev$/, // *.ehftest.dev (staging)
          /^https:\/\/[\w-]+\.plazo\.com$/, // *.plazo.com (legacy)
          /^https:\/\/plazo\.com$/, // Legacy domain
        ];

        const isWildcardMatch = wildcardPatterns.some((pattern) =>
          pattern.test(origin),
        );

        if (isWildcardMatch) {
          return callback(null, true);
        }

        // Reject other origins
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-tenant-subdomain"],
      // Increase max age for preflight cache to reduce OPTIONS requests
      maxAge: 86400, // 24 hours
    },
    // Increase body size limits
    bodyParser: true,
    // Use NestJS Logger instead of console in production
    logger: isProduction
      ? ["error", "warn", "log"]
      : ["error", "warn", "log", "debug", "verbose"],
  });

  // Trust reverse proxy (nginx, Cloudflare) for correct client IP in rate limiting
  if (isProduction) {
    app.set("trust proxy", 1);
  }

  // Response compression (gzip/brotli)
  app.use(compression());

  // Cache headers for public API endpoints (SEO performance)
  app.use('/api/public', (req: any, res: any, next: any) => {
    if (req.method === 'GET') {
      // Public marketplace data: cache 60s at edge, serve stale for 5min while revalidating
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=300');
      res.setHeader('Vary', 'Accept-Encoding, x-tenant-subdomain');
    }
    next();
  });

  // Serve uploaded files with aggressive caching (images are immutable after upload)
  const uploadDir =
    process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
  app.useStaticAssets(uploadDir, {
    prefix: "/uploads/",
    maxAge: 31536000000, // 1 year in ms (files are content-addressed UUIDs)
    immutable: true,
    etag: true,
    lastModified: true,
  });

  // Security - Helmet
  // Disable CSP for API server (CSP should be handled by frontend/nginx)
  // API endpoints don't serve HTML, so CSP is not needed here
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disable CSP for API
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  // Rate limiting — Auth endpoints (strict to prevent brute force)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // max 15 attempts per 15 minutes per IP
    message: "Terlalu banyak percobaan. Silakan coba lagi dalam 15 menit.",
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  });
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
  app.use("/api/auth/verify-email", authLimiter);
  app.use("/api/auth/refresh", authLimiter);

  // Rate limiting — Password reset (very strict)
  const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // max 5 attempts per 15 minutes
    message: "Terlalu banyak permintaan reset password. Silakan coba lagi nanti.",
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/auth/forgot-password", passwordResetLimiter);
  app.use("/api/auth/reset-password", passwordResetLimiter);

  // Rate limiting — Admin endpoints (controller path is "admin/", NOT "api/admin/")
  const adminLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120, // Increased from 60 to 120 to prevent blocking on frequent refreshes
    message: "Too many admin requests, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/admin", adminLimiter);

  // Rate limiting — Upload (stricter)
  const uploadLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // max 20 uploads per minute
    message: "Too many uploads, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/upload", uploadLimiter);

  // Rate limiting — Financial endpoints
  const financialLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: "Too many requests, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/orders", financialLimiter);
  app.use("/api/payment/proof", financialLimiter); // Only rate-limit proof upload, not account listing
  app.use("/api/reviews", financialLimiter);

  // Rate limiting — Strict financial (checkout, disputes)
  const strictFinancialLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: "Too many requests, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/disputes", strictFinancialLimiter);
  app.use("/cart/checkout", strictFinancialLimiter);

  // Global pipes & filters
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // Health check & robots.txt
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get("/", (_req: any, res: any) => {
    res.json({
      name: process.env.APP_NAME || "Plazo Marketplace SaaS",
      version: "1.0.0",
      status: "running",
      timestamp: new Date().toISOString(),
    });
  });
  
  // Health check endpoint for monitoring
  expressApp.get("/health", async (_req: any, res: any) => {
    try {
      // Check database connection
      const prisma = app.get(PrismaService);
      await prisma.$queryRaw`SELECT 1`;
      
      res.json({
        status: "healthy",
        database: "connected",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        database: "disconnected",
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  // robots.txt is handled dynamically by SeoController (subscription-based)
  // Do NOT add a static robots.txt route here

  // Set global prefix
  // NOTE: controllers already have 'api/' prefix where needed
  // app.setGlobalPrefix("api");

  // Swagger API Documentation (only in development)
  if (process.env.NODE_ENV !== "production") {
    setupSwagger(app);
  }

  const port = process.env.APP_PORT || 3001;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  if (!isProduction) {
    logger.log(`API Docs: http://localhost:${port}/api/docs`);
  }
  
  // Graceful shutdown handlers
  const gracefulShutdown = async (signal: string) => {
    logger.warn(`${signal} received. Starting graceful shutdown...`);
    
    try {
      // Stop accepting new connections
      await app.close();
      logger.log('HTTP server closed');
      
      // Give ongoing requests time to complete (max 10 seconds)
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      logger.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

// Global error handlers to prevent crashes
const globalLogger = new Logger('Process');

process.on('unhandledRejection', (reason, promise) => {
  globalLogger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

process.on('uncaughtException', (error) => {
  globalLogger.error('Uncaught Exception:', error);
});

bootstrap().catch((error) => {
  const startupLogger = new Logger('Startup');
  startupLogger.error('Failed to start application:', error);
  process.exit(1);
});
