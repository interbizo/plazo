import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";
import { CreateProductDto, UpdateProductDto } from "./products.dto";
import { PaginationHelper } from "@common/utils/pagination.helper";
import { StringHelper } from "@common/utils/string.helper";

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  
  constructor(private prisma: PrismaService) {}

  /**
   * Create Product
   */
  async createProduct(
    tenantId: string,
    userId: string,
    createProductDto: CreateProductDto,
  ) {
    // Verify the user owns this tenant
    await this.verifyTenantOwnership(tenantId, userId);

    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: createProductDto.categoryId },
    });

    if (!category) {
      throw new BadRequestException("Category not found");
    }

    // Check posting limit
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }
    if (tenant.usedPosts >= tenant.postsLimit) {
      const upgradeMsg = tenant.sellerTier === "FREE"
        ? " Upgrade ke paket berbayar untuk mendapatkan lebih banyak kuota posting."
        : "";
      throw new BadRequestException(
        `Kuota posting habis (${tenant.usedPosts}/${tenant.postsLimit}).${upgradeMsg}`,
      );
    }

    // Seller FREE dan Member sama-sama bisa publish ke marketplace
    const publishToMarketplace = createProductDto.publishToMarketplace ?? true;

    // Create product
    const slug = await this.generateUniqueSlug(
      tenantId,
      createProductDto.slug || createProductDto.name,
    );

    // Prepare product data
    const productData: any = {
      tenantId,
      name: createProductDto.name,
      slug,
      description: createProductDto.description,
      price: createProductDto.price,
      comparePrice: createProductDto.comparePrice || null,
      stock: createProductDto.stock,
      categoryId: createProductDto.categoryId,
      images: createProductDto.images || [],
      tags: createProductDto.tags || [],
      thumbnail: createProductDto.thumbnail,
      metaTitle: createProductDto.metaTitle,
      metaDescription: createProductDto.metaDescription,
      metaKeywords: createProductDto.metaKeywords,
      isPublished: createProductDto.isPublished ?? true,
      publishToMarketplace,
      productType: createProductDto.productType || 'PHYSICAL',
      isDigital: createProductDto.isDigital || false,
      hasVariants: createProductDto.hasVariants || false,
      city: createProductDto.city,
      latitude: createProductDto.latitude,
      longitude: createProductDto.longitude,
    };

    // Remove undefined values to prevent Prisma errors
    Object.keys(productData).forEach((key) => {
      if (productData[key] === undefined) {
        delete productData[key];
      }
    });

    // Auto-inherit city from tenant if not provided
    if (!createProductDto.city && tenant.city) {
      productData.city = tenant.city;
      productData.latitude = tenant.latitude;
      productData.longitude = tenant.longitude;
    }

    // Add digital product fields if applicable
    if (createProductDto.isDigital) {
      productData.digitalFileUrl = createProductDto.digitalFileUrl;
      productData.digitalFileSize = createProductDto.digitalFileSize;
      productData.digitalFileName = createProductDto.digitalFileName;
      productData.downloadLimit = createProductDto.downloadLimit;
      productData.downloadExpiry = createProductDto.downloadExpiry;
      productData.externalLink = createProductDto.externalLink;
      productData.accessInstructions = createProductDto.accessInstructions;
      productData.licenseKey = createProductDto.licenseKey;
      productData.digitalDeliveryMethod = createProductDto.digitalDeliveryMethod;
    }

    // Create product with variants if applicable
    if (createProductDto.hasVariants && createProductDto.variants && createProductDto.variants.length > 0) {
      productData.variants = {
        create: createProductDto.variants.map((variant: any) => ({
          name: variant.name,
          price: variant.price,
          stock: variant.stock,
          sku: variant.sku,
          options: {
            create: variant.options.map((opt: any) => ({
              optionName: opt.name,
              optionValue: opt.value,
            })),
          },
        })),
      };
    }

    const product = await this.prisma.product.create({
      data: productData,
      include: {
        variants: {
          include: {
            options: true,
          },
        },
      },
    });

    // Increment used posts
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { usedPosts: { increment: 1 } },
    });

    return {
      message: "Product created successfully",
      product,
    };
  }

  /**
   * Get Products with Pagination & Filter
   */
  async getProducts(
    tenantId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    categoryId?: string,
    city?: string,
  ) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    // Build filter
    const where: any = {
      tenantId,
      isPublished: true,
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
          { tags: { hasSome: [search] } },
        ],
      }),
      ...(categoryId && { categoryId }),
      ...(city && { city: { contains: city, mode: "insensitive" as const } }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        include: {
          category: {
            select: { 
              id: true, 
              name: true, 
              slug: true,
              parentId: true,
              parent: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                }
              }
            },
          },
        },
        orderBy: [
          { isBoosted: "desc" }, // Boosted products first (selalu di atas)
          { createdAt: "desc" },
        ],
      }),
      this.prisma.product.count({ where }),
    ]);

    return PaginationHelper.formatPaginatedResponse(
      products,
      total,
      page,
      limit,
    );
  }

  /**
   * Get Single Product
   */
  async getProduct(tenantId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        tenantId,
        deletedAt: null,
      },
      include: {
        category: {
          select: { 
            id: true, 
            name: true, 
            slug: true,
            parentId: true,
            parent: {
              select: {
                id: true,
                name: true,
                slug: true,
              }
            }
          },
        },
        variants: {
          include: {
            options: true,
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!product) {
      throw new BadRequestException("Product not found");
    }

    return { product };
  }

  private async verifyTenantOwnership(tenantId: string, userId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { ownerId: true },
    });
    if (!tenant || tenant.ownerId !== userId) {
      throw new ForbiddenException("You do not own this tenant/store");
    }
  }

  /**
   * Update Product
   */
  async updateProduct(
    tenantId: string,
    productId: string,
    userId: string,
    updateProductDto: UpdateProductDto,
  ) {
    await this.verifyTenantOwnership(tenantId, userId);

    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
    });

    if (!product) {
      throw new BadRequestException("Product not found");
    }

    // If categoryId changed, verify it exists
    if (updateProductDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: updateProductDto.categoryId },
      });

      if (!category) {
        throw new BadRequestException("Category not found");
      }
    }

    // Seller FREE dan Member sama-sama bisa publish ke marketplace
    // No restriction on publishToMarketplace

    const {
      variants,
      hasVariants,
      ...productData
    } = updateProductDto as UpdateProductDto & {
      variants?: Array<{
        name: string;
        price: number;
        stock: number;
        sku?: string;
        options: Array<{ name: string; value: string }>;
      }>;
    };

    const normalizedProductData: any = { ...productData };

    if (hasVariants !== undefined) {
      normalizedProductData.hasVariants = hasVariants;
    }

    if (hasVariants) {
      normalizedProductData.stock = 0;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: normalizedProductData,
      });

      if (hasVariants === false) {
        await tx.productVariant.deleteMany({
          where: { productId },
        });
      } else if (hasVariants && variants) {
        await tx.productVariant.deleteMany({
          where: { productId },
        });

        if (variants.length > 0) {
          await tx.product.update({
            where: { id: productId },
            data: {
              variants: {
                create: variants.map((variant, index) => ({
                  name: variant.name,
                  price: variant.price,
                  stock: variant.stock,
                  sku: variant.sku,
                  isActive: true,
                  sortOrder: index,
                  options: {
                    create: variant.options.map((opt) => ({
                      optionName: opt.name,
                      optionValue: opt.value,
                    })),
                  },
                })),
              },
            },
          });
        }
      }

      return tx.product.findUnique({
        where: { id: productId },
        include: {
          variants: {
            include: {
              options: true,
            },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
      });
    });

    return {
      message: "Product updated successfully",
      product: updated,
    };
  }

  /**
   * Delete Product (Soft Delete)
   */
  async deleteProduct(tenantId: string, productId: string, userId: string) {
    await this.verifyTenantOwnership(tenantId, userId);

    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
    });

    if (!product) {
      throw new BadRequestException("Product not found");
    }

    await this.prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date() },
    });

    // BUG-09: Clean up cart items referencing this product
    await this.prisma.cartItem.deleteMany({
      where: { productId },
    });

    // BUG-54: Decrement tenant's usedPosts
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { usedPosts: { decrement: 1 } },
    });

    return { message: "Product deleted successfully" };
  }

  /**
   * Boost Product (with pricing tiers)
   */
  async boostProduct(
    tenantId: string,
    productId: string,
    userId: string,
    daysToBoost: number = 7,
  ) {
    this.logger.log(`[BOOST PRODUCT] Request - TenantId: ${tenantId}, ProductId: ${productId}, Days: ${daysToBoost}`);
    
    if (!tenantId) {
      this.logger.error(`[BOOST PRODUCT] TenantId is null/undefined`);
      throw new BadRequestException("Tenant tidak ditemukan. Pastikan Anda mengakses dari panel seller Anda.");
    }

    // Check if tenant exists and get subscription info
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { 
        id: true,
        subscriptionPlan: true,
      },
    });

    if (!tenant) {
      this.logger.error(`[BOOST PRODUCT] Tenant not found: ${tenantId}`);
      throw new BadRequestException("Tenant not found");
    }

    this.logger.log(`[BOOST PRODUCT] Tenant found - Plan: ${tenant.subscriptionPlan}`);

    // Get subscription plan features
    const planConfig = await this.prisma.subscriptionPlanConfig.findUnique({
      where: { plan: tenant.subscriptionPlan },
      select: { canBoostListing: true },
    });

    this.logger.log(`[BOOST PRODUCT] Plan config - canBoostListing: ${planConfig?.canBoostListing}`);

    // Boost listing HANYA untuk paket yang memiliki fitur ini
    if (!planConfig?.canBoostListing) {
      this.logger.warn(`[BOOST PRODUCT] Access denied - Plan ${tenant.subscriptionPlan} does not have boost access`);
      throw new ForbiddenException(
        "Fitur Boost Listing tidak tersedia di paket langganan Anda saat ini. Silakan upgrade ke paket yang memiliki fitur Boost untuk menggunakan fitur ini.",
      );
    }

    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
    });

    if (!product) {
      throw new BadRequestException("Product not found");
    }

    const boostedUntil = new Date();
    boostedUntil.setDate(boostedUntil.getDate() + daysToBoost);

    // Boost GRATIS untuk semua user yang berlangganan
    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        isBoosted: true,
        boostedUntil,
      },
    });

    this.logger.log(`Product ${productId} boosted successfully (${tenant.subscriptionPlan} plan) for ${daysToBoost} days`);

    return {
      message: `Product berhasil di-boost untuk ${daysToBoost} hari`,
      product: updated,
      boostUntil: boostedUntil,
      plan: tenant.subscriptionPlan,
    };
  }

  /**
   * Get product by slug (SEO-friendly lookup)
   */
  async getProductBySlug(tenantId: string, slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { tenantId, slug, deletedAt: null },
      include: {
        category: { 
          select: { 
            id: true, 
            name: true, 
            slug: true,
            parentId: true,
            parent: {
              select: {
                id: true,
                name: true,
                slug: true,
              }
            }
          } 
        },
        tenant: { select: { id: true, name: true, subdomain: true } },
      },
    });

    if (!product) {
      throw new BadRequestException("Product not found");
    }

    return {
      product,
      seo: {
        title: product.metaTitle || product.name,
        description:
          product.metaDescription || product.description.substring(0, 160),
        keywords: product.tags.join(", "),
        ogImage: product.thumbnail || product.images[0],
        canonicalUrl: `/${product.tenant.subdomain}/products/${product.slug}`,
      },
      structuredData: {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description.substring(0, 500),
        image: product.images,
        brand: { "@type": "Organization", name: product.tenant.name },
        offers: {
          "@type": "Offer",
          price: product.price,
          priceCurrency: "USD",
          availability:
            product.stock && product.stock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
        },
      },
    };
  }

  /**
   * Toggle marketplace visibility for a product
   */
  async toggleMarketplaceVisibility(
    tenantId: string,
    userId: string,
    productId: string,
    publish: boolean,
  ) {
    await this.verifyTenantOwnership(tenantId, userId);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException("Tenant not found");

    // Seller FREE dan Member sama-sama bisa publish ke marketplace
    // Tidak ada pembatasan berdasarkan tier

    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
    });
    if (!product) throw new NotFoundException("Product not found");

    await this.prisma.product.update({
      where: { id: productId },
      data: { publishToMarketplace: publish },
    });

    return {
      message: publish
        ? "Produk dipublish ke marketplace utama"
        : "Produk dihapus dari marketplace utama",
    };
  }

  /**
   * Generate unique slug within tenant scope
   */
  private async generateUniqueSlug(
    tenantId: string,
    text: string,
  ): Promise<string> {
    let slug = StringHelper.slugify(text);
    let suffix = 0;
    let candidate = slug;

    while (true) {
      const existing = await this.prisma.product.findFirst({
        where: { tenantId, slug: candidate, deletedAt: null },
      });
      if (!existing) return candidate;
      suffix++;
      candidate = `${slug}-${suffix}`;
    }
  }
}
