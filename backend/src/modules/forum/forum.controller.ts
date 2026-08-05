import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { GetUser } from "@common/decorators/get-user.decorator";
import { Roles } from "@common/decorators/roles.decorator";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { RolesGuard } from "@common/guards/roles.guard";
import {
  BulkRemoveForumPostsDto,
  CreateForumCommentDto,
  CreateForumPostDto,
  CreateForumStrikeDto,
  ForumLikedPostQueryDto,
  ForumPostListQueryDto,
  UpdateForumCommentDto,
  UpdateForumModerationSettingsDto,
  UpdateForumPostDto,
} from "./forum.dto";
import { ForumService } from "./forum.service";

@Controller("api/forum")
export class ForumPublicController {
  constructor(private forumService: ForumService) {}

  // Menyediakan daftar diskusi yang dapat dibaca tanpa login.
  @Get("posts")
  listPosts(@Query() query: ForumPostListQueryDto) {
    return this.forumService.listPosts(query);
  }

  // Menyediakan detail diskusi publik beserta komentar aktifnya.
  @Get("posts/:slug")
  getPost(@Param("slug") slug: string) {
    return this.forumService.getPostBySlug(slug);
  }
}

@Controller("api/forum")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BUYER, UserRole.SELLER)
export class ForumMemberController {
  constructor(private forumService: ForumService) {}

  // Mengambil ID post pada halaman saat ini yang sudah disukai pengguna.
  @Get("me/liked-posts")
  getLikedPostIds(
    @GetUser("id") userId: string,
    @Query() query: ForumLikedPostQueryDto,
  ) {
    return this.forumService.getLikedPostIds(userId, query.postIds);
  }

  // Membuat post baru dari pengguna terautentikasi.
  @Post("posts")
  createPost(@GetUser("id") userId: string, @Body() dto: CreateForumPostDto) {
    return this.forumService.createPost(userId, dto);
  }

  // Memperbarui post milik pengguna yang sedang login.
  @Put("posts/:id")
  updatePost(
    @GetUser("id") userId: string,
    @Param("id") postId: string,
    @Body() dto: UpdateForumPostDto,
  ) {
    return this.forumService.updateOwnPost(userId, postId, dto);
  }

  // Menghapus post milik pengguna yang sedang login.
  @Delete("posts/:id")
  removePost(@GetUser("id") userId: string, @Param("id") postId: string) {
    return this.forumService.removeOwnPost(userId, postId);
  }

  // Memberi like pada post yang dipilih.
  @Post("posts/:id/likes")
  likePost(@GetUser("id") userId: string, @Param("id") postId: string) {
    return this.forumService.likePost(userId, postId);
  }

  // Membatalkan like pada post yang dipilih.
  @Delete("posts/:id/likes")
  unlikePost(@GetUser("id") userId: string, @Param("id") postId: string) {
    return this.forumService.unlikePost(userId, postId);
  }

  // Menambahkan komentar pada post yang dipilih.
  @Post("posts/:id/comments")
  createComment(
    @GetUser("id") userId: string,
    @Param("id") postId: string,
    @Body() dto: CreateForumCommentDto,
  ) {
    return this.forumService.createComment(userId, postId, dto);
  }

  // Memperbarui komentar milik pengguna yang sedang login.
  @Put("comments/:id")
  updateComment(
    @GetUser("id") userId: string,
    @Param("id") commentId: string,
    @Body() dto: UpdateForumCommentDto,
  ) {
    return this.forumService.updateOwnComment(userId, commentId, dto);
  }

  // Menghapus komentar milik pengguna yang sedang login.
  @Delete("comments/:id")
  removeComment(@GetUser("id") userId: string, @Param("id") commentId: string) {
    return this.forumService.removeOwnComment(userId, commentId);
  }
}

@Controller("api/admin/forum")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class ForumModerationController {
  constructor(private forumService: ForumService) {}

  // Menyediakan daftar post untuk peninjauan moderator.
  @Get("posts")
  listPosts(@Query() query: ForumPostListQueryDto) {
    return this.forumService.listModerationPosts(query);
  }

  // Menghapus satu post sebagai tindakan moderasi.
  @Delete("posts/:id")
  removePost(@Param("id") postId: string) {
    return this.forumService.moderateRemovePost(postId);
  }

  // Menghapus beberapa post sekaligus sebagai tindakan moderasi.
  @Post("posts/bulk-remove")
  bulkRemovePosts(@Body() dto: BulkRemoveForumPostsDto) {
    return this.forumService.bulkRemovePosts(dto);
  }

  // Mengambil status pengaturan anti-spam forum.
  @Get("settings")
  getSettings() {
    return this.forumService.getModerationSettings();
  }

  // Mengubah status pengaturan anti-spam forum.
  @Put("settings")
  updateSettings(
    @GetUser("id") moderatorId: string,
    @Body() dto: UpdateForumModerationSettingsDto,
  ) {
    return this.forumService.updateModerationSettings(moderatorId, dto);
  }

  // Memberikan strike atas pelanggaran forum dan mengevaluasi ban otomatis.
  @Post("strikes")
  createStrike(
    @GetUser("id") moderatorId: string,
    @Body() dto: CreateForumStrikeDto,
  ) {
    return this.forumService.createStrike(moderatorId, dto);
  }
}
