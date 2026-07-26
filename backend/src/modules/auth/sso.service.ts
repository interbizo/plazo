import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Service for handling SSO (Single Sign-On) operations
 * Manages cross-subdomain authentication for multi-tenant marketplace
 */
@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);
  private readonly allowedDomains: string[];
  private readonly mainDomain: string;

  constructor(private configService: ConfigService) {
    // Get main domain from environment (e.g., "plazo.id")
    this.mainDomain = this.configService.get<string>("MAIN_DOMAIN") || "plazo.id";
    
    // Allowed domains for return URLs (main + all subdomains)
    this.allowedDomains = [
      this.mainDomain,
      `*.${this.mainDomain}`, // All subdomains
      "ehftest.dev", // Staging
      "*.ehftest.dev",
      "localhost:3000", // Development
      "localhost:3001",
    ];

    this.logger.log(`SSO Service initialized for domain: ${this.mainDomain}`);
  }

  /**
   * Validate if a return URL is safe to redirect to
   * Prevents open redirect vulnerabilities
   */
  validateReturnUrl(returnUrl: string): boolean {
    if (!returnUrl) return false;

    try {
      const url = new URL(returnUrl);
      const hostname = url.hostname;

      // Check if hostname matches allowed domains
      const isAllowed = this.allowedDomains.some((domain) => {
        if (domain.startsWith("*.")) {
          // Wildcard subdomain check
          const baseDomain = domain.substring(2);
          return hostname.endsWith(baseDomain) || hostname === baseDomain;
        }
        return hostname === domain;
      });

      if (!isAllowed) {
        this.logger.warn(`Rejected return URL with invalid domain: ${hostname}`);
        return false;
      }

      // Additional security: only allow http/https protocols
      if (!["http:", "https:"].includes(url.protocol)) {
        this.logger.warn(`Rejected return URL with invalid protocol: ${url.protocol}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Invalid return URL format: ${returnUrl}`, error);
      return false;
    }
  }

  /**
   * Get the main domain for cookie settings
   */
  getMainDomain(): string {
    return this.mainDomain;
  }

  /**
   * Get cookie domain for cross-subdomain access
   * Returns ".plazo.com" to work on all subdomains
   */
  getCookieDomain(): string | undefined {
    // In development, don't set domain (localhost doesn't support subdomain cookies)
    if (this.mainDomain.includes("localhost")) {
      return undefined;
    }
    
    // For production, use .domain.com format
    return `.${this.mainDomain}`;
  }

  /**
   * Build SSO login URL with return URL parameter
   */
  buildLoginUrl(returnUrl?: string): string {
    const baseUrl = this.configService.get<string>("FRONTEND_URL") || `https://${this.mainDomain}`;
    const loginPath = "/login";
    
    if (returnUrl && this.validateReturnUrl(returnUrl)) {
      return `${baseUrl}${loginPath}?returnUrl=${encodeURIComponent(returnUrl)}`;
    }
    
    return `${baseUrl}${loginPath}`;
  }

  /**
   * Build SSO register URL with return URL parameter
   */
  buildRegisterUrl(returnUrl?: string): string {
    const baseUrl = this.configService.get<string>("FRONTEND_URL") || `https://${this.mainDomain}`;
    const registerPath = "/register";
    
    if (returnUrl && this.validateReturnUrl(returnUrl)) {
      return `${baseUrl}${registerPath}?returnUrl=${encodeURIComponent(returnUrl)}`;
    }
    
    return `${baseUrl}${registerPath}`;
  }

  /**
   * Extract subdomain from hostname
   * Returns null for main domain, subdomain string for subdomains
   */
  extractSubdomain(hostname: string): string | null {
    if (!hostname || hostname === this.mainDomain) {
      return null;
    }

    // Remove main domain to get subdomain
    const subdomain = hostname.replace(`.${this.mainDomain}`, "");
    
    // If it's the same as hostname, it's not a subdomain of our domain
    if (subdomain === hostname) {
      return null;
    }

    return subdomain;
  }

  /**
   * Check if request is from a merchant subdomain
   */
  isMerchantSubdomain(hostname: string): boolean {
    const subdomain = this.extractSubdomain(hostname);
    
    // Exclude system subdomains
    const systemSubdomains = ["www", "api", "admin", "cdn", "static"];
    
    return subdomain !== null && !systemSubdomains.includes(subdomain);
  }
}
