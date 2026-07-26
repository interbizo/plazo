import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";
import {
  UpdateThemeDto,
  UpdateStoreInfoDto,
  UpdateSocialLinksDto,
  CreateStorePageDto,
  UpdateStorePageDto,
  CreateStoreMenuDto,
  UpdateStoreMenuDto,
  BulkUpdateMenuOrderDto,
} from "./store-cms.dto";

@Injectable()
export class StoreCmsService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // THEME CUSTOMIZATION
  // ============================================

  async updateTheme(userId: string, dto: UpdateThemeDto) {
    const tenant = await this.getUserTenant(userId);

    const updated = await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        themeColor: dto.themeColor,
        themeSecondary: dto.themeSecondary,
        themePreset: dto.themePreset,
        themeFontFamily: dto.themeFontFamily,
        themeBorderRadius: dto.themeBorderRadius,
        themeShadowStyle: dto.themeShadowStyle,
      },
    });

    return {
      message: "Theme berhasil diperbarui",
      theme: {
        themeColor: updated.themeColor,
        themeSecondary: updated.themeSecondary,
        themePreset: updated.themePreset,
        themeFontFamily: updated.themeFontFamily,
        themeBorderRadius: updated.themeBorderRadius,
        themeShadowStyle: updated.themeShadowStyle,
      },
    };
  }

  async getTheme(userId: string) {
    const tenant = await this.getUserTenant(userId);

    return {
      themeColor: tenant.themeColor,
      themeSecondary: tenant.themeSecondary,
      themePreset: tenant.themePreset,
      themeFontFamily: tenant.themeFontFamily,
      themeBorderRadius: tenant.themeBorderRadius,
      themeShadowStyle: tenant.themeShadowStyle,
    };
  }

  // ============================================
  // STORE INFO
  // ============================================

  async updateStoreInfo(userId: string, dto: UpdateStoreInfoDto) {
    const tenant = await this.getUserTenant(userId);

    const updated = await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.tagline !== undefined && { tagline: dto.tagline }),
        ...(dto.logo !== undefined && { logo: dto.logo }),
        ...(dto.banner !== undefined && { banner: dto.banner }),
        ...(dto.favicon !== undefined && { favicon: dto.favicon }),
        ...(dto.contactEmail !== undefined && { contactEmail: dto.contactEmail }),
        ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
        ...(dto.contactWhatsapp !== undefined && { contactWhatsapp: dto.contactWhatsapp }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.storeAnnouncement !== undefined && { storeAnnouncement: dto.storeAnnouncement }),
      },
    });

    return {
      message: "Informasi toko berhasil diperbarui",
      store: updated,
    };
  }

  async updateSocialLinks(userId: string, dto: UpdateSocialLinksDto) {
    const tenant = await this.getUserTenant(userId);

    const updated = await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        socialLinks: dto.socialLinks as any,
      },
    });

    return {
      message: "Social links berhasil diperbarui",
      socialLinks: updated.socialLinks,
    };
  }

  // ============================================
  // STORE PAGES
  // ============================================

  async createPage(userId: string, dto: CreateStorePageDto) {
    const tenant = await this.getUserTenant(userId);

    // Check if slug already exists
    const existing = await this.prisma.storePage.findUnique({
      where: {
        tenantId_slug: {
          tenantId: tenant.id,
          slug: dto.slug,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`Halaman dengan slug "${dto.slug}" sudah ada`);
    }

    const page = await this.prisma.storePage.create({
      data: {
        tenantId: tenant.id,
        slug: dto.slug,
        title: dto.title,
        content: dto.content,
        excerpt: dto.excerpt,
        isPublished: dto.isPublished ?? true,
        sortOrder: dto.sortOrder ?? 0,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
      },
    });

    return {
      message: `Halaman "${page.title}" berhasil dibuat`,
      page,
    };
  }

  async getPages(userId: string) {
    const tenant = await this.getUserTenant(userId);

    const pages = await this.prisma.storePage.findMany({
      where: { tenantId: tenant.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return { pages };
  }

  async getPage(userId: string, pageId: string) {
    const tenant = await this.getUserTenant(userId);

    const page = await this.prisma.storePage.findFirst({
      where: {
        id: pageId,
        tenantId: tenant.id,
      },
    });

    if (!page) {
      throw new NotFoundException("Halaman tidak ditemukan");
    }

    return { page };
  }

  async updatePage(userId: string, pageId: string, dto: UpdateStorePageDto) {
    const tenant = await this.getUserTenant(userId);

    const existing = await this.prisma.storePage.findFirst({
      where: {
        id: pageId,
        tenantId: tenant.id,
      },
    });

    if (!existing) {
      throw new NotFoundException("Halaman tidak ditemukan");
    }

    // Check slug uniqueness if changing
    if (dto.slug && dto.slug !== existing.slug) {
      const slugExists = await this.prisma.storePage.findUnique({
        where: {
          tenantId_slug: {
            tenantId: tenant.id,
            slug: dto.slug,
          },
        },
      });

      if (slugExists) {
        throw new BadRequestException(`Halaman dengan slug "${dto.slug}" sudah ada`);
      }
    }

    const page = await this.prisma.storePage.update({
      where: { id: pageId },
      data: {
        ...(dto.slug && { slug: dto.slug }),
        ...(dto.title && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.excerpt !== undefined && { excerpt: dto.excerpt }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.metaTitle !== undefined && { metaTitle: dto.metaTitle }),
        ...(dto.metaDescription !== undefined && { metaDescription: dto.metaDescription }),
      },
    });

    return {
      message: `Halaman "${page.title}" berhasil diperbarui`,
      page,
    };
  }

  async deletePage(userId: string, pageId: string) {
    const tenant = await this.getUserTenant(userId);

    const existing = await this.prisma.storePage.findFirst({
      where: {
        id: pageId,
        tenantId: tenant.id,
      },
    });

    if (!existing) {
      throw new NotFoundException("Halaman tidak ditemukan");
    }

    await this.prisma.storePage.delete({
      where: { id: pageId },
    });

    return {
      message: `Halaman "${existing.title}" berhasil dihapus`,
    };
  }

  // ============================================
  // STORE MENU
  // ============================================

  async createMenu(userId: string, dto: CreateStoreMenuDto) {
    const tenant = await this.getUserTenant(userId);

    // Validate parent if provided
    if (dto.parentId) {
      const parent = await this.prisma.storeMenu.findFirst({
        where: {
          id: dto.parentId,
          tenantId: tenant.id,
        },
      });

      if (!parent) {
        throw new BadRequestException("Parent menu tidak ditemukan");
      }
    }

    // Validate page slug if type is "page"
    if (dto.type === "page" && dto.pageSlug) {
      const page = await this.prisma.storePage.findUnique({
        where: {
          tenantId_slug: {
            tenantId: tenant.id,
            slug: dto.pageSlug,
          },
        },
      });

      if (!page) {
        throw new BadRequestException(`Halaman dengan slug "${dto.pageSlug}" tidak ditemukan`);
      }
    }

    const menu = await this.prisma.storeMenu.create({
      data: {
        tenantId: tenant.id,
        label: dto.label,
        type: dto.type,
        url: dto.url,
        pageSlug: dto.pageSlug,
        icon: dto.icon,
        isVisible: dto.isVisible ?? true,
        sortOrder: dto.sortOrder ?? 0,
        parentId: dto.parentId,
      },
    });

    return {
      message: `Menu "${menu.label}" berhasil dibuat`,
      menu,
    };
  }

  async getMenus(userId: string) {
    const tenant = await this.getUserTenant(userId);

    const menus = await this.prisma.storeMenu.findMany({
      where: { tenantId: tenant.id },
      include: {
        children: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    // Return only top-level menus (no parent)
    const topLevelMenus = menus.filter((m: any) => !m.parentId);

    return { menus: topLevelMenus };
  }

  async getMenu(userId: string, menuId: string) {
    const tenant = await this.getUserTenant(userId);

    const menu = await this.prisma.storeMenu.findFirst({
      where: {
        id: menuId,
        tenantId: tenant.id,
      },
      include: {
        children: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!menu) {
      throw new NotFoundException("Menu tidak ditemukan");
    }

    return { menu };
  }

  async updateMenu(userId: string, menuId: string, dto: UpdateStoreMenuDto) {
    const tenant = await this.getUserTenant(userId);

    const existing = await this.prisma.storeMenu.findFirst({
      where: {
        id: menuId,
        tenantId: tenant.id,
      },
    });

    if (!existing) {
      throw new NotFoundException("Menu tidak ditemukan");
    }

    // Validate parent if changing
    if (dto.parentId !== undefined) {
      if (dto.parentId === menuId) {
        throw new BadRequestException("Menu tidak bisa menjadi parent dari dirinya sendiri");
      }

      if (dto.parentId) {
        const parent = await this.prisma.storeMenu.findFirst({
          where: {
            id: dto.parentId,
            tenantId: tenant.id,
          },
        });

        if (!parent) {
          throw new BadRequestException("Parent menu tidak ditemukan");
        }
      }
    }

    // Validate page slug if type is "page"
    if (dto.type === "page" && dto.pageSlug) {
      const page = await this.prisma.storePage.findUnique({
        where: {
          tenantId_slug: {
            tenantId: tenant.id,
            slug: dto.pageSlug,
          },
        },
      });

      if (!page) {
        throw new BadRequestException(`Halaman dengan slug "${dto.pageSlug}" tidak ditemukan`);
      }
    }

    const menu = await this.prisma.storeMenu.update({
      where: { id: menuId },
      data: {
        ...(dto.label && { label: dto.label }),
        ...(dto.type && { type: dto.type }),
        ...(dto.url !== undefined && { url: dto.url }),
        ...(dto.pageSlug !== undefined && { pageSlug: dto.pageSlug }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.isVisible !== undefined && { isVisible: dto.isVisible }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      },
    });

    return {
      message: `Menu "${menu.label}" berhasil diperbarui`,
      menu,
    };
  }

  async deleteMenu(userId: string, menuId: string) {
    const tenant = await this.getUserTenant(userId);

    const existing = await this.prisma.storeMenu.findFirst({
      where: {
        id: menuId,
        tenantId: tenant.id,
      },
    });

    if (!existing) {
      throw new NotFoundException("Menu tidak ditemukan");
    }

    // Delete menu and its children (cascade)
    await this.prisma.storeMenu.delete({
      where: { id: menuId },
    });

    return {
      message: `Menu "${existing.label}" berhasil dihapus`,
    };
  }

  async bulkUpdateMenuOrder(userId: string, dto: BulkUpdateMenuOrderDto) {
    const tenant = await this.getUserTenant(userId);

    // Update all menus in a transaction
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.storeMenu.updateMany({
          where: {
            id: item.id,
            tenantId: tenant.id,
          },
          data: {
            sortOrder: item.sortOrder,
            parentId: item.parentId,
          },
        }),
      ),
    );

    return {
      message: "Urutan menu berhasil diperbarui",
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async getUserTenant(userId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        ownerId: userId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!tenant) {
      throw new ForbiddenException("Toko tidak ditemukan atau tidak aktif");
    }

    return tenant;
  }
}
