import { z } from 'zod';

/**
 * Product & Service Validation Schemas
 * 
 * Client-side validation untuk form product dan service
 */

// ============================================
// PRODUCT
// ============================================

export const productSchema = z.object({
  name: z
    .string()
    .min(3, 'Nama produk minimal 3 karakter')
    .max(200, 'Nama produk maksimal 200 karakter'),
  
  slug: z
    .string()
    .min(3, 'Slug minimal 3 karakter')
    .max(200, 'Slug maksimal 200 karakter')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh huruf kecil, angka, dan dash')
    .optional(),
  
  description: z
    .string()
    .min(10, 'Deskripsi minimal 10 karakter')
    .max(5000, 'Deskripsi maksimal 5000 karakter'),
  
  price: z
    .number({
      required_error: 'Harga wajib diisi',
      invalid_type_error: 'Harga harus berupa angka',
    })
    .min(0, 'Harga tidak boleh negatif')
    .max(999999999, 'Harga terlalu besar'),
  
  comparePrice: z
    .number()
    .min(0, 'Harga pembanding tidak boleh negatif')
    .optional(),
  
  stock: z
    .number({
      required_error: 'Stok wajib diisi',
      invalid_type_error: 'Stok harus berupa angka',
    })
    .int('Stok harus bilangan bulat')
    .min(0, 'Stok tidak boleh negatif'),
  
  categoryId: z
    .string()
    .min(1, 'Kategori wajib dipilih'),
  
  images: z
    .array(z.string().url('URL gambar tidak valid'))
    .max(10, 'Maksimal 10 gambar')
    .optional(),
  
  tags: z
    .array(z.string())
    .max(10, 'Maksimal 10 tag')
    .optional(),
  
  thumbnail: z
    .string()
    .url('URL thumbnail tidak valid')
    .optional(),
  
  productType: z
    .enum(['PHYSICAL', 'DIGITAL'])
    .optional(),
  
  isDigital: z
    .boolean()
    .optional(),
  
  hasVariants: z
    .boolean()
    .optional(),
  
  // Digital product fields
  digitalFileUrl: z
    .string()
    .url('URL file tidak valid')
    .optional(),
  
  digitalFileSize: z
    .number()
    .int()
    .min(0)
    .optional(),
  
  digitalFileName: z
    .string()
    .max(255)
    .optional(),
  
  downloadLimit: z
    .number()
    .int()
    .min(1, 'Limit download minimal 1')
    .optional(),
  
  downloadExpiry: z
    .number()
    .int()
    .min(1, 'Masa berlaku minimal 1 hari')
    .optional(),
  
  externalLink: z
    .string()
    .url('URL eksternal tidak valid')
    .optional(),
  
  accessInstructions: z
    .string()
    .max(1000, 'Instruksi akses maksimal 1000 karakter')
    .optional(),
  
  licenseKey: z
    .string()
    .max(255)
    .optional(),
  
  digitalDeliveryMethod: z
    .string()
    .optional(),
  
  metaTitle: z
    .string()
    .max(60, 'Meta title maksimal 60 karakter')
    .optional(),
  
  metaDescription: z
    .string()
    .max(160, 'Meta description maksimal 160 karakter')
    .optional(),
  
  isPublished: z
    .boolean()
    .optional(),
  
  publishToMarketplace: z
    .boolean()
    .optional(),
  
  // Location
  city: z
    .string()
    .optional(),
  
  latitude: z
    .number()
    .min(-90)
    .max(90)
    .optional(),
  
  longitude: z
    .number()
    .min(-180)
    .max(180)
    .optional(),
}).refine(
  (data) => {
    // If comparePrice is set, it should be greater than price
    if (data.comparePrice && data.comparePrice <= data.price) {
      return false;
    }
    return true;
  },
  {
    message: 'Harga pembanding harus lebih besar dari harga jual',
    path: ['comparePrice'],
  }
);

export type ProductFormData = z.infer<typeof productSchema>;

