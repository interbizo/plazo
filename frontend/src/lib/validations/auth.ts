import { z } from 'zod';

/**
 * Authentication Validation Schemas
 * 
 * Client-side validation untuk form authentication
 */

// ============================================
// REGISTER
// ============================================

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid'),
  
  firstName: z
    .string()
    .min(2, 'Nama depan minimal 2 karakter')
    .max(50, 'Nama depan maksimal 50 karakter')
    .regex(/^[a-zA-Z\s]+$/, 'Nama depan hanya boleh berisi huruf'),
  
  lastName: z
    .string()
    .min(2, 'Nama belakang minimal 2 karakter')
    .max(50, 'Nama belakang maksimal 50 karakter')
    .regex(/^[a-zA-Z\s]+$/, 'Nama belakang hanya boleh berisi huruf'),
  
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter'),
  
  confirmPassword: z
    .string()
    .min(1, 'Konfirmasi password wajib diisi'),
  
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^(\+62|62|0)[0-9]{9,12}$/.test(val),
      'Format nomor telepon tidak valid (contoh: 081234567890)'
    ),
  
  role: z
    .enum(['BUYER', 'SELLER'], {
      errorMap: () => ({ message: 'Role harus BUYER atau SELLER' }),
    })
    .optional(),
  
  // Seller-specific fields
  storeName: z
    .string()
    .min(2, 'Nama toko minimal 2 karakter')
    .max(100, 'Nama toko maksimal 100 karakter')
    .optional(),
  
  storeSubdomain: z
    .string()
    .min(3, 'Subdomain minimal 3 karakter')
    .max(50, 'Subdomain maksimal 50 karakter')
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'Subdomain hanya boleh huruf kecil, angka, dan dash')
    .optional(),
  
  storeCity: z
    .string()
    .optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Password dan konfirmasi password tidak cocok',
  path: ['confirmPassword'],
});

export type RegisterFormData = z.infer<typeof registerSchema>;

// ============================================
// LOGIN
// ============================================

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid'),
  
  password: z
    .string()
    .min(1, 'Password wajib diisi'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// ============================================
// FORGOT PASSWORD
// ============================================

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// ============================================
// RESET PASSWORD
// ============================================

export const resetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, 'Token tidak valid'),
  
  newPassword: z
    .string()
    .min(8, 'Password minimal 8 karakter'),
  
  confirmPassword: z
    .string()
    .min(1, 'Konfirmasi password wajib diisi'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Password dan konfirmasi password tidak cocok',
  path: ['confirmPassword'],
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// ============================================
// CHANGE PASSWORD
// ============================================

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Password lama wajib diisi'),
  
  newPassword: z
    .string()
    .min(8, 'Password baru minimal 8 karakter'),
  
  confirmPassword: z
    .string()
    .min(1, 'Konfirmasi password wajib diisi'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Password baru dan konfirmasi password tidak cocok',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'Password baru harus berbeda dengan password lama',
  path: ['newPassword'],
});

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

// ============================================
// UPDATE PROFILE
// ============================================

export const updateProfileSchema = z.object({
  avatar: z
    .string()
    .url('URL avatar tidak valid')
    .optional(),
  
  firstName: z
    .string()
    .min(2, 'Nama depan minimal 2 karakter')
    .max(50, 'Nama depan maksimal 50 karakter')
    .regex(/^[a-zA-Z\s]+$/, 'Nama depan hanya boleh berisi huruf')
    .optional(),
  
  lastName: z
    .string()
    .min(2, 'Nama belakang minimal 2 karakter')
    .max(50, 'Nama belakang maksimal 50 karakter')
    .regex(/^[a-zA-Z\s]+$/, 'Nama belakang hanya boleh berisi huruf')
    .optional(),
  
  phone: z
    .string()
    .regex(/^(\+62|62|0)[0-9]{9,12}$/, 'Format nomor telepon tidak valid')
    .optional(),
  
  bio: z
    .string()
    .max(500, 'Bio maksimal 500 karakter')
    .optional(),
});

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

// ============================================
// CREATE TENANT
// ============================================

export const createTenantSchema = z.object({
  subdomain: z
    .string()
    .min(3, 'Subdomain minimal 3 karakter')
    .max(50, 'Subdomain maksimal 50 karakter')
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, 'Subdomain hanya boleh huruf kecil, angka, dan dash'),
  
  name: z
    .string()
    .min(2, 'Nama toko minimal 2 karakter')
    .max(100, 'Nama toko maksimal 100 karakter'),
  
  description: z
    .string()
    .max(500, 'Deskripsi maksimal 500 karakter')
    .optional(),
});

export type CreateTenantFormData = z.infer<typeof createTenantSchema>;
