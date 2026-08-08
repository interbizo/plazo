import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { CommonModule } from "@common/common.module";
import { DatabaseModule } from "@modules/database/database.module";
import { RedisModule } from "@modules/redis/redis.module";
import { PlatformSettingsModule } from "@modules/platform-settings/platform-settings.module";
import { MaintenanceMiddleware } from "@common/middleware/maintenance.middleware";
import { AuthModule } from "@modules/auth/auth.module";
import { MarketplaceModule } from "@modules/marketplace/marketplace.module";
import { JobsModule } from "@modules/jobs/jobs.module";
import { ProposalsModule } from "@modules/proposals/proposals.module";
// import { OrdersModule } from "@modules/orders/orders.module"; // DISABLED — transaksi internal dihapus
import { ChatModule } from "@modules/chat/chat.module";
import { NotificationsModule } from "@modules/notifications/notifications.module";
import { ReviewsModule } from "@modules/reviews/reviews.module";
import { TenantsModule } from "@modules/tenants/tenants.module";
import { UsersModule } from "@modules/users/users.module";
// import { CartModule } from "@modules/cart/cart.module"; // DISABLED — cart dihapus
import { WebsocketModule } from "@modules/websocket/websocket.module";
import { AdminModule } from "@modules/admin/admin.module";
import { SellerModule } from "@modules/seller/seller.module";
import { BuyerModule } from "@modules/buyer/buyer.module";
import { SubscriptionModule } from "@modules/subscription/subscription.module";
import { EmailModule } from "@modules/email/email.module";
import { UploadModule } from "@modules/upload/upload.module";
import { WishlistModule } from "@modules/wishlist/wishlist.module";
// import { DisputeModule } from "@modules/dispute/dispute.module"; // DISABLED — dispute dihapus
// import { PaymentModule } from "@modules/payment/payment.module"; // DISABLED — payment internal dihapus
import { KycModule } from "@modules/kyc/kyc.module";
// import { CustomOffersModule } from "@modules/custom-offers/custom-offers.module"; // DISABLED — custom offers dihapus
import { SellerLevelsModule } from "@modules/seller-levels/seller-levels.module";
import { ReportsModule } from "@modules/reports/reports.module";
import { CmsModule } from "@modules/cms/cms.module";
import { ArticlesModule } from "@modules/articles/articles.module";
import { RegionModule } from "@modules/region/region.module";
import { AddressModule } from "@modules/address/address.module";
import { RecommendedToolsModule } from "@modules/recommended-tools/recommended-tools.module";
import { StoreCmsModule } from "@modules/store-cms/store-cms.module";
import { LocationModule } from "@modules/location/location.module";
import { TutorialModule } from "@modules/tutorial/tutorial.module";
import { PhysicalVerificationModule } from "@modules/physical-verification/physical-verification.module";
import { SeoModule } from "@modules/seo/seo.module";
import { AccountAppealModule } from "@modules/account-appeal/account-appeal.module";
import { ForumModule } from "@modules/forum/forum.module";
import { TenantMiddleware } from "@common/middleware/tenant.middleware";
import { ActivityTrackerMiddleware } from "@common/middleware/activity-tracker.middleware";
import { SecurityMiddleware } from "@common/middleware/security.middleware";
import { RequestLoggerMiddleware } from "@common/middleware/request-logger.middleware";

@Module({
  imports: [
    RedisModule,
    CommonModule,
    DatabaseModule,
    EmailModule,
    AuthModule,
    MarketplaceModule,
    JobsModule,
    ProposalsModule,
    // OrdersModule,      // DISABLED — transaksi internal dihapus
    ChatModule,
    NotificationsModule,
    ReviewsModule,
    TenantsModule,
    UsersModule,
    // CartModule,         // DISABLED — cart dihapus
    WebsocketModule,
    AdminModule,
    SellerModule,
    BuyerModule,
    SubscriptionModule,
    UploadModule,
    WishlistModule,
    // DisputeModule,      // DISABLED — dispute dihapus
    // PaymentModule,      // DISABLED — payment internal dihapus
    KycModule,
    // CustomOffersModule, // DISABLED — custom offers dihapus
    SellerLevelsModule,
    ReportsModule,
    CmsModule,
    ArticlesModule,
    RegionModule,
    AddressModule,
    RecommendedToolsModule,
    StoreCmsModule,
    LocationModule,
    TutorialModule,
    PhysicalVerificationModule,
    SeoModule,
    AccountAppealModule,
    ForumModule,
    PlatformSettingsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Global maintenance mode check
    consumer.apply(MaintenanceMiddleware).forRoutes("*");

    // Request logger for debugging (only admin endpoints)
    consumer.apply(RequestLoggerMiddleware).forRoutes("*");

    // Security middleware — attack detection, suspicious IP blocking, extra headers
    // Must run BEFORE other middleware to block malicious requests early
    consumer.apply(SecurityMiddleware).forRoutes("*");

    // Tenant middleware handles its own route classification internally
    // (global routes, optional-tenant routes, and required-tenant routes).
    // No exclusions needed here — the middleware itself decides what to do.
    consumer.apply(TenantMiddleware).forRoutes("*");

    // Activity tracker middleware to update lastActiveAt for authenticated users
    consumer.apply(ActivityTrackerMiddleware).forRoutes("*");
  }
}