// ============================================
// SERVICE
// ============================================

export const serviceSchema = z.object({
  name: z
    .string()
    .min(3, 'Nama layanan minimal 3 karakter')
    .max(200, 'Nama layanan maksimal 200 karakter'),
  
  description: z
    .string()
    .min(10, 'Deskripsi minimal 10 karakter')
    .max(5000, 'Deskripsi maksimal 5000 karakter'),
  
  basePrice: z
    .number({
      required_error: 'Harga dasar wajib diisi',
      invalid_type_error: 'Harga harus berupa angka',
    })
    .min(0, 'Harga tidak boleh negatif')
    .max(999999999, 'Harga terlalu besar'),
  
  comparePrice: z
    .number()
    .min(0, 'Harga pembanding tidak boleh negatif')
    .optional(),
  
  categoryId: z
    .string()
    .min(1, 'Kategori wajib dipilih'),
  
  tags: z
    .array(z.string())
    .max(10, 'Maksimal 10 tag')
    .optional(),
  
  thumbnail: z
    .string()
    .url('URL thumbnail tidak valid')
    .optional(),
  
  isPublished: z
    .boolean()
    .optional(),
}).refine(
  (data) => {
    if (data.comparePrice && data.comparePrice <= data.basePrice) {
      return false;
    }
    return true;
  },
  {
    message: 'Harga pembanding harus lebih besar dari harga dasar',
    path: ['comparePrice'],
  }
);

export type ServiceFormData = z.infer<typeof serviceSchema>;

// ============================================
// JOB
// ============================================

export const jobSchema = z.object({
  title: z
    .string()
    .min(5, 'Judul pekerjaan minimal 5 karakter')
    .max(200, 'Judul pekerjaan maksimal 200 karakter'),
  
  description: z
    .string()
    .min(20, 'Deskripsi minimal 20 karakter')
    .max(5000, 'Deskripsi maksimal 5000 karakter'),
  
  budget: z
    .number({
      required_error: 'Budget wajib diisi',
      invalid_type_error: 'Budget harus berupa angka',
    })
    .min(0, 'Budget tidak boleh negatif')
    .max(999999999, 'Budget terlalu besar'),
  
  categoryId: z
    .string()
    .min(1, 'Kategori wajib dipilih'),
  
  deadline: z
    .string()
    .min(1, 'Deadline wajib diisi')
    .refine((val) => {
      const date = new Date(val);
      return date > new Date();
    }, 'Deadline harus di masa depan'),
  
  skills: z
    .array(z.string())
    .min(1, 'Minimal 1 skill diperlukan')
    .max(10, 'Maksimal 10 skills'),
  
  attachments: z
    .array(z.string().url('URL attachment tidak valid'))
    .max(5, 'Maksimal 5 attachments')
    .optional(),
});

export type JobFormData = z.infer<typeof jobSchema>;

// ============================================
// PROPOSAL
// ============================================

export const proposalSchema = z.object({
  jobId: z
    .string()
    .min(1, 'Job ID wajib diisi'),
  
  coverLetter: z
    .string()
    .min(50, 'Cover letter minimal 50 karakter')
    .max(2000, 'Cover letter maksimal 2000 karakter'),
  
  proposedBudget: z
    .number({
      required_error: 'Budget proposal wajib diisi',
      invalid_type_error: 'Budget harus berupa angka',
    })
    .min(0, 'Budget tidak boleh negatif'),
  
  estimatedDuration: z
    .number({
      required_error: 'Estimasi durasi wajib diisi',
      invalid_type_error: 'Durasi harus berupa angka',
    })
    .int('Durasi harus bilangan bulat')
    .min(1, 'Durasi minimal 1 hari'),
  
  attachments: z
    .array(z.string().url('URL attachment tidak valid'))
    .max(5, 'Maksimal 5 attachments')
    .optional(),
});

export type ProposalFormData = z.infer<typeof proposalSchema>;
