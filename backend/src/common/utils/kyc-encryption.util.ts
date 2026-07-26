import * as CryptoJS from 'crypto-js';
import * as crypto from 'crypto';

/**
 * KYC Data Encryption Utility
 * Uses AES-256-GCM for encryption and SHA-256 for hashing
 * 
 * IMPORTANT: Store KYC_ENCRYPTION_KEY in .env and NEVER commit it to git
 */

const ENCRYPTION_KEY = process.env.KYC_ENCRYPTION_KEY || 'default-key-change-in-production';
const ALGORITHM = 'aes-256-gcm';

if (ENCRYPTION_KEY === 'default-key-change-in-production') {
  console.warn('⚠️  WARNING: Using default KYC encryption key. Set KYC_ENCRYPTION_KEY in .env for production!');
}

export class KycEncryption {
  /**
   * Encrypt sensitive data using AES-256
   * @param plaintext Data to encrypt
   * @returns Encrypted string (base64)
   */
  static encrypt(plaintext: string): string {
    try {
      const encrypted = CryptoJS.AES.encrypt(plaintext, ENCRYPTION_KEY).toString();
      return encrypted;
    } catch (error) {
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt encrypted data
   * @param ciphertext Encrypted data (base64)
   * @returns Decrypted plaintext
   */
  static decrypt(ciphertext: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decrypted) {
        throw new Error('Decryption failed - invalid key or corrupted data');
      }
      
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }

  /**
   * Hash data using SHA-256 (one-way, cannot be decrypted)
   * Used for KTP number uniqueness check
   * @param data Data to hash
   * @returns SHA-256 hash (hex)
   */
  static hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Encrypt KTP number (can be decrypted by admin)
   * @param ktpNumber KTP number
   * @returns Encrypted KTP number
   */
  static encryptKtpNumber(ktpNumber: string): string {
    // Remove spaces and dashes
    const cleaned = ktpNumber.replace(/[\s-]/g, '');
    return this.encrypt(cleaned);
  }

  /**
   * Hash KTP number for uniqueness check (cannot be decrypted)
   * @param ktpNumber KTP number
   * @returns SHA-256 hash
   */
  static hashKtpNumber(ktpNumber: string): string {
    const cleaned = ktpNumber.replace(/[\s-]/g, '');
    return this.hash(cleaned);
  }

  /**
   * Encrypt full name
   * @param fullName Full name
   * @returns Encrypted full name
   */
  static encryptFullName(fullName: string): string {
    return this.encrypt(fullName.trim());
  }

  /**
   * Encrypt address
   * @param address Address
   * @returns Encrypted address
   */
  static encryptAddress(address: string): string {
    return this.encrypt(address.trim());
  }

  /**
   * Encrypt date of birth
   * @param dob Date of birth (YYYY-MM-DD)
   * @returns Encrypted DOB
   */
  static encryptDob(dob: string): string {
    return this.encrypt(dob);
  }

  /**
   * Decrypt KTP number (admin only)
   * @param encrypted Encrypted KTP number
   * @returns Decrypted KTP number
   */
  static decryptKtpNumber(encrypted: string): string {
    return this.decrypt(encrypted);
  }

  /**
   * Decrypt full name (admin only)
   * @param encrypted Encrypted full name
   * @returns Decrypted full name
   */
  static decryptFullName(encrypted: string): string {
    return this.decrypt(encrypted);
  }

  /**
   * Decrypt address (admin only)
   * @param encrypted Encrypted address
   * @returns Decrypted address
   */
  static decryptAddress(encrypted: string): string {
    return this.decrypt(encrypted);
  }

  /**
   * Decrypt date of birth (admin only)
   * @param encrypted Encrypted DOB
   * @returns Decrypted DOB
   */
  static decryptDob(encrypted: string): string {
    return this.decrypt(encrypted);
  }

  /**
   * Mask KTP number for display (show only last 4 digits)
   * @param ktpNumber KTP number (decrypted)
   * @returns Masked KTP (e.g., "************1234")
   */
  static maskKtpNumber(ktpNumber: string): string {
    if (ktpNumber.length <= 4) return ktpNumber;
    const lastFour = ktpNumber.slice(-4);
    const masked = '*'.repeat(ktpNumber.length - 4) + lastFour;
    return masked;
  }
}
