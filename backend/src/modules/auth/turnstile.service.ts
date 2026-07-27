import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

interface CachedToken {
  timestamp: number;
  isValid: boolean;
}

@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);
  private readonly secretKey = process.env.TURNSTILE_SECRET_KEY?.trim() || '';
  private readonly verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
  
  // Token cache: Map<token, CachedToken>
  // Cache tokens for 30 seconds to prevent duplicate verifications
  private readonly tokenCache = new Map<string, CachedToken>();
  private readonly CACHE_TTL = 30000; // 30 seconds
  private readonly MAX_RETRIES = 2;
  private readonly INITIAL_RETRY_DELAY = 500; // 500ms

  /**
   * Verify Cloudflare Turnstile token with retry logic and caching
   * @param token - The Turnstile token from the client
   * @param remoteIp - Optional: The user's IP address
   * @returns Promise<boolean> - True if verification succeeds
   */
  async verifyToken(token: string, remoteIp?: string): Promise<boolean> {
    const startTime = Date.now();
    
    // Allow local development without Cloudflare keys, but never bypass production.
    if (!this.secretKey) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('TURNSTILE_SECRET_KEY is required in production');
        throw new BadRequestException('Turnstile verification is not configured');
      }

      this.logger.log('Turnstile verification skipped (non-production, no secret key)');
      return true;
    }

    if (!token) {
      this.logger.warn('Turnstile token is missing');
      throw new BadRequestException('Turnstile verification token is required');
    }

    // Check cache first
    const cached = this.getCachedToken(token);
    if (cached !== null) {
      const duration = Date.now() - startTime;
      this.logger.log(`Turnstile verification from cache (${duration}ms): ${cached ? 'valid' : 'invalid'}`);
      return cached;
    }

    // Verify with retry logic
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const result = await this.performVerification(token, remoteIp, attempt);
        const duration = Date.now() - startTime;
        
        // Cache the result
        this.cacheToken(token, result);
        
        this.logger.log(`Turnstile verification completed (${duration}ms, attempt ${attempt + 1}): ${result ? 'success' : 'failed'}`);
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on the last attempt
        if (attempt < this.MAX_RETRIES) {
          const delay = this.calculateRetryDelay(attempt);
          this.logger.warn(`Turnstile verification attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    const duration = Date.now() - startTime;
    this.logger.error(`Turnstile verification failed after ${this.MAX_RETRIES + 1} attempts (${duration}ms):`, lastError);
    
    // If Cloudflare is unreachable, we should fail closed (reject the request)
    throw new BadRequestException('Failed to verify Turnstile token. Please try again.');
  }

  /**
   * Perform a single verification attempt
   */
  private async performVerification(token: string, remoteIp?: string, attempt: number = 0): Promise<boolean> {
    const formData = new URLSearchParams();
    formData.append('secret', this.secretKey);
    formData.append('response', token);
    
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    try {
      const response = await axios.post<TurnstileVerifyResponse>(
        this.verifyUrl,
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 5000, // 5 seconds timeout (reduced from 10s)
        }
      );

      const { success, 'error-codes': errorCodes } = response.data;

      if (!success) {
        this.logger.warn(`Turnstile verification failed (attempt ${attempt + 1}): ${errorCodes?.join(', ')}`);
        return false;
      }

      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.code === 'ECONNABORTED') {
          throw new Error('Verification timeout');
        }
        if (axiosError.response?.status === 429) {
          throw new Error('Rate limit exceeded');
        }
      }
      throw error;
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateRetryDelay(attempt: number): number {
    return this.INITIAL_RETRY_DELAY * Math.pow(2, attempt);
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get cached token result if still valid
   */
  private getCachedToken(token: string): boolean | null {
    const cached = this.tokenCache.get(token);
    
    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.timestamp;
    
    if (age > this.CACHE_TTL) {
      // Cache expired, remove it
      this.tokenCache.delete(token);
      return null;
    }

    return cached.isValid;
  }

  /**
   * Cache token verification result
   */
  private cacheToken(token: string, isValid: boolean): void {
    this.tokenCache.set(token, {
      timestamp: Date.now(),
      isValid,
    });

    // Clean up old cache entries when exceeding limit
    if (this.tokenCache.size > 500) {
      this.cleanupCache();
    }
  }

  /**
   * Remove expired entries from cache
   */
  private cleanupCache(): void {
    const now = Date.now();
    const expiredTokens: string[] = [];

    for (const [token, cached] of this.tokenCache.entries()) {
      if (now - cached.timestamp > this.CACHE_TTL) {
        expiredTokens.push(token);
      }
    }

    expiredTokens.forEach(token => this.tokenCache.delete(token));
    
    if (expiredTokens.length > 0) {
      this.logger.debug(`Cleaned up ${expiredTokens.length} expired cache entries`);
    }
  }

  /**
   * Verify token and throw exception if invalid
   * @param token - The Turnstile token from the client
   * @param remoteIp - Optional: The user's IP address
   */
  async verifyOrThrow(token: string, remoteIp?: string): Promise<void> {
    const isValid = await this.verifyToken(token, remoteIp);
    
    if (!isValid) {
      throw new BadRequestException('Turnstile verification failed. Please try again.');
    }
  }
}
