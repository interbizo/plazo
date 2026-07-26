import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";
import { CreateRecommendedToolDto, UpdateRecommendedToolDto } from "./recommended-tools.dto";

@Injectable()
export class RecommendedToolsService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // SUPER ADMIN: CRUD
  // ============================================

  /**
   * Create a new recommended tool
   */
  async create(adminId: string, dto: CreateRecommendedToolDto) {
    // Validasi: untuk EBOOK_PDF, fileUrl atau redirectUrl harus ada
    if (dto.type === "EBOOK_PDF" && !dto.fileUrl && !dto.redirectUrl) {
      throw new BadRequestException("File URL atau Redirect URL wajib diisi untuk tipe Ebook/PDF");
    }
    if (dto.type !== "EBOOK_PDF" && !dto.redirectUrl) {
      throw new BadRequestException("Redirect URL wajib diisi untuk tipe Aplikasi/Website/Tools");
    }

    const tool = await this.prisma.recommendedTool.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type as any,
        fileUrl: dto.fileUrl,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        redirectUrl: dto.redirectUrl,
        thumbnail: dto.thumbnail,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
        createdBy: adminId,
      },
    });

    return {
      message: `Tools "${tool.title}" berhasil ditambahkan`,
      tool,
    };
  }

  /**
   * Get all tools (admin view — includes inactive)
   */
  async findAll(includeInactive: boolean = true) {
    const where = includeInactive ? {} : { isActive: true };

    const tools = await this.prisma.recommendedTool.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return { data: tools };
  }

  /**
   * Get single tool by ID
   */
  async findById(id: string) {
    const tool = await this.prisma.recommendedTool.findUnique({
      where: { id },
    });

    if (!tool) {
      throw new NotFoundException("Tools tidak ditemukan");
    }

    return { tool };
  }

  /**
   * Update a tool
   */
  async update(id: string, dto: UpdateRecommendedToolDto) {
    const existing = await this.prisma.recommendedTool.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException("Tools tidak ditemukan");
    }

    // Validasi: jika type berubah, cek field wajib
    const finalType = dto.type || existing.type;
    const finalFileUrl = dto.fileUrl !== undefined ? dto.fileUrl : existing.fileUrl;
    const finalRedirectUrl = dto.redirectUrl !== undefined ? dto.redirectUrl : existing.redirectUrl;

    if (finalType === "EBOOK_PDF" && !finalFileUrl && !finalRedirectUrl) {
      throw new BadRequestException("File URL atau Redirect URL wajib diisi untuk tipe Ebook/PDF");
    }
    if (finalType !== "EBOOK_PDF" && !finalRedirectUrl) {
      throw new BadRequestException("Redirect URL wajib diisi untuk tipe Aplikasi/Website/Tools");
    }

    const tool = await this.prisma.recommendedTool.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.type !== undefined && { type: dto.type as any }),
        ...(dto.fileUrl !== undefined && { fileUrl: dto.fileUrl }),
        ...(dto.fileName !== undefined && { fileName: dto.fileName }),
        ...(dto.fileSize !== undefined && { fileSize: dto.fileSize }),
        ...(dto.redirectUrl !== undefined && { redirectUrl: dto.redirectUrl }),
        ...(dto.thumbnail !== undefined && { thumbnail: dto.thumbnail }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });

    return {
      message: `Tools "${tool.title}" berhasil diperbarui`,
      tool,
    };
  }

  /**
   * Delete a tool
   */
  async delete(id: string) {
    const existing = await this.prisma.recommendedTool.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException("Tools tidak ditemukan");
    }

    await this.prisma.recommendedTool.delete({ where: { id } });

    return { message: `Tools "${existing.title}" berhasil dihapus` };
  }

  /**
   * Toggle active status
   */
  async toggleStatus(id: string) {
    const existing = await this.prisma.recommendedTool.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException("Tools tidak ditemukan");
    }

    const tool = await this.prisma.recommendedTool.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    return {
      message: tool.isActive
        ? `Tools "${tool.title}" diaktifkan`
        : `Tools "${tool.title}" dinonaktifkan`,
      tool,
    };
  }

  // ============================================
  // SELLER PREMIUM: Read Only (active tools)
  // ============================================

  /**
   * Get active tools for seller premium
   * Validates that the seller has premium subscription
   */
  async getToolsForSeller(userId: string) {
    // Check seller is premium
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId, isActive: true, deletedAt: null },
      select: { sellerTier: true, subscriptionPlan: true },
    });

    if (!tenant) {
      throw new ForbiddenException("Toko tidak ditemukan");
    }

    if (tenant.sellerTier === "FREE") {
      throw new ForbiddenException(
        "Fitur Tools Rekomendasi hanya tersedia untuk seller premium. Silakan upgrade paket Anda.",
      );
    }

    // Return only active tools
    const tools = await this.prisma.recommendedTool.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return { data: tools };
  }

  /**
   * Get single tool for seller premium (with access check)
   */
  async getToolForSeller(userId: string, toolId: string) {
    // Check seller is premium
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId, isActive: true, deletedAt: null },
      select: { sellerTier: true },
    });

    if (!tenant || tenant.sellerTier === "FREE") {
      throw new ForbiddenException(
        "Fitur Tools Rekomendasi hanya tersedia untuk seller premium.",
      );
    }

    const tool = await this.prisma.recommendedTool.findFirst({
      where: { id: toolId, isActive: true },
    });

    if (!tool) {
      throw new NotFoundException("Tools tidak ditemukan atau tidak aktif");
    }

    return { tool };
  }
}
