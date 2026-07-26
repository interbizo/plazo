import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CreateTutorialDto, UpdateTutorialDto, TutorialCategory, TutorialTargetRole } from "./tutorial.dto";
import { StringHelper } from "../../common/utils/string.helper";
import { PaginationHelper } from "../../common/utils/pagination.helper";

@Injectable()
export class TutorialService {
  constructor(private prisma: PrismaService) {}

  // ============ PUBLIC ENDPOINTS ============

  async getPublicTutorials(params: {
    page?: number;
    limit?: number;
    category?: TutorialCategory;
    targetRole?: TutorialTargetRole;
    search?: string;
  }) {
    try {
      const { page = 1, limit = 20, category, targetRole, search } = params;
      const { skip, take } = PaginationHelper.calculatePagination(page, limit);

      const where: any = {
        isPublished: true,
      };

      if (category) {
        where.category = category;
      }

      if (targetRole) {
        where.targetRole = { in: [targetRole, TutorialTargetRole.ALL] };
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ];
      }

      const [tutorials, total] = await Promise.all([
        this.prisma.tutorial.findMany({
          where,
          skip,
          take,
          orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            category: true,
            targetRole: true,
            thumbnail: true,
            videoUrl: true,
            isFeatured: true,
            viewCount: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        this.prisma.tutorial.count({ where }),
      ]);

      return PaginationHelper.formatResponse(tutorials, total, page, limit);
    } catch (error) {
      console.error('Error fetching tutorials:', error);
      // Return empty result instead of throwing error
      return PaginationHelper.formatResponse([], 0, params.page || 1, params.limit || 20);
    }
  }

  async getPublicTutorialBySlug(slug: string) {
    const tutorial = await this.prisma.tutorial.findUnique({
      where: { slug, isPublished: true },
    });

    if (!tutorial) {
      throw new NotFoundException("Tutorial tidak ditemukan");
    }

    // Increment view count
    await this.prisma.tutorial.update({
      where: { id: tutorial.id },
      data: { viewCount: { increment: 1 } },
    });

    return { tutorial };
  }

  async getFeaturedTutorials(targetRole?: TutorialTargetRole) {
    try {
      const where: any = {
        isPublished: true,
        isFeatured: true,
      };

      if (targetRole) {
        where.targetRole = { in: [targetRole, TutorialTargetRole.ALL] };
      }

      const tutorials = await this.prisma.tutorial.findMany({
        where,
        take: 6,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          category: true,
          thumbnail: true,
          videoUrl: true,
          viewCount: true,
        },
      });

      return { tutorials };
    } catch (error) {
      console.error('Error fetching featured tutorials:', error);
      // Return empty array instead of throwing error
      return { tutorials: [] };
    }
  }

  // ============ ADMIN ENDPOINTS ============

  async getAllTutorials(params: {
    page?: number;
    limit?: number;
    category?: TutorialCategory;
    targetRole?: TutorialTargetRole;
    isPublished?: boolean;
    search?: string;
  }) {
    const { page = 1, limit = 20, category, targetRole, isPublished, search } = params;
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (targetRole) {
      where.targetRole = targetRole;
    }

    if (typeof isPublished === "boolean") {
      where.isPublished = isPublished;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
      ];
    }

    const [tutorials, total] = await Promise.all([
      this.prisma.tutorial.findMany({
        where,
        skip,
        take,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      }),
      this.prisma.tutorial.count({ where }),
    ]);

    return PaginationHelper.formatResponse(tutorials, total, page, limit);
  }

  async getTutorialById(id: string) {
    const tutorial = await this.prisma.tutorial.findUnique({
      where: { id },
    });

    if (!tutorial) {
      throw new NotFoundException("Tutorial tidak ditemukan");
    }

    return { tutorial };
  }

  async createTutorial(dto: CreateTutorialDto) {
    // Generate slug if not provided
    const slug = dto.slug || StringHelper.slugify(dto.title);

    // Check if slug already exists
    const existing = await this.prisma.tutorial.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new BadRequestException("Slug sudah digunakan");
    }

    const tutorial = await this.prisma.tutorial.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        content: dto.content,
        category: dto.category,
        targetRole: dto.targetRole,
        thumbnail: dto.thumbnail,
        videoUrl: dto.videoUrl,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        sortOrder: dto.sortOrder ?? 0,
        isPublished: dto.isPublished ?? true,
        isFeatured: dto.isFeatured ?? false,
        publishedAt: dto.isPublished ? new Date() : null,
      },
    });

    return {
      message: "Tutorial berhasil dibuat",
      tutorial,
    };
  }

  async updateTutorial(id: string, dto: UpdateTutorialDto) {
    const existing = await this.prisma.tutorial.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException("Tutorial tidak ditemukan");
    }

    // Check slug uniqueness if slug is being updated
    if (dto.slug && dto.slug !== existing.slug) {
      const slugExists = await this.prisma.tutorial.findUnique({
        where: { slug: dto.slug },
      });

      if (slugExists) {
        throw new BadRequestException("Slug sudah digunakan");
      }
    }

    const updateData: any = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.targetRole !== undefined) updateData.targetRole = dto.targetRole;
    if (dto.thumbnail !== undefined) updateData.thumbnail = dto.thumbnail;
    if (dto.videoUrl !== undefined) updateData.videoUrl = dto.videoUrl;
    if (dto.metaTitle !== undefined) updateData.metaTitle = dto.metaTitle;
    if (dto.metaDescription !== undefined) updateData.metaDescription = dto.metaDescription;
    if (dto.sortOrder !== undefined) updateData.sortOrder = dto.sortOrder;
    if (dto.isFeatured !== undefined) updateData.isFeatured = dto.isFeatured;

    // Handle publish status
    if (dto.isPublished !== undefined) {
      updateData.isPublished = dto.isPublished;
      if (dto.isPublished && !existing.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const tutorial = await this.prisma.tutorial.update({
      where: { id },
      data: updateData,
    });

    return {
      message: "Tutorial berhasil diupdate",
      tutorial,
    };
  }

  async deleteTutorial(id: string) {
    const existing = await this.prisma.tutorial.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException("Tutorial tidak ditemukan");
    }

    await this.prisma.tutorial.delete({
      where: { id },
    });

    return {
      message: "Tutorial berhasil dihapus",
    };
  }

  async getTutorialStats() {
    const [total, published, featured, byCategory, byTargetRole] = await Promise.all([
      this.prisma.tutorial.count(),
      this.prisma.tutorial.count({ where: { isPublished: true } }),
      this.prisma.tutorial.count({ where: { isFeatured: true } }),
      this.prisma.tutorial.groupBy({
        by: ["category"],
        _count: true,
      }),
      this.prisma.tutorial.groupBy({
        by: ["targetRole"],
        _count: true,
      }),
    ]);

    return {
      total,
      published,
      featured,
      byCategory,
      byTargetRole,
    };
  }
}
