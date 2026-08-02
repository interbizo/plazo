// ============================================
// USER & AUTH TYPES
// ============================================

export type UserRole = "BUYER" | "SELLER" | "ADMIN" | "SUPER_ADMIN";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  kycStatus?: string;
  tenantSubdomain?: string;
  lastActiveAt?: string;
  createdAt: string;
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

export interface RegisterResponse {
  message: string;
  user: User;
}

// ============================================
// PAGINATION
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

// ============================================
// ARTICLE
// ============================================

export type ArticleStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type ArticleSource = "MANUAL" | "CSV" | "AI";

export interface ArticleCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
  _count?: { articles?: number };
  createdAt?: string;
  updatedAt?: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  thumbnail?: string;
  youtubeUrl?: string;
  categoryId?: string | null;
  category?: ArticleCategory | null;
  tags: string[];
  status: ArticleStatus;
  source: ArticleSource;
  wordCount: number;
  readingTimeMinutes: number;
  viewCount: number;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  ogImage?: string;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// TENANT / STORE
// ============================================

export interface Tenant {
  id: string;
  subdomain: string;
  customDomain?: string;
  name: string;
  description?: string;
  tagline?: string;
  logo?: string;
  banner?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  address?: string;
  city?: string;
  storeHours?: Record<string, any> | string;
  termsOfService?: string;
  privacyPolicy?: string;
  themeColor?: string;
  themeSecondary?: string;
  themeFontFamily?: string;
  themeBorderRadius?: string;
  themeShadowStyle?: string;
  socialLinks?: Record<string, string>;
  storeAnnouncement?: string;
  isActive: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  subscriptionPlan: SubscriptionPlan;
  sellerTier?: SellerTier;
  postsLimit: number;
  usedPosts: number;
  canHighlightProducts?: boolean;
  canPriorityListing?: boolean;
  canAnalyticsAdvanced?: boolean;
  createdAt: string;
}

export interface StorePage {
  id: string;
  tenantId?: string;
  slug: string;
  title: string;
  content?: string;
  isVisible?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// PRODUCT
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
  productType?: "PHYSICAL" | "DIGITAL";
  isDigital?: boolean;
  hasVariants?: boolean;
  categoryId: string;
  images: string[];
  tags: string[];
  thumbnail?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  isPublished: boolean;
  publishToMarketplace?: boolean;
  isBoosted: boolean;
  boostedUntil?: string;
  category?: { id: string; name: string; slug: string };
  tenant?: { id: string; name: string; subdomain: string };
  variants?: Array<{
    id: string;
    name: string;
    sku?: string;
    price?: number;
    stock: number;
    isActive?: boolean;
    sortOrder?: number;
    options?: Array<{
      optionName?: string;
      optionValue?: string;
      name?: string;
      value?: string;
    }>;
  }>;
  // Stats from backend
  averageRating?: number;
  totalReviews?: number;
  totalSales?: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// SERVICE (Gig)
// ============================================

export interface ServicePackage {
  id: string;
  serviceId: string;
  tier: "BASIC" | "STANDARD" | "PREMIUM";
  title: string;
  description: string;
  price: number;
  deliveryDays: number;
  revisions: number;
  features: string[];
}

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  slug?: string;
  description: string;
  basePrice: number;
  comparePrice?: number;
  thumbnail?: string;
  gallery: string[];
  tags: string[];
  faq?: Array<{ question: string; answer: string }>; // FAQ field
  metaKeywords?: string;
  categoryId: string;
  isPublished: boolean;
  publishToMarketplace?: boolean;
  packages?: ServicePackage[];
  category?: { 
    id: string; 
    name: string; 
    slug: string;
    parentId?: string | null;
    parent?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  };
  tenant?: { id: string; name: string; subdomain: string };
  // Stats from backend (same as Product)
  averageRating?: number;
  totalReviews?: number;
  totalSales?: number;
  createdAt: string;
}

// ============================================
// JOB
// ============================================

export interface Job {
  id: string;
  tenantId: string;
  buyerId: string;
  title: string;
  slug?: string;
  description: string;
  budget: number;
  maxProposals?: number | null;
  deadline?: string;
  skills: string[];
  categoryId?: string;
  status: "OPEN" | "IN_REVIEW" | "HIRED" | "COMPLETED" | "CANCELLED";
  category?: { id: string; name: string };
  buyer?: { id: string; firstName: string; lastName: string; avatar?: string };
  _count?: { proposals: number };
  createdAt: string;
}

// ============================================
// ORDER
// ============================================

export type OrderStatus =
  | "PENDING"
  | "PENDING_PAYMENT"
  | "PAYMENT_UPLOADED"
  | "PAYMENT_VERIFIED"
  | "PROCESSING"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED"
  | "EXPIRED";

export interface Order {
  id: string;
  tenantId: string;
  buyerId: string;
  sellerId: string;
  title: string;
  description?: string;
  amount: number;
  status: OrderStatus;
  maxRevisions: number;
  revisionsUsed: number;
  escrowAmount?: number;
  paymentCode?: string;
  paymentDeadline?: string;
  deliveryDeadline?: string;
  completedAt?: string;
  buyer?: { id: string; firstName: string; lastName: string; avatar?: string };
  seller?: { id: string; firstName: string; lastName: string; avatar?: string };
  orderItems?: Array<{
    id: string;
    productId?: string;
    variantId?: string;
    variantName?: string;
    variantOptions?: { optionName: string; optionValue: string }[];
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    product?: {
      id: string;
      name: string;
      thumbnail?: string;
      images?: string[];
      productType?: string;
      isDigital?: boolean;
    };
  }>;
  job?: { id: string; title: string };
  chatRoom?: { id: string };
  createdAt: string;
}

