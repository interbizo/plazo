import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private isShuttingDown = false;

  constructor() {
    const isProduction = process.env.NODE_ENV === "production";
    
    // Environment-specific connection pool settings
    const connectionLimit = parseInt(
      process.env.DB_CONNECTION_LIMIT || (isProduction ? "50" : "20")
    );
    const connectTimeout = parseInt(
      process.env.DB_CONNECT_TIMEOUT || (isProduction ? "15000" : "10000")
    );
    const poolTimeout = parseInt(
      process.env.DB_POOL_TIMEOUT || (isProduction ? "30000" : "20000")
    );
    const queryTimeout = parseInt(
      process.env.DB_QUERY_TIMEOUT || (isProduction ? "60000" : "30000")
    );

    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: isProduction 
        ? ["error"] 
        : ["query", "warn", "error"],
      // Note: Prisma connection pooling is configured via DATABASE_URL
      // Example: postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=20
    });

    // Handle connection errors gracefully
    this.$on('error' as never, (e: any) => {
      this.logger.error('Prisma Client Error:', e);
      
      // In production, send to monitoring service (Sentry, DataDog, etc)
      if (isProduction && process.env.SENTRY_DSN) {
        // TODO: Send to Sentry
        // Sentry.captureException(e);
      }
    });

    this.logger.log(`Database configured with connection pooling via URL parameters`);
  }

  async onModuleInit() {
    let retries = 5;
    let connected = false;

    while (retries > 0 && !connected) {
      try {
        await this.$connect();
        this.logger.log("Database connected successfully");
        connected = true;

        // Test connection with a simple query
        await this.$queryRaw`SELECT 1`;
        this.logger.log("Database connection verified");
      } catch (error) {
        retries--;
        this.logger.error(
          `Database connection failed. Retries left: ${retries}`,
          error,
        );

        if (retries > 0) {
          // Wait before retrying (exponential backoff)
          const waitTime = (6 - retries) * 2000;
          this.logger.log(`Retrying in ${waitTime / 1000} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        } else {
          this.logger.error("Failed to connect to database after all retries");
          throw error;
        }
      }
    }

    // Set up periodic connection health check
    this.setupHealthCheck();
  }

  async onModuleDestroy() {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    this.logger.log("Gracefully disconnecting from database...");

    try {
      // Wait a bit for ongoing queries to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await this.$disconnect();
      this.logger.log("Database disconnected successfully");
    } catch (error) {
      this.logger.error("Error during database disconnect:", error);
    }
  }

  /**
   * Set up periodic health check to ensure connection is alive
   */
  private setupHealthCheck() {
    const isProduction = process.env.NODE_ENV === "production";
    // Check connection every 30 seconds in dev, 60 seconds in production
    const interval = isProduction ? 60000 : 30000;
    
    setInterval(async () => {
      if (this.isShuttingDown) {
        return;
      }

      try {
        await this.$queryRaw`SELECT 1`;
        // Only log in development to reduce noise
        if (!isProduction) {
          this.logger.debug("Database health check: OK");
        }
      } catch (error) {
        this.logger.error("Database health check failed:", error);
        
        // In production, alert monitoring service
        if (isProduction && process.env.SENTRY_DSN) {
          // TODO: Send alert to monitoring
          // Sentry.captureMessage('Database health check failed', 'error');
        }
        
        // Try to reconnect
        try {
          await this.$disconnect();
          await this.$connect();
          this.logger.log("Database reconnected after health check failure");
        } catch (reconnectError) {
          this.logger.error("Failed to reconnect database:", reconnectError);
          
          // Critical error - notify immediately in production
          if (isProduction) {
            // TODO: Send critical alert
            // Sentry.captureException(reconnectError, { level: 'fatal' });
          }
        }
      }
    }, interval);
  }

  /**
   * Execute query with automatic retry on connection errors
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Check if it's a connection error
        const isConnectionError =
          error.code === "P1001" || // Can't reach database server
          error.code === "P1002" || // Database server timeout
          error.code === "P1008" || // Operations timed out
          error.code === "P1017" || // Server has closed the connection
          error.message?.includes("Connection") ||
          error.message?.includes("ECONNREFUSED") ||
          error.message?.includes("ETIMEDOUT");

        if (isConnectionError && attempt < maxRetries) {
          this.logger.warn(
            `Database operation failed (attempt ${attempt}/${maxRetries}), retrying...`,
            error.message,
          );

          // Exponential backoff
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise((resolve) => setTimeout(resolve, waitTime));

          // Try to reconnect
          try {
            await this.$disconnect();
            await this.$connect();
          } catch (reconnectError) {
            this.logger.error("Reconnection failed:", reconnectError);
          }
        } else {
          throw error;
        }
      }
    }

    throw lastError;
  }
}
