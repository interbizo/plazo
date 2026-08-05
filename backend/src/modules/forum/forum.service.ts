import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ForumPostStatus, Prisma, UserRole } from "@prisma/client";
import { PrismaService } from "@modules/database/prisma.service";
import { PaginationHelper } from "@common/utils/pagination.helper";
import {
  BulkRemoveForumPostsDto,
  CreateForumCommentDto,
  CreateForumPostDto,
  CreateForumStrikeDto,
  ForumPostListQueryDto,
  UpdateForumCommentDto,
  UpdateForumModerationSettingsDto,
  UpdateForumPostDto,
} from "./forum.dto";

const FORUM_SETTINGS_ID = "default";
const DEFAULT_FORUM_SETTINGS = {
  id: FORUM_SETTINGS_ID,
  isAntiSpamEnabled: true,
  rateLimitWindowMinutes: 10,
  postLimitPerWindow: 3,
  commentLimitPerWindow: 12,
  duplicateWindowMinutes: 10,
};

const forumAuthorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatar: true,
  role: true,
};

@Injectable()
export class ForumService {
  constructor(private prisma: PrismaService) {}

  // Mengambil daftar post publik dengan pencarian, urutan, dan pagination.
  async listPosts(query: ForumPostListQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 12;
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where = this.buildPublicPostWhere(query);
    const orderBy =
      query.sort === "popular"
        ? [{ likes: { _count: "desc" as const } }, { createdAt: "desc" as const }]
        : [{ createdAt: "desc" as const }];

    const [posts, total] = await Promise.all([
      this.prisma.forumPost.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          author: { select: forumAuthorSelect },
          _count: { select: { comments: true, likes: true } },
        },
      }),
      this.prisma.forumPost.count({ where }),
    ]);

    return PaginationHelper.formatPaginatedResponse(posts, total, page, limit);
  }

  // Mengambil detail post dan komentar publik berdasarkan slug.
  async getPostBySlug(slug: string) {
    const post = await this.prisma.forumPost.findFirst({
      where: { slug, status: ForumPostStatus.PUBLISHED },
      include: {
        author: { select: forumAuthorSelect },
        comments: {
          where: { status: ForumPostStatus.PUBLISHED },
          include: { author: { select: forumAuthorSelect } },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { likes: true, comments: true } },
      },
    });

    if (!post) throw new NotFoundException("Post forum tidak ditemukan");
    return { post };
  }

  // Mengambil status like pengguna hanya untuk post yang sedang ditampilkan.
  async getLikedPostIds(userId: string, rawPostIds?: string) {
    const postIds = [...new Set((rawPostIds || "").split(",").map((id) => id.trim()).filter(Boolean))];
    if (!postIds.length) return { postIds: [] };
    if (postIds.length > 100) {
      throw new BadRequestException("Maksimal 100 post dapat diperiksa sekaligus");
    }

    const likes = await this.prisma.forumLike.findMany({
      where: { userId, postId: { in: postIds } },
      select: { postId: true },
    });

    return { postIds: likes.map((like) => like.postId) };
  }

  // Membuat post forum setelah melewati pemeriksaan anti-spam.
  async createPost(authorId: string, dto: CreateForumPostDto) {
    await this.assertForumAccess(authorId);
    const title = this.normalizeRequiredText(dto.title, "Judul", 5, 160);
    const content = this.normalizeRequiredText(dto.content, "Isi post", 10, 5000);
    await this.assertNotSpam(authorId, "post", content);

    const post = await this.prisma.forumPost.create({
      data: {
        title,
        content,
        slug: await this.generateUniqueSlug(title),
        authorId,
      },
      include: {
        author: { select: forumAuthorSelect },
        _count: { select: { comments: true, likes: true } },
      },
    });

    return { post };
  }

  // Memperbarui post yang dimiliki oleh pembuatnya sendiri.
  async updateOwnPost(userId: string, postId: string, dto: UpdateForumPostDto) {
    await this.assertForumAccess(userId);
    const post = await this.findActivePost(postId);
    this.assertOwnership(post.authorId, userId, "mengubah post ini");

    const data: Prisma.ForumPostUpdateInput = {};
    if (dto.title !== undefined) {
      data.title = this.normalizeRequiredText(dto.title, "Judul", 5, 160);
    }
    if (dto.content !== undefined) {
      data.content = this.normalizeRequiredText(dto.content, "Isi post", 10, 5000);
    }
    if (!Object.keys(data).length) {
      throw new BadRequestException("Tidak ada perubahan post");
    }

    const updatedPost = await this.prisma.forumPost.update({
      where: { id: postId },
      data,
      include: {
        author: { select: forumAuthorSelect },
        _count: { select: { comments: true, likes: true } },
      },
    });

    return { post: updatedPost };
  }

  // Menghapus post milik sendiri secara lunak agar riwayat moderasi tetap utuh.
  async removeOwnPost(userId: string, postId: string) {
    await this.assertForumAccess(userId);
    const post = await this.findActivePost(postId);
    this.assertOwnership(post.authorId, userId, "menghapus post ini");
    await this.removePost(postId);
    return { message: "Post forum dihapus" };
  }

  // Menambahkan like unik dari seorang pengguna ke sebuah post.
  async likePost(userId: string, postId: string) {
    await this.assertForumAccess(userId);
    await this.findActivePost(postId);
    try {
      await this.prisma.forumLike.create({ data: { userId, postId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Anda sudah menyukai post ini");
      }
      throw error;
    }

    return { liked: true, likeCount: await this.getLikeCount(postId) };
  }

  // Menghapus like pengguna dari sebuah post.
  async unlikePost(userId: string, postId: string) {
    await this.assertForumAccess(userId);
    await this.prisma.forumLike.deleteMany({ where: { userId, postId } });
    return { liked: false, likeCount: await this.getLikeCount(postId) };
  }

  // Menambahkan komentar pada post yang masih dipublikasikan.
  async createComment(userId: string, postId: string, dto: CreateForumCommentDto) {
    await this.assertForumAccess(userId);
    await this.findActivePost(postId);
    const content = this.normalizeRequiredText(dto.content, "Komentar", 2, 2000);
    await this.assertNotSpam(userId, "comment", content);

    const comment = await this.prisma.forumComment.create({
      data: { content, postId, authorId: userId },
      include: { author: { select: forumAuthorSelect } },
    });

    return { comment };
  }

  // Memperbarui komentar yang dimiliki oleh pembuatnya sendiri.
  async updateOwnComment(userId: string, commentId: string, dto: UpdateForumCommentDto) {
    await this.assertForumAccess(userId);
    const comment = await this.findActiveComment(commentId);
    this.assertOwnership(comment.authorId, userId, "mengubah komentar ini");
    const content = this.normalizeRequiredText(dto.content, "Komentar", 2, 2000);

    const updatedComment = await this.prisma.forumComment.update({
      where: { id: commentId },
      data: { content },
      include: { author: { select: forumAuthorSelect } },
    });

    return { comment: updatedComment };
  }

  // Menghapus komentar milik sendiri secara lunak.
  async removeOwnComment(userId: string, commentId: string) {
    await this.assertForumAccess(userId);
    const comment = await this.findActiveComment(commentId);
    this.assertOwnership(comment.authorId, userId, "menghapus komentar ini");
    await this.prisma.forumComment.update({
      where: { id: commentId },
      data: { status: ForumPostStatus.REMOVED },
    });
    return { message: "Komentar dihapus" };
  }

  // Menampilkan post untuk kebutuhan moderasi, termasuk post yang telah dihapus.
  async listModerationPosts(query: ForumPostListQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where: Prisma.ForumPostWhereInput = query.search?.trim()
      ? {
          OR: [
            { title: { contains: query.search.trim(), mode: "insensitive" } },
            { content: { contains: query.search.trim(), mode: "insensitive" } },
            {
              author: {
                OR: [
                  { firstName: { contains: query.search.trim(), mode: "insensitive" } },
                  { lastName: { contains: query.search.trim(), mode: "insensitive" } },
                  { email: { contains: query.search.trim(), mode: "insensitive" } },
                ],
              },
            },
          ],
        }
      : {};

    const [posts, total] = await Promise.all([
      this.prisma.forumPost.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { ...forumAuthorSelect, email: true, isForumBanned: true } },
          _count: { select: { comments: true, likes: true, strikes: true } },
        },
      }),
      this.prisma.forumPost.count({ where }),
    ]);

    return PaginationHelper.formatPaginatedResponse(posts, total, page, limit);
  }

  // Menghapus satu post melalui tindakan moderator.
  async moderateRemovePost(postId: string) {
    await this.findActivePost(postId);
    await this.removePost(postId);
    return { message: "Post dihapus oleh moderator" };
  }

  // Menghapus beberapa post yang dipilih moderator dalam satu tindakan.
  async bulkRemovePosts(dto: BulkRemoveForumPostsDto) {
    const postIds = [...new Set(dto.postIds)].filter(Boolean);
    if (!postIds.length) throw new BadRequestException("Pilih minimal satu post");

    const result = await this.prisma.forumPost.updateMany({
      where: { id: { in: postIds }, status: ForumPostStatus.PUBLISHED },
      data: { status: ForumPostStatus.REMOVED },
    });

    return { message: `${result.count} post dihapus`, count: result.count };
  }

  // Mengambil konfigurasi anti-spam forum dengan nilai default bila belum pernah diubah.
  async getModerationSettings() {
    const settings = await this.prisma.forumModerationSettings.findUnique({
      where: { id: FORUM_SETTINGS_ID },
    });

    return settings || DEFAULT_FORUM_SETTINGS;
  }

  // Mengaktifkan atau menonaktifkan rate limit anti-spam forum.
  async updateModerationSettings(
    moderatorId: string,
    dto: UpdateForumModerationSettingsDto,
  ) {
    const current = await this.getModerationSettings();
    const nextSettings = {
      isAntiSpamEnabled: dto.isAntiSpamEnabled ?? current.isAntiSpamEnabled,
      rateLimitWindowMinutes:
        dto.rateLimitWindowMinutes ?? current.rateLimitWindowMinutes,
      postLimitPerWindow: dto.postLimitPerWindow ?? current.postLimitPerWindow,
      commentLimitPerWindow:
        dto.commentLimitPerWindow ?? current.commentLimitPerWindow,
      duplicateWindowMinutes:
        dto.duplicateWindowMinutes ?? current.duplicateWindowMinutes,
    };

    const settings = await this.prisma.forumModerationSettings.upsert({
      where: { id: FORUM_SETTINGS_ID },
      create: {
        id: FORUM_SETTINGS_ID,
        ...nextSettings,
        updatedBy: moderatorId,
      },
      update: {
        ...nextSettings,
        updatedBy: moderatorId,
      },
    });

    return { settings };
  }

  // Mencatat strike moderator dan memblokir permanen akun pada strike ketiga.
  async createStrike(moderatorId: string, dto: CreateForumStrikeDto) {
    const reason = this.normalizeRequiredText(dto.reason, "Alasan strike", 5, 500);
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: dto.userId },
        select: { id: true, role: true, isForumBanned: true },
      });
      if (!user) throw new NotFoundException("Pengguna tidak ditemukan");
      if (user.id === moderatorId) throw new BadRequestException("Tidak dapat memberi strike pada diri sendiri");
      if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
        throw new ForbiddenException("Akun admin tidak dapat diberi strike forum");
      }

      const [post, comment] = await Promise.all([
        dto.postId ? tx.forumPost.findUnique({ where: { id: dto.postId } }) : null,
        dto.commentId ? tx.forumComment.findUnique({ where: { id: dto.commentId } }) : null,
      ]);
      if (post && post.authorId !== user.id) {
        throw new BadRequestException("Post tidak dimiliki oleh pengguna yang diberi strike");
      }
      if (comment && comment.authorId !== user.id) {
        throw new BadRequestException("Komentar tidak dimiliki oleh pengguna yang diberi strike");
      }

      const strike = await tx.forumStrike.create({
        data: {
          userId: user.id,
          moderatorId,
          reason,
          postId: dto.postId,
          commentId: dto.commentId,
        },
      });
      const strikeCount = await tx.forumStrike.count({ where: { userId: user.id } });
      const isBanned = strikeCount >= 3;

      if (isBanned && !user.isForumBanned) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            isForumBanned: true,
            forumBannedAt: new Date(),
            forumBannedReason: "Diblokir permanen setelah menerima tiga strike forum.",
          },
        });
      }

      return { strike, strikeCount, isBanned };
    });

    return result;
  }

  // Membangun filter post publik yang hanya menampilkan konten aktif.
  private buildPublicPostWhere(query: ForumPostListQueryDto): Prisma.ForumPostWhereInput {
    const search = query.search?.trim();
    return {
      status: ForumPostStatus.PUBLISHED,
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { content: { contains: search, mode: "insensitive" } },
        ],
      }),
    };
  }

  // Memastikan post yang akan diubah masih tersedia untuk pengguna.
  private async findActivePost(postId: string) {
    const post = await this.prisma.forumPost.findFirst({
      where: { id: postId, status: ForumPostStatus.PUBLISHED },
    });
    if (!post) throw new NotFoundException("Post forum tidak ditemukan");
    return post;
  }

  // Memastikan komentar yang akan diubah masih tersedia untuk pengguna.
  private async findActiveComment(commentId: string) {
    const comment = await this.prisma.forumComment.findFirst({
      where: { id: commentId, status: ForumPostStatus.PUBLISHED },
    });
    if (!comment) throw new NotFoundException("Komentar tidak ditemukan");
    return comment;
  }

  // Memastikan aksi ubah dan hapus hanya dilakukan pemilik konten.
  private assertOwnership(authorId: string, userId: string, action: string) {
    if (authorId !== userId) {
      throw new ForbiddenException(`Anda tidak memiliki izin untuk ${action}`);
    }
  }

  // Menghapus post tanpa menghilangkan relasi yang dibutuhkan audit moderasi.
  private async removePost(postId: string) {
    await this.prisma.forumPost.update({
      where: { id: postId },
      data: { status: ForumPostStatus.REMOVED },
    });
  }

  // Menghitung total like terkini untuk dikembalikan ke antarmuka pengguna.
  private async getLikeCount(postId: string) {
    return this.prisma.forumLike.count({ where: { postId } });
  }

  // Menolak aksi tulis forum untuk pengguna yang terkena ban khusus forum.
  private async assertForumAccess(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isForumBanned: true },
    });
    if (!user) throw new NotFoundException("Pengguna tidak ditemukan");
    if (user.isForumBanned) {
      throw new ForbiddenException("Akun Anda diblokir permanen dari forum");
    }
  }

  // Menerapkan batas frekuensi dan duplikasi saat anti-spam aktif.
  private async assertNotSpam(userId: string, type: "post" | "comment", content: string) {
    const settings = await this.getModerationSettings();
    if (!settings.isAntiSpamEnabled) return;

    const rateLimitSince = new Date(
      Date.now() - settings.rateLimitWindowMinutes * 60 * 1000,
    );
    const duplicateSince = new Date(
      Date.now() - settings.duplicateWindowMinutes * 60 * 1000,
    );
    const [recentCount, duplicate] = await Promise.all([
      type === "post"
        ? this.prisma.forumPost.count({ where: { authorId: userId, createdAt: { gte: rateLimitSince } } })
        : this.prisma.forumComment.count({ where: { authorId: userId, createdAt: { gte: rateLimitSince } } }),
      type === "post"
        ? this.prisma.forumPost.findFirst({ where: { authorId: userId, content, createdAt: { gte: duplicateSince } } })
        : this.prisma.forumComment.findFirst({ where: { authorId: userId, content, createdAt: { gte: duplicateSince } } }),
    ]);
    const limit =
      type === "post"
        ? settings.postLimitPerWindow
        : settings.commentLimitPerWindow;

    if (duplicate) {
      throw new BadRequestException("Konten yang sama baru saja dikirim");
    }
    if (recentCount >= limit) {
      throw new BadRequestException(
        `Terlalu banyak ${type === "post" ? "post" : "komentar"}. Coba lagi dalam ${settings.rateLimitWindowMinutes} menit.`,
      );
    }
  }

  // Menormalkan teks dan menolak input kosong atau di luar batas panjang.
  private normalizeRequiredText(value: string, label: string, minLength: number, maxLength: number) {
    const normalized = value.trim().replace(/\r\n/g, "\n");
    if (normalized.length < minLength || normalized.length > maxLength) {
      throw new BadRequestException(`${label} harus berisi ${minLength}-${maxLength} karakter`);
    }
    return normalized;
  }

  // Membuat slug unik yang stabil untuk URL detail post forum.
  private async generateUniqueSlug(title: string) {
    const base =
      title
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/[\s-]+/g, "-")
        .slice(0, 80) || "diskusi";
    let slug = base;
    let suffix = 2;

    while (await this.prisma.forumPost.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
    return slug;
  }
}