// ============================================
// PROPOSAL
// ============================================

export interface Proposal {
  id: string;
  jobId: string;
  sellerId: string;
  message: string;
  bidPrice: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "COMPLETED" | "CANCELLED";
  attachments?: string[];
  seller?: { id: string; firstName: string; lastName: string; avatar?: string };
  job?: Job;
  createdAt: string;
}

// ============================================
// REVIEW
// ============================================

export interface Review {
  id: string;
  orderId: string;
  giverId: string;
  receiverId: string;
  rating: number;
  comment?: string;
  images?: string[];
  type: "SELLER_RATING" | "BUYER_RATING";
  giver?: { id: string; firstName: string; lastName: string; avatar?: string };
  createdAt: string;
}

// ============================================
// NOTIFICATION
// ============================================

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  metadata?: Record<string, unknown> | null;
  isRead: boolean;
  readAt?: string;
  referenceId?: string;
  referenceType?: string;
  createdAt: string;
}

// ============================================
// CHAT
// ============================================

export interface ChatRoom {
  id: string;
  tenantId: string;
  orderId?: string;
  participants: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  }[];
  order?: { id: string; title: string; status: string };
  messages?: { text: string; createdAt: string }[];
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  text: string;
  attachments: string[];
  isRead: boolean;
  sender?: { id: string; firstName: string; lastName: string; avatar?: string };
  createdAt: string;
}

// ============================================
// CART
// ============================================

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId?: string;
  variant?: {
    id: string;
    name: string;
    price?: number;
    stock: number;
    options?: { optionName: string; optionValue: string }[];
  };
  quantity: number;
  product: Product;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
}

// ============================================
// CATEGORY
// ============================================

export interface Category {
  id: string;
  name: string;
  description?: string;
  slug: string;
  type?: "PRODUCT" | "SERVICE";
  parentId?: string | null;
  icon?: string;
  isActive?: boolean;
  _count?: {
    products?: number;
    services?: number;
  };
}

// ============================================
// SELLER PROFILE
// ============================================

export interface SellerProfile {
  id: string;
  userId: string;
  bio?: string;
  skills: string[];
  level: string;
  totalOrders: number;
  totalReviews: number;
  averageRating: number;
  totalEarnings: number;
}

// ============================================
// SUBSCRIPTION & SELLER TIER
// ============================================

export type SellerTier = "FREE" | "MEMBER";

export type SubscriptionPlan =
  | "FREE"
  | "BASIC"
  | "PREMIUM"
  | "PROFESSIONAL"
  | "ENTERPRISE"
  | "ULTIMATE";

export interface SubscriptionPlanConfig {
  id: string;
  plan: SubscriptionPlan;
  name: string;
  description?: string;
  badge?: string;
  sortOrder: number;
  isActive: boolean;
  postsLimit: number;
  maxImagesPerPost: number;
  maxFileSize: number;
  monthlyPrice: number;
  yearlyPrice?: number;
  features?: string[];
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
}

export interface TenantSubscriptionInfo {
  id: string;
  name: string;
  subscriptionPlan: SubscriptionPlan;
  sellerTier: SellerTier;
  postsLimit: number;
  usedPosts: number;
  postsRemaining: number;
  subscriptionExpiresAt?: string;
  features: {
    canHighlightProducts: boolean;
    canPriorityListing: boolean;
    canAnalyticsAdvanced: boolean;
    isVerified: boolean;
    isFeatured: boolean;
  };
}

export interface SubscriptionHistory {
  id: string;
  tenantId: string;
  fromPlan: SubscriptionPlan;
  toPlan: SubscriptionPlan;
  fromTier: SellerTier;
  toTier: SellerTier;
  amount: number;
  reason?: string;
  changedBy?: string;
  createdAt: string;
}

export interface AffiliateBonus {
  id: string;
  affiliateType: "GENERAL" | "CITY_SPECIAL";
  citySnapshot?: string | null;
  rate: number;
  subscriptionAmount: number;
  bonusAmount: number;
  status: "PENDING" | "APPROVED" | "PAID" | "REJECTED";
  createdAt: string;
  referredTenant?: {
    id: string;
    name: string;
    city?: string | null;
    owner?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  claim?: {
    id: string;
    status: string;
    requestedAt: string;
    reviewedAt?: string;
    paidAt?: string;
  } | null;
  subscriptionPayment?: {
    id: string;
    amount: number;
    plan: SubscriptionPlan;
    createdAt: string;
    reviewedAt?: string;
  };
}

export interface AffiliateClaim {
  id: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "PAID" | "REJECTED";
  requestedAt: string;
  reviewedAt?: string;
  paidAt?: string;
  adminNotes?: string;
  rejectionReason?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
  paymentProofUrl?: string;
  bonuses?: Array<{ id: string; bonusAmount: number }>;
}

export interface AffiliateDashboard {
  profile: {
    referralCode: string;
    isActive: boolean;
    isCitySpecial: boolean;
    city?: string | null;
    defaultBankAccountName?: string | null;
    defaultBankAccountNumber?: string | null;
    defaultBankName?: string | null;
  };
  stats: {
    invitedSellers: number;
    subscribedSellers: number;
    totalBonus: number;
    pendingBonus: number;
    approvedBonus: number;
    paidBonus: number;
  };
  bonuses: AffiliateBonus[];
  claims: AffiliateClaim[];
}

// ============================================
// API ERROR
// ============================================

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}
