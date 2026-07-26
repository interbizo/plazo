/**
 * Subscription Feature Types for Frontend
 */

export enum SubscriptionFeature {
  // Core Features
  PUBLISH_MARKETPLACE = 'canPublishToMarketplace',
  VERIFIED_BADGE = 'canVerifiedBadge',
  FEATURED_STORE = 'canFeaturedStore',
  
  // Product Features
  HIGHLIGHT_PRODUCTS = 'canHighlightProducts',
  PRIORITY_LISTING = 'canPriorityListing',
  FLASH_SALE = 'canFlashSale',
  BOOST_LISTING = 'canBoostListing',
  
  // Job Features
  SUBMIT_PROPOSAL = 'canSubmitProposal',
  
  // Checkout Features
  WHATSAPP_CHECKOUT = 'canWhatsappCheckout',
  
  // Tools & Analytics
  TOOLS_RECOMMENDATION = 'canToolsRecommendation',
  ADVANCED_ANALYTICS = 'canAdvancedAnalytics',
  BULK_UPLOAD = 'canBulkUpload',
  EXPORT_DATA = 'canExportData',
  
  // Customization
  CUSTOM_THEME = 'canCustomTheme',
  REMOVE_BRANDING = 'canRemoveBranding',
  
  // Verification
  PHYSICAL_VERIFICATION = 'canRequestPhysicalVerification',
  
  // Affiliate
  BECOME_AFFILIATE = 'canBecomeAffiliate',
}

export interface SubscriptionFeatureMetadata {
  key: SubscriptionFeature;
  label: string;
  description: string;
  category: 'core' | 'product' | 'job' | 'checkout' | 'tools' | 'customization' | 'verification' | 'affiliate';
  icon?: string;
}

export const SUBSCRIPTION_FEATURES: SubscriptionFeatureMetadata[] = [
  // Core Features
  {
    key: SubscriptionFeature.PUBLISH_MARKETPLACE,
    label: 'Publish Marketplace',
    description: 'Dapat mempublikasikan produk/jasa ke marketplace umum',
    category: 'core',
  },
  {
    key: SubscriptionFeature.VERIFIED_BADGE,
    label: 'Badge Terverifikasi',
    description: 'Mendapatkan badge terverifikasi di toko',
    category: 'core',
  },
  {
    key: SubscriptionFeature.FEATURED_STORE,
    label: 'Featured Homepage',
    description: 'Toko ditampilkan di homepage sebagai featured store',
    category: 'core',
  },
  
  // Product Features
  {
    key: SubscriptionFeature.HIGHLIGHT_PRODUCTS,
    label: 'Highlight Produk',
    description: 'Dapat meng-highlight produk tertentu',
    category: 'product',
  },
  {
    key: SubscriptionFeature.PRIORITY_LISTING,
    label: 'Priority Listing',
    description: 'Produk muncul lebih tinggi di hasil pencarian',
    category: 'product',
  },
  {
    key: SubscriptionFeature.FLASH_SALE,
    label: 'Flash Sale',
    description: 'Dapat membuat flash sale untuk produk',
    category: 'product',
  },
  {
    key: SubscriptionFeature.BOOST_LISTING,
    label: 'Boost / Top Ads',
    description: 'Dapat mem-boost listing ke posisi teratas',
    category: 'product',
  },
  
  // Job Features
  {
    key: SubscriptionFeature.SUBMIT_PROPOSAL,
    label: 'Kirim Proposal Job',
    description: 'Dapat mengirim proposal untuk job posting',
    category: 'job',
  },
  
  // Checkout Features
  {
    key: SubscriptionFeature.WHATSAPP_CHECKOUT,
    label: 'Beli via WhatsApp',
    description: 'Pembeli dapat checkout via WhatsApp',
    category: 'checkout',
  },
  
  // Tools & Analytics
  {
    key: SubscriptionFeature.TOOLS_RECOMMENDATION,
    label: 'Tools Rekomendasi Seller',
    description: 'Akses tools rekomendasi untuk seller',
    category: 'tools',
  },
  {
    key: SubscriptionFeature.ADVANCED_ANALYTICS,
    label: 'Advanced Analytics',
    description: 'Akses analytics dan insights lanjutan',
    category: 'tools',
  },
  {
    key: SubscriptionFeature.BULK_UPLOAD,
    label: 'Bulk Upload',
    description: 'Upload produk secara massal',
    category: 'tools',
  },
  {
    key: SubscriptionFeature.EXPORT_DATA,
    label: 'Export Data',
    description: 'Export data produk dan transaksi',
    category: 'tools',
  },
  
  // Customization
  {
    key: SubscriptionFeature.CUSTOM_THEME,
    label: 'Custom Theme',
    description: 'Kustomisasi tema toko sepenuhnya',
    category: 'customization',
  },
  {
    key: SubscriptionFeature.REMOVE_BRANDING,
    label: 'Remove Branding',
    description: 'Hapus branding platform dari toko',
    category: 'customization',
  },
  
  // Verification
  {
    key: SubscriptionFeature.PHYSICAL_VERIFICATION,
    label: 'Verifikasi Kunjungan Fisik',
    description: 'Dapat request verifikasi kunjungan fisik',
    category: 'verification',
  },
  
  // Affiliate
  {
    key: SubscriptionFeature.BECOME_AFFILIATE,
    label: 'Bisa Jadi Affiliate Seller',
    description: 'Dapat menjadi affiliate dan mendapat komisi',
    category: 'affiliate',
  },
];

export interface SubscriptionFeatures {
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
  canRequestPhysicalVerification: boolean;
  canSubmitProposal: boolean;
  canWhatsappCheckout: boolean;
  canToolsRecommendation: boolean;
  canBecomeAffiliate: boolean;
  canBoostListing: boolean;
}

export const FEATURE_CATEGORIES = {
  core: 'Fitur Utama',
  product: 'Fitur Produk',
  job: 'Fitur Job',
  checkout: 'Fitur Checkout',
  tools: 'Tools & Analytics',
  customization: 'Kustomisasi',
  verification: 'Verifikasi',
  affiliate: 'Affiliate',
} as const;
