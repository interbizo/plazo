/**
 * API Response Type Definitions
 * 
 * Centralized type definitions untuk semua API responses
 */

// ============================================
// GENERIC RESPONSE TYPES
// ============================================

/**
 * Standard API Response wrapper
 */
export interface ApiResponse<T = any> {
  statusCode: number;
  message?: string;
  data: T;
  timestamp?: string;
  path?: string;
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  // Legacy support
  total?: number;
  pages?: number;
}

/**
 * Error Response
 */
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
  errors?: Record<string, string>;
  timestamp?: string;
  path?: string;
}

// ============================================
// AUTH TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  role: 'BUYER' | 'SELLER' | 'ADMIN' | 'SUPER_ADMIN';
  isEmailVerified: boolean;
  isActive: boolean;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Login2FAResponse {
  requires2FA: boolean;
  userId: string;
  message: string;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken?: string;
}

export interface ProfileResponse {
  user: User;
  tenant?: Tenant;
}

// ============================================
// TENANT TYPES
// ============================================

export interface Tenant {
  id: string;
  subdomain: string;
  name: string;
  description?: string;
  logo?: string;
  banner?: string;
  ownerId: string;
  subscriptionPlan: 'FREE' | 'BASIC' | 'PREMIUM' | 'PROFESSIONAL' | 'ENTERPRISE' | 'ULTIMATE';
  sellerTier: 'FREE' | 'MEMBER';
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TenantStats {
  totalProducts: number;
  totalServices: number;
  totalOrders: number;
  totalRevenue: number;
  totalViews: number;
}

// ============================================
// PRODUCT TYPES
// ============================================

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  comparePrice?: number;
  stock: number;
  categoryId: string;
  category?: Category;
  images: string[];
  thumbnail?: string;
  tags: string[];
  productType: 'PHYSICAL' | 'DIGITAL';
  isDigital: boolean;
  hasVariants: boolean;
  variants?: ProductVariant[];
  // Digital product fields
  digitalFileUrl?: string;
  digitalFileSize?: number;
  digitalFileName?: string;
  downloadLimit?: number;
  downloadExpiry?: number;
  externalLink?: string;
  accessInstructions?: string;
  licenseKey?: string;
  digitalDeliveryMethod?: string;
  // SEO
  metaTitle?: string;
  metaDescription?: string;
  // Status
  isPublished: boolean;
  publishToMarketplace: boolean;
  isBoosted: boolean;
  boostExpiresAt?: string;
  // Location
  city?: string;
  latitude?: number;
  longitude?: number;
  // Stats
  viewCount: number;
  orderCount: number;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  price: number;
  stock: number;
  sku?: string;
  options: VariantOption[];
}

export interface VariantOption {
  name: string;
  value: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parentId?: string;
  isActive: boolean;
}

// ============================================
// SERVICE TYPES
// ============================================

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  comparePrice?: number;
  categoryId: string;
  category?: Category;
  thumbnail?: string;
  gallery?: string[];
  tags: string[];
  faq?: Array<{ question: string; answer: string }>;
  metaTitle?: string;
  metaDescription?: string;
  isPublished: boolean;
  publishToMarketplace: boolean;
  isBoosted: boolean;
  boostExpiresAt?: string;
  viewCount: number;
  orderCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// JOB TYPES
// ============================================

export interface Job {
  id: string;
  tenantId: string;
  buyerId: string;
  buyer?: User;
  title: string;
  slug: string;
  description: string;
  budget: number;
  categoryId: string;
  category?: Category;
  deadline: string;
  skills: string[];
  attachments: string[];
  status: 'OPEN' | 'IN_REVIEW' | 'HIRED' | 'COMPLETED' | 'CANCELLED';
  proposalCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Proposal {
  id: string;
  jobId: string;
  job?: Job;
  sellerId: string;
  seller?: User;
  coverLetter: string;
  proposedBudget: number;
  estimatedDuration: number;
  attachments: string[];
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

// ============================================
// ORDER TYPES
// ============================================

export interface Order {
  id: string;
  orderNumber: string;
  tenantId: string;
  buyerId: string;
  buyer?: User;
  sellerId: string;
  seller?: User;
  productId?: string;
  product?: Product;
  serviceId?: string;
  service?: Service;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: 'PENDING_PAYMENT' | 'PAYMENT_UPLOADED' | 'PAYMENT_VERIFIED' | 'PROCESSING' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED' | 'EXPIRED';
  paymentMethod?: 'BANK_TRANSFER' | 'E_WALLET' | 'CASH';
  paymentProof?: PaymentProof;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentProof {
  id: string;
  orderId: string;
  imageUrl: string;
  amount: number;
  paymentMethod: 'BANK_TRANSFER' | 'E_WALLET' | 'CASH';
  bankName?: string;
  accountName?: string;
  transactionDate?: string;
  referenceNumber?: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// REVIEW TYPES
// ============================================

export interface Review {
  id: string;
  orderId: string;
  order?: Order;
  reviewerId: string;
  reviewer?: User;
  revieweeId: string;
  reviewee?: User;
  rating: number;
  comment?: string;
  images: string[];
  type: 'SELLER_RATING' | 'BUYER_RATING';
  createdAt: string;
  updatedAt: string;
}

// ============================================
// SUBSCRIPTION TYPES
// ============================================

export interface SubscriptionPlan {
  id: string;
  plan: 'FREE' | 'BASIC' | 'PREMIUM' | 'PROFESSIONAL' | 'ENTERPRISE' | 'ULTIMATE';
  name: string;
  description?: string;
  badge?: string;
  monthlyPrice: number;
  yearlyPrice?: number;
  postsLimit: number;
  maxImagesPerPost: number;
  maxFileSize: number;
  sortOrder: number;
  isActive: boolean;
  // Features
  canPublishToMarketplace: boolean;
  canVerifiedBadge: boolean;
  canFeaturedStore: boolean;
  canHighlightProducts: boolean;
  canPriorityListing: boolean;
  canAdvancedAnalytics: boolean;
  canBulkUpload: boolean;
  canExportData: boolean;
  canFlashSale: boolean;
  canCustomTheme: boolean;
  canRemoveBranding: boolean;
  features: string[];
}

export interface Subscription {
  id: string;
  tenantId: string;
  plan: 'FREE' | 'BASIC' | 'PREMIUM' | 'PROFESSIONAL' | 'ENTERPRISE' | 'ULTIMATE';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPayment {
  id: string;
  tenantId: string;
  tenant?: Tenant;
  plan: string;
  amount: number;
  paymentProofUrl: string;
  paymentMethod: 'BANK_TRANSFER' | 'E_WALLET';
  bankName?: string;
  accountName?: string;
  transactionDate?: string;
  referenceNumber?: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// CHAT TYPES
// ============================================

export interface ChatRoom {
  id: string;
  participants: User[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  sender?: User;
  message: string;
  attachments: string[];
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// UPLOAD TYPES
// ============================================

export interface UploadedFile {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  category: string;
  createdAt: string;
}

// ============================================
// STATS TYPES
// ============================================

export interface DashboardStats {
  totalProducts: number;
  totalServices: number;
  totalJobs: number;
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  totalTenants: number;
}

export interface SellerStats {
  totalProducts: number;
  totalServices: number;
  totalOrders: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
  completionRate: number;
}

// ============================================
// CMS TYPES
// ============================================

export interface CMSPage {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SiteSetting {
  id: string;
  key: string;
  value: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}
