import { PrismaService } from '@modules/database/prisma.service';

export class CategoryHelper {
  /**
   * Get all category IDs including the category itself and all its subcategories (recursive)
   * @param prisma Prisma service instance
   * @param categoryId Category ID to start from
   * @returns Array of category IDs (including the parent and all descendants)
   */
  static async getAllCategoryIdsIncludingChildren(
    prisma: PrismaService,
    categoryId: string,
  ): Promise<string[]> {
    const categoryIds: string[] = [categoryId];
    
    // Get all direct children
    const children = await prisma.category.findMany({
      where: { parentId: categoryId },
      select: { id: true },
    });

    // Recursively get children of children
    for (const child of children) {
      const childIds = await this.getAllCategoryIdsIncludingChildren(
        prisma,
        child.id,
      );
      categoryIds.push(...childIds);
    }

    return categoryIds;
  }

  /**
   * Get all category IDs including the category itself and all its parent categories (up the tree)
   * @param prisma Prisma service instance
   * @param categoryId Category ID to start from
   * @returns Array of category IDs (including the child and all ancestors)
   */
  static async getAllCategoryIdsIncludingParents(
    prisma: PrismaService,
    categoryId: string,
  ): Promise<string[]> {
    const categoryIds: string[] = [categoryId];
    
    // Get the category with its parent
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { parentId: true },
    });

    // If has parent, recursively get parent's parents
    if (category?.parentId) {
      const parentIds = await this.getAllCategoryIdsIncludingParents(
        prisma,
        category.parentId,
      );
      categoryIds.push(...parentIds);
    }

    return categoryIds;
  }

  /**
   * Get category ID from slug, then get all related category IDs (including children)
   * @param prisma Prisma service instance
   * @param categorySlug Category slug
   * @param type Category type (PRODUCT or SERVICE)
   * @returns Array of category IDs or null if category not found
   */
  static async getCategoryIdsFromSlug(
    prisma: PrismaService,
    categorySlug: string,
    type: 'PRODUCT' | 'SERVICE',
  ): Promise<string[] | null> {
    const category = await prisma.category.findFirst({
      where: { slug: categorySlug, type },
      select: { id: true },
    });

    if (!category) return null;

    return this.getAllCategoryIdsIncludingChildren(prisma, category.id);
  }

  /**
   * Get the root (top-level) category for a given category
   * @param prisma Prisma service instance
   * @param categoryId Category ID
   * @returns Root category or the category itself if it's already root
   */
  static async getRootCategory(
    prisma: PrismaService,
    categoryId: string,
  ): Promise<{ id: string; name: string; slug: string; parentId: string | null } | null> {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true, slug: true, parentId: true },
    });

    if (!category) return null;

    // If no parent, this is the root
    if (!category.parentId) return category;

    // Recursively find the root
    return this.getRootCategory(prisma, category.parentId);
  }
}
