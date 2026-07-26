import * as crypto from "crypto";

export class StringHelper {
  /**
   * Generate random string for tokens
   */
  static generateRandomString(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex').substring(0, length);
  }

  /**
   * Slugify string for URL-friendly names
   */
  static slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Generate UUID
   */
  static generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Truncate string with ellipsis
   */
  static truncate(text: string, length: number = 100): string {
    if (text.length <= length) return text;
    return text.substring(0, length) + "...";
  }

  /**
   * Capitalize first letter
   */
  static capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}
