import { Injectable } from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";
import { CategoryHelper } from "@common/helpers/category.helper";
import { CreateCategoryDto } from "./categories.dto";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { StringHelper } from "@common/utils/string.helper";

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create Category (Admin only)
   */
  async createCategory(createCategoryDto: CreateCategoryDto) {
    const slug =
      createCategoryDto.slug || StringHelper.slugify(createCategoryDto.name);

    // Check if slug already exists for this type
    const existing = await this.prisma.category.findFirst({
      where: { 
        slug,
        type: createCategoryDto.type
      },
    });

    if (existing) {
      throw new ConflictException("Category slug already exists for this type");
    }

    // Validate parent category if provided
    if (createCategoryDto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: createCategoryDto.parentId },
      });

      if (!parent) {
        throw new BadRequestException("Parent category not found");
      }

      // Ensure parent has the same type
      if (parent.type !== createCategoryDto.type) {
        throw new BadRequestException("Parent category must have the same type");
      }
    }

    const category = await this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
        description: createCategoryDto.description,
        slug,
        type: createCategoryDto.type,
        parentId: createCategoryDto.parentId,
        icon: createCategoryDto.icon,
        sortOrder: createCategoryDto.sortOrder ?? 0,
        isActive: createCategoryDto.isActive ?? true,
      },
      include: {
        parent: true,
        _count: {
          select: {
            children: true,
          },
        },
      },
    });

    return {
      message: "Category created successfully",
      category,
    };
  }

  /**
   * Get All Categories with hierarchy
   */
  async getCategories(type?: string, includeInactive?: boolean) {
    const where: any = {};
    if (type) where.type = type;
    if (!includeInactive) where.isActive = true;

    // Get all categories
    const allCategories = await this.prisma.category.findMany({
      where,
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ],
      include: {
        parent: true,
        _count: {
          select: {
            products: true,
            services: true,
            children: true,
          },
        },
      },
    });

    // Calculate counts including subcategories
    const categoriesWithCounts = await Promise.all(
      allCategories.map(async (cat) => {
        // Get all category IDs including children
        const categoryIds = await CategoryHelper.getAllCategoryIdsIncludingChildren(
          this.prisma,
          cat.id,
        );

        // Count products in this category and all subcategories
        const productsCount = await this.prisma.product.count({
          where: {
            categoryId: { in: categoryIds },
            isPublished: true,
            publishToMarketplace: true,
            deletedAt: null,
          },
        });

        // Count services in this category and all subcategories
        const servicesCount = await this.prisma.service.count({
          where: {
            categoryId: { in: categoryIds },
            isPublished: true,
            publishToMarketplace: true,
            deletedAt: null,
          },
        });

        return {
          ...cat,
          _count: {
            ...cat._count,
            products: productsCount,
            services: servicesCount,
          },
        };
      })
    );

    // Build hierarchy
    const categoryMap = new Map();
    const rootCategories: any[] = [];

    // First pass: create map
    categoriesWithCounts.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Second pass: build hierarchy
    categoriesWithCounts.forEach(cat => {
      const category = categoryMap.get(cat.id);
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children.push(category);
        }
      } else {
        rootCategories.push(category);
      }
    });

    return { 
      categories: categoriesWithCounts, // Return flat list as main response for easier frontend processing
      hierarchical: rootCategories, // Also provide hierarchical structure if needed
      allCategories: categoriesWithCounts // Keep for backward compatibility
    };
  }

  /**
   * Get Category by ID with children
   */
  async getCategory(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        parent: true,
        children: {
          orderBy: [
            { sortOrder: 'asc' },
            { name: 'asc' }
          ],
          include: {
            _count: {
              select: {
                products: true,
                services: true,
                children: true,
              },
            },
          },
        },
        _count: {
          select: {
            products: true,
            services: true,
            children: true,
          },
        },
      },
    });

    if (!category) {
      throw new BadRequestException("Category not found");
    }

    // Get all category IDs including children
    const categoryIds = await CategoryHelper.getAllCategoryIdsIncludingChildren(
      this.prisma,
      category.id,
    );

    // Count products in this category and all subcategories
    const productsCount = await this.prisma.product.count({
      where: {
        categoryId: { in: categoryIds },
        isPublished: true,
        publishToMarketplace: true,
        deletedAt: null,
      },
    });

    // Count services in this category and all subcategories
    const servicesCount = await this.prisma.service.count({
      where: {
        categoryId: { in: categoryIds },
        isPublished: true,
        publishToMarketplace: true,
        deletedAt: null,
      },
    });

    // Update counts for children as well
    const childrenWithCounts = await Promise.all(
      category.children.map(async (child) => {
        const childCategoryIds = await CategoryHelper.getAllCategoryIdsIncludingChildren(
          this.prisma,
          child.id,
        );

        const childProductsCount = await this.prisma.product.count({
          where: {
            categoryId: { in: childCategoryIds },
            isPublished: true,
            publishToMarketplace: true,
            deletedAt: null,
          },
        });

        const childServicesCount = await this.prisma.service.count({
          where: {
            categoryId: { in: childCategoryIds },
            isPublished: true,
            publishToMarketplace: true,
            deletedAt: null,
          },
        });

        return {
          ...child,
          _count: {
            ...child._count,
            products: childProductsCount,
            services: childServicesCount,
          },
        };
      })
    );

    return { 
      category: {
        ...category,
        _count: {
          ...category._count,
          products: productsCount,
          services: servicesCount,
        },
        children: childrenWithCounts,
      }
    };
  }

  /**
   * Update Category (Admin only)
   */
  async updateCategory(
    categoryId: string,
    updateCategoryDto: CreateCategoryDto,
  ) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new BadRequestException("Category not found");
    }

    // Validate parent category if provided
    if (updateCategoryDto.parentId) {
      // Prevent self-reference
      if (updateCategoryDto.parentId === categoryId) {
        throw new BadRequestException("Category cannot be its own parent");
      }

      const parent = await this.prisma.category.findUnique({
        where: { id: updateCategoryDto.parentId },
      });

      if (!parent) {
        throw new BadRequestException("Parent category not found");
      }

      // Ensure parent has the same type
      if (parent.type !== (updateCategoryDto.type || category.type)) {
        throw new BadRequestException("Parent category must have the same type");
      }

      // Prevent circular reference (check if parent is a child of this category)
      const isCircular = await this.checkCircularReference(
        categoryId,
        updateCategoryDto.parentId
      );

      if (isCircular) {
        throw new BadRequestException("Circular reference detected");
      }
    }

    const updated = await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        name: updateCategoryDto.name,
        description: updateCategoryDto.description,
        slug: updateCategoryDto.slug,
        type: updateCategoryDto.type,
        parentId: updateCategoryDto.parentId,
        icon: updateCategoryDto.icon,
        sortOrder: updateCategoryDto.sortOrder,
        isActive: updateCategoryDto.isActive,
      },
      include: {
        parent: true,
        _count: {
          select: {
            children: true,
          },
        },
      },
    });

    return {
      message: "Category updated successfully",
      category: updated,
    };
  }

  /**
   * Delete Category (Admin only)
   */
  async deleteCategory(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: {
            products: true,
            services: true,
            children: true,
          },
        },
      },
    });

    if (!category) {
      throw new BadRequestException("Category not found");
    }

    if (category._count.products > 0 || category._count.services > 0) {
      throw new BadRequestException(
        "Cannot delete category with existing products or services",
      );
    }

    if (category._count.children > 0) {
      throw new BadRequestException(
        "Cannot delete category with sub-categories. Please delete or move sub-categories first.",
      );
    }

    await this.prisma.category.delete({
      where: { id: categoryId },
    });

    return { message: "Category deleted successfully" };
  }

  /**
   * Check for circular reference in category hierarchy
   */
  private async checkCircularReference(
    categoryId: string,
    potentialParentId: string
  ): Promise<boolean> {
    let currentId = potentialParentId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === categoryId) {
        return true; // Circular reference found
      }

      if (visited.has(currentId)) {
        break; // Already checked this path
      }

      visited.add(currentId);

      const parent = await this.prisma.category.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

      if (!parent || !parent.parentId) {
        break;
      }

      currentId = parent.parentId;
    }

    return false;
  }

  /**
   * Get category breadcrumb (path from root to category)
   */
  async getCategoryBreadcrumb(categoryId: string) {
    const breadcrumb: any[] = [];
    let currentId = categoryId;

    while (currentId) {
      const category = await this.prisma.category.findUnique({
        where: { id: currentId },
        select: {
          id: true,
          name: true,
          slug: true,
          parentId: true,
        },
      });

      if (!category) break;

      breadcrumb.unshift(category);
      currentId = category.parentId || '';
    }

    return { breadcrumb };
  }
}
