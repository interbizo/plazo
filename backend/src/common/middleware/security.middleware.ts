/**
 * Production Security Middleware
 * 
 * Additional security measures for production environment
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  // Track suspicious activity
  private suspiciousIPs = new Map<string, { count: number; lastSeen: number }>();

  use(req: Request, res: Response, next: NextFunction) {
    if (!this.isProduction) {
      return next();
    }

    // Get client IP
    const clientIP = this.getClientIP(req);

    // Security headers (additional to helmet)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Remove sensitive headers
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    // Check for suspicious patterns
    if (this.isSuspiciousRequest(req, clientIP)) {
      this.logger.warn(`Suspicious request from ${clientIP}: ${req.method} ${req.path}`);
      
      // Log to monitoring service
      if (process.env.SENTRY_DSN) {
        // TODO: Send to Sentry
        // Sentry.captureMessage(`Suspicious request from ${clientIP}`, 'warning');
      }

      // Rate limit suspicious IPs more aggressively
      const record = this.suspiciousIPs.get(clientIP) || { count: 0, lastSeen: 0 };
      record.count++;
      record.lastSeen = Date.now();
      this.suspiciousIPs.set(clientIP, record);

      // Block if too many suspicious requests
      if (record.count > 10) {
        this.logger.error(`Blocking suspicious IP: ${clientIP}`);
        return res.status(403).json({
          statusCode: 403,
          message: 'Access denied',
        });
      }
    }

    // Clean up old records every hour
    if (Math.random() < 0.001) {
      this.cleanupSuspiciousIPs();
    }

    next();
  }

  private getClientIP(req: Request): string {
    // Check various headers for real IP (behind proxy/load balancer)
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  private isSuspiciousRequest(req: Request, clientIP: string): boolean {
    const path = req.path.toLowerCase();
    const userAgent = req.headers['user-agent']?.toLowerCase() || '';

    // Skip user-agent check for public API routes (SSR, curl, etc.)
    const isPublicRoute = path.startsWith('/api/public') || 
                          path.startsWith('/api/categories') ||
                          path.startsWith('/health') ||
                          path === '/';

    // Check for common attack patterns
    const suspiciousPatterns = [
      // SQL injection attempts
      /(\bor\b|\band\b).*=.*('|")/i,
      /union.*select/i,
      /drop.*table/i,
      
      // XSS attempts
      /<script/i,
      /javascript:/i,
      /onerror=/i,
      
      // Path traversal
      /\.\.\//,
      /\.\.%2f/i,
      
      // Command injection
      /;.*\|/,
      /&&/,
      
      // Common exploit paths
      /\/admin\/phpmyadmin/i,
      /\/wp-admin/i,
      /\/\.env/i,
      /\/\.git/i,
    ];

    // Check URL and query parameters
    const fullUrl = req.originalUrl || req.url;
    if (suspiciousPatterns.some(pattern => pattern.test(fullUrl))) {
      return true;
    }

    // Check for missing or suspicious user agent (skip for public routes)
    if (!isPublicRoute && (!userAgent || userAgent.length < 10)) {
      return true;
    }

    // Check for known bot patterns (not search engines)
    const maliciousBots = [
      'masscan',
      'nmap',
      'nikto',
      'sqlmap',
      'havij',
      'acunetix',
    ];
    if (maliciousBots.some(bot => userAgent.includes(bot))) {
      return true;
    }

    return false;
  }

  private cleanupSuspiciousIPs() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    for (const [ip, record] of this.suspiciousIPs.entries()) {
      if (now - record.lastSeen > oneHour) {
        this.suspiciousIPs.delete(ip);
      }
    }

    this.logger.debug(`Cleaned up suspicious IPs. Current count: ${this.suspiciousIPs.size}`);
  }
}
