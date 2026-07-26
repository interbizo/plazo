import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle("Plazo Marketplace API")
    .setDescription("Multi-tenant SaaS Marketplace API Documentation")
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token",
      },
      "bearer",
    )
    .addTag("auth", "Authentication & authorization endpoints")
    .addTag("users", "User profile & account management")
    .addTag("products", "Product listings & catalog")
    .addTag("services", "Service listings & catalog")
    .addTag("jobs", "Job postings & proposals")
    .addTag("orders", "Order management & lifecycle")
    .addTag("payment", "Payment processing & verification")
    .addTag("reviews", "Review & rating system")
    .addTag("chat", "Real-time messaging")
    .addTag("notifications", "User notifications")
    .addTag("upload", "File upload & media management")
    .addTag("cart", "Shopping cart operations")
    .addTag("wishlist", "User wishlists")
    .addTag("disputes", "Dispute resolution")
    .addTag("admin", "Admin panel operations")
    .addTag("tenants", "Tenant & storefront management")
    .addTag("cms", "Content management system")
    .addTag("analytics", "Analytics & reporting")
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: "none",
      filter: true,
      showRequestDuration: true,
      tagsSorter: "alpha",
      operationsSorter: "alpha",
    },
    customSiteTitle: "Plazo Marketplace API Docs",
  });
}
