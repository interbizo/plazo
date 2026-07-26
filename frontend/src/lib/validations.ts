/**
 * Shared Zod validation schemas for all forms.
 * These schemas are the single source of truth for form validation
 * across the entire frontend — no more ad-hoc validation in each page.
 *
 * Usage:
 *   import { loginSchema } from "@/lib/validations";
 *   const result = loginSchema.safeParse(formData);
 *   if (!result.success) { ... handle errors ... }
 *
 * NOTE: Install zod first: npm install zod
 */

import { z } from "zod";

// ============================================
// COMMON VALIDATORS
// ============================================

const email = z
  .string()
  .min(1, "Email wajib diisi")
  .email("Format email tidak valid");

const password = z
  .string()
  .min(1, "Password wajib diisi")
  .min(8, "Password minimal 8 karakter")
  .regex(/[a-zA-Z]/, "Password harus mengandung huruf")
  .regex(/\d/, "Password harus mengandung angka");

const name = (label: string) =>
  z.string().min(1, `${label} wajib diisi`).max(50, `${label} maksimal 50 karakter`);

// ============================================
// AUTH SCHEMAS
// ============================================

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password wajib diisi"),
});

export const registerSchema = z
  .object({
    firstName: name("Nama depan"),
    lastName: name("Nama belakang"),
    email,
    password,
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
    role: z.enum(["BUYER", "SELLER"], {
      required_error: "Pilih peran",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password tidak cocok",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    newPassword: password,
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Password tidak cocok",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
    newPassword: password,
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Password tidak cocok",
    path: ["confirmPassword"],
  });

// ============================================
// PROFILE SCHEMAS
// ============================================

export const updateProfileSchema = z.object({
  firstName: name("Nama depan").optional(),
  lastName: name("Nama belakang").optional(),
  phone: z
    .string()
    .regex(/^(\+62|62|0)8[1-9][0-9]{6,10}$/, "Format nomor telepon tidak valid")
    .optional()
    .or(z.literal("")),
  bio: z.string().max(500, "Bio maksimal 500 karakter").optional(),
});

// ============================================
// PRODUCT SCHEMAS
// ============================================

export const createProductSchema = z.object({
  name: z.string().min(1, "Nama produk wajib diisi").max(200, "Nama produk maksimal 200 karakter"),
  description: z.string().min(10, "Deskripsi minimal 10 karakter").max(5000, "Deskripsi maksimal 5000 karakter"),
  price: z.number().min(1000, "Harga minimal Rp 1.000"),
  comparePrice: z.number().min(0).optional(),
  stock: z.number().int().min(0, "Stok tidak boleh negatif"),
  categoryId: z.string().min(1, "Kategori wajib dipilih"),
  tags: z.array(z.string()).optional(),
  images: z.array(z.string()).min(1, "Minimal 1 gambar produk"),
});

// ============================================
// SERVICE SCHEMAS
// ============================================

export const createServiceSchema = z.object({
  name: z.string().min(1, "Nama jasa wajib diisi").max(200, "Nama jasa maksimal 200 karakter"),
  description: z.string().min(10, "Deskripsi minimal 10 karakter").max(5000, "Deskripsi maksimal 5000 karakter"),
  categoryId: z.string().min(1, "Kategori wajib dipilih"),
  tags: z.array(z.string()).optional(),
  gallery: z.array(z.string()).min(1, "Minimal 1 gambar"),
});

export const servicePackageSchema = z.object({
  tier: z.enum(["BASIC", "STANDARD", "PREMIUM"]),
  title: z.string().min(1, "Judul paket wajib diisi"),
  description: z.string().min(1, "Deskripsi paket wajib diisi"),
  price: z.number().min(1000, "Harga minimal Rp 1.000"),
  deliveryDays: z.number().int().min(1, "Minimal 1 hari pengerjaan"),
  revisions: z.number().int().min(0, "Revisi tidak boleh negatif"),
  features: z.array(z.string()).min(1, "Minimal 1 fitur"),
});

// ============================================
// JOB SCHEMAS
// ============================================

export const createJobSchema = z.object({
  title: z.string().min(1, "Judul pekerjaan wajib diisi").max(200, "Judul maksimal 200 karakter"),
  description: z.string().min(20, "Deskripsi minimal 20 karakter").max(5000, "Deskripsi maksimal 5000 karakter"),
  budget: z.number().min(10000, "Budget minimal Rp 10.000"),
  tags: z.array(z.string()).optional(),
});

// ============================================
// PROPOSAL SCHEMAS
// ============================================

export const createProposalSchema = z.object({
  bidPrice: z.number().min(1000, "Harga bid minimal Rp 1.000"),
  message: z.string().min(20, "Pesan minimal 20 karakter").max(5000, "Pesan maksimal 5000 karakter"),
  attachments: z.array(z.string()).optional(),
});

// ============================================
// REVIEW SCHEMAS
// ============================================

export const createReviewSchema = z.object({
  rating: z.number().int().min(1, "Rating minimal 1").max(5, "Rating maksimal 5"),
  comment: z.string().max(2000, "Komentar maksimal 2000 karakter").optional(),
  images: z.array(z.string()).max(3, "Maksimal 3 gambar").optional(),
});

// ============================================
// DISPUTE SCHEMAS
// ============================================

export const createDisputeSchema = z.object({
  reason: z.string().min(20, "Alasan minimal 20 karakter").max(2000, "Alasan maksimal 2000 karakter"),
  evidence: z.array(z.string()).optional(),
});

// ============================================
// TENANT / STORE SCHEMAS
// ============================================

export const createTenantSchema = z.object({
  subdomain: z
    .string()
    .min(3, "Subdomain minimal 3 karakter")
    .max(30, "Subdomain maksimal 30 karakter")
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
      "Subdomain hanya boleh huruf kecil, angka, dan tanda hubung",
    ),
  name: z.string().min(1, "Nama toko wajib diisi").max(100, "Nama toko maksimal 100 karakter"),
  description: z.string().max(500, "Deskripsi maksimal 500 karakter").optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
export type CreateProductFormData = z.infer<typeof createProductSchema>;
export type CreateServiceFormData = z.infer<typeof createServiceSchema>;
export type ServicePackageFormData = z.infer<typeof servicePackageSchema>;
export type CreateJobFormData = z.infer<typeof createJobSchema>;
export type CreateProposalFormData = z.infer<typeof createProposalSchema>;
export type CreateReviewFormData = z.infer<typeof createReviewSchema>;
export type CreateDisputeFormData = z.infer<typeof createDisputeSchema>;
export type CreateTenantFormData = z.infer<typeof createTenantSchema>;
