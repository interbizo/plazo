import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";
import { ViewTrackerService } from "@common/services/view-tracker.service";
import { PaginationHelper } from "@common/utils/pagination.helper";
import { StringHelper } from "@common/utils/string.helper";
import {
  ArticleListQueryDto,
  ArticleStatusDto,
  CreateArticleCategoryDto,
  CreateArticleDto,
  PublicArticleListQueryDto,
  UpdateArticleCategoryDto,
  UpdateArticleDto,
} from "./articles.dto";

const MIN_PUBLISH_WORDS = 800;
const MAX_ARTICLE_WORDS = 1600;
const WORDS_PER_MINUTE = 200;

type CsvImportError = {
  row: number;
  title?: string;
  message: string;
};

@Injectable()
export class ArticlesService {
  constructor(
    private prisma: PrismaService,
    private viewTracker: ViewTrackerService,
  ) {}

  async listAdmin(query: ArticleListQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where = this.buildArticleWhere(query, false);

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take,
        include: { category: true },
        orderBy: [{ updatedAt: "desc" }],
      }),
      this.prisma.article.count({ where }),
    ]);

    return PaginationHelper.formatPaginatedResponse(
      articles,
      total,
      page,
      limit,
    );
  }

  async listPublic(query: PublicArticleListQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 12;
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where = this.buildArticleWhere(
      { ...query, status: ArticleStatusDto.PUBLISHED },
      true,
    );

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          thumbnail: true,
          tags: true,
          wordCount: true,
          readingTimeMinutes: true,
          viewCount: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      }),
      this.prisma.article.count({ where }),
    ]);

    return PaginationHelper.formatPaginatedResponse(
      articles,
      total,
      page,
      limit,
    );
  }

  async getAdminArticle(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!article) {
      throw new NotFoundException("Artikel tidak ditemukan");
    }

    return { article };
  }

  async getPublicArticleBySlug(slug: string) {
    const article = await this.prisma.article.findFirst({
      where: {
        slug,
        status: ArticleStatusDto.PUBLISHED,
        OR: [{ categoryId: null }, { category: { isActive: true } }],
      },
      include: { category: true },
    });

    if (!article) {
      throw new NotFoundException("Artikel tidak ditemukan");
    }

    const related = await this.prisma.article.findMany({
      where: {
        id: { not: article.id },
        status: ArticleStatusDto.PUBLISHED,
        categoryId: article.categoryId || undefined,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        thumbnail: true,
        publishedAt: true,
        readingTimeMinutes: true,
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 3,
    });

    return { article, related };
  }

  async trackArticleView(id: string, ip: string, userId?: string) {
    const article = await this.prisma.article.findFirst({
      where: {
        id,
        status: ArticleStatusDto.PUBLISHED,
        OR: [{ categoryId: null }, { category: { isActive: true } }],
      },
      select: { id: true },
    });

    if (!article) {
      throw new NotFoundException("Artikel tidak ditemukan");
    }

    const counted = this.viewTracker.trackView("article", id, ip, userId);
    const viewCount = await this.viewTracker.getViewCount("article", id);

    return { counted, viewCount };
  }

  async createArticle(dto: CreateArticleDto, userId: string) {
    const status = dto.status || ArticleStatusDto.DRAFT;
    const contentStats = this.getContentStats(dto.content, status);
    const slug = await this.generateUniqueArticleSlug(dto.slug || dto.title);
    const youtubeUrl = this.normalizeYoutubeUrl(dto.youtubeUrl);

    const article = await this.prisma.article.create({
      data: {
        title: dto.title.trim(),
        slug,
        excerpt: this.cleanOptionalText(dto.excerpt) || this.buildExcerpt(dto.content),
        content: dto.content,
        thumbnail: this.cleanOptionalText(dto.thumbnail),
        youtubeUrl,
        categoryId: this.cleanOptionalText(dto.categoryId),
        tags: this.normalizeTags(dto.tags),
        status,
        source: "MANUAL",
        wordCount: contentStats.wordCount,
        readingTimeMinutes: contentStats.readingTimeMinutes,
        metaTitle: this.cleanNullableText(dto.metaTitle),
        metaDescription: this.cleanNullableText(dto.metaDescription),
        metaKeywords: this.cleanNullableText(dto.metaKeywords),
        ogImage: this.cleanNullableText(dto.ogImage),
        aiPrompt: this.cleanOptionalText(dto.aiPrompt),
        aiModel: this.cleanOptionalText(dto.aiModel),
        createdBy: userId,
        publishedAt: status === ArticleStatusDto.PUBLISHED ? new Date() : null,
      },
      include: { category: true },
    });

    return { article };
  }

  async updateArticle(id: string, dto: UpdateArticleDto) {
    const existing = await this.prisma.article.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException("Artikel tidak ditemukan");
    }

    const nextStatus = dto.status || existing.status;
    const nextContent = dto.content ?? existing.content;
    const contentStats = this.getContentStats(nextContent, nextStatus);
    const data: any = {
      ...dto,
      title: dto.title ? dto.title.trim() : undefined,
      excerpt:
        dto.excerpt !== undefined
          ? this.cleanNullableText(dto.excerpt)
          : undefined,
      content: dto.content,
      thumbnail:
        dto.thumbnail !== undefined
          ? this.cleanNullableText(dto.thumbnail)
          : undefined,
      youtubeUrl:
        dto.youtubeUrl !== undefined
          ? this.cleanOptionalText(dto.youtubeUrl)
            ? this.normalizeYoutubeUrl(dto.youtubeUrl)
            : null
          : undefined,
      categoryId:
        dto.categoryId !== undefined
          ? this.cleanNullableText(dto.categoryId)
          : undefined,
      tags: dto.tags !== undefined ? this.normalizeTags(dto.tags) : undefined,
      wordCount: contentStats.wordCount,
      readingTimeMinutes: contentStats.readingTimeMinutes,
      metaTitle:
        dto.metaTitle !== undefined
          ? this.cleanNullableText(dto.metaTitle)
          : undefined,
      metaDescription:
        dto.metaDescription !== undefined
          ? this.cleanNullableText(dto.metaDescription)
          : undefined,
      metaKeywords:
        dto.metaKeywords !== undefined
          ? this.cleanNullableText(dto.metaKeywords)
          : undefined,
      ogImage:
        dto.ogImage !== undefined ? this.cleanNullableText(dto.ogImage) : undefined,
      aiPrompt:
        dto.aiPrompt !== undefined
          ? this.cleanOptionalText(dto.aiPrompt)
          : undefined,
      aiModel:
        dto.aiModel !== undefined ? this.cleanOptionalText(dto.aiModel) : undefined,
    };

    if (dto.slug) {
      data.slug = await this.generateUniqueArticleSlug(dto.slug, id);
    } else {
      delete data.slug;
    }

    if (
      nextStatus === ArticleStatusDto.PUBLISHED &&
      existing.status !== ArticleStatusDto.PUBLISHED
    ) {
      data.publishedAt = new Date();
    }

    if (nextStatus !== ArticleStatusDto.PUBLISHED && dto.status) {
      data.publishedAt = null;
    }

    Object.keys(data).forEach((key) => {
      if (data[key] === undefined) delete data[key];
    });

    const article = await this.prisma.article.update({
      where: { id },
      data,
      include: { category: true },
    });

    return { article };
  }

  async publishArticle(id: string) {
    const existing = await this.prisma.article.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException("Artikel tidak ditemukan");
    }

    const contentStats = this.getContentStats(
      existing.content,
      ArticleStatusDto.PUBLISHED,
    );

    const article = await this.prisma.article.update({
      where: { id },
      data: {
        status: ArticleStatusDto.PUBLISHED,
        wordCount: contentStats.wordCount,
        readingTimeMinutes: contentStats.readingTimeMinutes,
        publishedAt: existing.publishedAt || new Date(),
      },
      include: { category: true },
    });

    return { article };
  }

  async unpublishArticle(id: string) {
    const existing = await this.prisma.article.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException("Artikel tidak ditemukan");
    }

    const article = await this.prisma.article.update({
      where: { id },
      data: {
        status: ArticleStatusDto.DRAFT,
        publishedAt: null,
      },
      include: { category: true },
    });

    return { article };
  }

  async deleteArticle(id: string) {
    const existing = await this.prisma.article.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException("Artikel tidak ditemukan");
    }

    await this.prisma.article.delete({ where: { id } });
    return { message: "Artikel dihapus" };
  }

  async listCategoriesAdmin() {
    return this.prisma.articleCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { articles: true } },
      },
    });
  }

  async listCategoriesPublic() {
    return this.prisma.articleCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        _count: { select: { articles: true } },
      },
    });
  }

  async createCategory(dto: CreateArticleCategoryDto) {
    const slug = await this.generateUniqueCategorySlug(dto.slug || dto.name);

    return this.prisma.articleCategory.create({
      data: {
        name: dto.name.trim(),
        slug,
        description: this.cleanOptionalText(dto.description),
        sortOrder: dto.sortOrder || 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateArticleCategoryDto) {
    const existing = await this.prisma.articleCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException("Kategori artikel tidak ditemukan");
    }

    let slug = dto.slug;
    if (slug) {
      const normalized = StringHelper.slugify(slug);
      const slugOwner = await this.prisma.articleCategory.findUnique({
        where: { slug: normalized },
      });
      if (slugOwner && slugOwner.id !== id) {
        throw new ConflictException("Slug kategori sudah digunakan");
      }
      slug = normalized;
    }

    return this.prisma.articleCategory.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        slug,
        description:
          dto.description !== undefined
            ? this.cleanOptionalText(dto.description)
            : undefined,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
    });
  }

  async deleteCategory(id: string) {
    const existing = await this.prisma.articleCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException("Kategori artikel tidak ditemukan");
    }

    await this.prisma.articleCategory.delete({ where: { id } });
    return { message: "Kategori artikel dihapus" };
  }

  async importCsv(file: Express.Multer.File, userId: string) {
    if (!file) {
      throw new BadRequestException("File CSV wajib diupload");
    }

    if (!file.originalname.toLowerCase().endsWith(".csv")) {
      throw new BadRequestException("File harus berformat CSV");
    }

    const text = file.buffer.toString("utf8").replace(/^\uFEFF/, "");
    const rows = this.parseCsv(text).filter((row) =>
      row.some((cell) => cell.trim()),
    );

    if (rows.length < 2) {
      throw new BadRequestException("CSV harus memiliki header dan minimal 1 data artikel");
    }

    const headers = rows[0].map((header) => this.normalizeHeader(header));
    const dataRows = rows.slice(1);
    const errors: CsvImportError[] = [];
    const importedArticles: Array<{ id: string; title: string; slug: string }> = [];

    for (const [index, row] of dataRows.entries()) {
      const rowNumber = index + 2;
      const get = (...keys: string[]) => {
        for (const key of keys) {
          const headerIndex = headers.indexOf(this.normalizeHeader(key));
          if (headerIndex >= 0) return row[headerIndex]?.trim() || "";
        }
        return "";
      };

      const title = get("title", "judul");
      const content = get("content", "konten", "isi");

      try {
        if (!title) {
          throw new BadRequestException("Judul wajib diisi");
        }
        if (!content) {
          throw new BadRequestException("Konten wajib diisi");
        }

        const categoryLabel = get("category", "kategori");
        const categoryId = categoryLabel
          ? await this.getOrCreateCategory(categoryLabel)
          : undefined;
        const status = this.normalizeImportedStatus(get("status"));
        const contentStats = this.getContentStats(content, status);
        const thumbnail = this.cleanOptionalText(get("thumbnail", "image", "gambar"));
        const article = await this.prisma.article.create({
          data: {
            title,
            slug: await this.generateUniqueArticleSlug(get("slug") || title),
            excerpt:
              this.cleanOptionalText(get("excerpt", "ringkasan")) ||
              this.buildExcerpt(content),
            content,
            categoryId,
            thumbnail,
            youtubeUrl: this.normalizeYoutubeUrl(get("youtubeUrl", "youtube", "video")),
            tags: this.normalizeTags(get("tags", "tag")),
            status,
            source: "CSV",
            wordCount: contentStats.wordCount,
            readingTimeMinutes: contentStats.readingTimeMinutes,
            metaTitle: this.cleanNullableText(get("metaTitle", "meta_title")),
            metaDescription: this.cleanNullableText(
              get("metaDescription", "meta_description"),
            ),
            metaKeywords: this.cleanNullableText(get("metaKeywords", "meta_keywords")),
            ogImage: this.cleanNullableText(get("ogImage", "og_image")),
            createdBy: userId,
            publishedAt: status === ArticleStatusDto.PUBLISHED ? new Date() : null,
          },
        });

        importedArticles.push({
          id: article.id,
          title: article.title,
          slug: article.slug,
        });
      } catch (error) {
        const importError: CsvImportError = {
          row: rowNumber,
          message:
            error instanceof BadRequestException
              ? this.extractExceptionMessage(error)
              : error instanceof Error
                ? error.message
                : "Gagal import artikel",
        };
        if (title) importError.title = title;
        errors.push(importError);
      }
    }

    const batch = await this.prisma.articleImportBatch.create({
      data: {
        fileName: file.originalname,
        totalRows: dataRows.length,
        successCount: importedArticles.length,
        failedCount: errors.length,
        errors,
        createdBy: userId,
      },
    });

    return {
      batch,
      importedArticles,
      errors,
    };
  }

  private buildArticleWhere(
    query: ArticleListQueryDto | PublicArticleListQueryDto,
    publicOnly: boolean,
  ) {
    const where: any = {
      ...(publicOnly && {
        status: ArticleStatusDto.PUBLISHED,
        OR: [{ categoryId: null }, { category: { isActive: true } }],
      }),
    };

    if ("status" in query && query.status) {
      where.status = query.status;
    }

    if ("source" in query && query.source) {
      where.source = query.source;
    }

    if ("categoryId" in query && query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.categorySlug) {
      where.category = {
        ...(where.category || {}),
        slug: query.categorySlug,
        ...(publicOnly && { isActive: true }),
      };
    }

    if (query.tag) {
      where.tags = { hasSome: [query.tag] };
    }

    if (query.search) {
      const search = query.search.trim();
      const searchFilter = [
        { title: { contains: search, mode: "insensitive" } },
        { excerpt: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { tags: { hasSome: [search] } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchFilter }];
        delete where.OR;
      } else {
        where.OR = searchFilter;
      }
    }

    return where;
  }

  private getContentStats(content: string, status: string) {
    const wordCount = this.countWords(content);

    if (wordCount > MAX_ARTICLE_WORDS) {
      throw new BadRequestException(
        `Artikel maksimal ${MAX_ARTICLE_WORDS} kata. Saat ini ${wordCount} kata.`,
      );
    }

    if (status === ArticleStatusDto.PUBLISHED && wordCount < MIN_PUBLISH_WORDS) {
      throw new BadRequestException(
        `Artikel publish minimal ${MIN_PUBLISH_WORDS} kata. Saat ini ${wordCount} kata.`,
      );
    }

    return {
      wordCount,
      readingTimeMinutes: Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE)),
    };
  }

  private countWords(text: string) {
    const clean = this.stripHtml(text)
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!clean) return 0;
    return clean.split(/\s+/).filter(Boolean).length;
  }

  private stripHtml(text: string) {
    return (text || "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ");
  }

  private buildExcerpt(content: string) {
    return StringHelper.truncate(this.stripHtml(content).replace(/\s+/g, " ").trim(), 180);
  }

  private normalizeTags(tags?: string[] | string | null) {
    if (!tags) return [];

    const rawTags = Array.isArray(tags)
      ? tags
      : tags.split(/[|;,]/g);

    return Array.from(
      new Set(
        rawTags
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
          .slice(0, 20),
      ),
    );
  }

  private cleanOptionalText(value?: string | null) {
    const clean = value?.trim();
    return clean ? clean : undefined;
  }

  private cleanNullableText(value?: string | null) {
    const clean = value?.trim();
    return clean ? clean : null;
  }

  private async generateUniqueArticleSlug(seed: string, excludeId?: string) {
    const base = StringHelper.slugify(seed) || "artikel";
    let slug = base;
    let counter = 2;

    while (true) {
      const existing = await this.prisma.article.findUnique({ where: { slug } });
      if (!existing || existing.id === excludeId) return slug;
      slug = `${base}-${counter}`;
      counter += 1;
    }
  }

  private async generateUniqueCategorySlug(seed: string) {
    const base = StringHelper.slugify(seed) || "kategori";
    let slug = base;
    let counter = 2;

    while (await this.prisma.articleCategory.findUnique({ where: { slug } })) {
      slug = `${base}-${counter}`;
      counter += 1;
    }

    return slug;
  }

  private async getOrCreateCategory(label: string) {
    const name = label.trim();
    const slug = StringHelper.slugify(name) || "kategori";
    const existing = await this.prisma.articleCategory.findUnique({
      where: { slug },
    });

    if (existing) return existing.id;

    const category = await this.prisma.articleCategory.create({
      data: {
        name,
        slug: await this.generateUniqueCategorySlug(name),
        isActive: true,
      },
    });

    return category.id;
  }

  private normalizeImportedStatus(value: string) {
    const normalized = value.trim().toUpperCase();
    if (["PUBLISHED", "PUBLISH", "PUBLISHS", "TERBIT"].includes(normalized)) {
      return ArticleStatusDto.PUBLISHED;
    }
    if (["ARCHIVED", "ARSIP"].includes(normalized)) {
      return ArticleStatusDto.ARCHIVED;
    }
    return ArticleStatusDto.DRAFT;
  }

  private normalizeYoutubeUrl(value?: string | null) {
    const raw = value?.trim();
    if (!raw) return undefined;

    try {
      const url = new URL(raw);
      const host = url.hostname.replace(/^www\./, "");

      if (host === "youtu.be") {
        const id = url.pathname.replace("/", "");
        if (id) return `https://www.youtube.com/embed/${id}`;
      }

      if (host === "youtube.com" || host === "m.youtube.com") {
        if (url.pathname.startsWith("/embed/")) return raw;
        const id = url.searchParams.get("v");
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
    } catch {
      throw new BadRequestException("URL YouTube tidak valid");
    }

    throw new BadRequestException("URL YouTube tidak valid");
  }

  private parseCsv(text: string) {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push(field);
        field = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") i += 1;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }

    if (field || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    return rows;
  }

  private normalizeHeader(header: string) {
    return header.trim().toLowerCase().replace(/[\s_-]+/g, "");
  }

  private extractExceptionMessage(error: BadRequestException) {
    const response = error.getResponse();
    if (typeof response === "string") return response;
    if (
      typeof response === "object" &&
      response &&
      "message" in response
    ) {
      const message = (response as { message?: string | string[] }).message;
      return Array.isArray(message) ? message.join(", ") : message || "Bad request";
    }
    return "Bad request";
  }
}
