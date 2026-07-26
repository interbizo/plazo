import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  UseFilters,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { UploadService } from "./upload.service";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { GetUser } from "@common/decorators/get-user.decorator";
import { memoryStorage } from "multer";
import { MulterExceptionFilter } from "@common/filters/multer-exception.filter";
import { imageFileFilter, attachmentFileFilter } from "@common/helpers/file-filter.helper";
import { uploadConfig } from "@config/upload.config";

@Controller("api/upload")
@UseFilters(MulterExceptionFilter)
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: uploadConfig.maxFileSize.image },
      fileFilter: attachmentFileFilter,
    }),
  )
  uploadFile(
    @GetUser("id") userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query("category") category?: string,
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }
    
    return this.uploadService.uploadFile(
      userId,
      file,
      category || "ATTACHMENT",
    );
  }

  @Post("chat")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: uploadConfig.maxFileSize.chat },
      fileFilter: attachmentFileFilter,
    }),
  )
  uploadChatFile(
    @GetUser("id") userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }
    return this.uploadService.uploadFile(userId, file, "ATTACHMENT");
  }

  @Post("multiple")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor("files", uploadConfig.maxFiles.multiple, {
      storage: memoryStorage(),
      limits: { fileSize: uploadConfig.maxFileSize.image },
      fileFilter: imageFileFilter,
    }),
  )
  uploadMultiple(
    @GetUser("id") userId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Query("category") category?: string,
  ) {
    return this.uploadService.uploadMultiple(
      userId,
      files,
      category || "ATTACHMENT",
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getUserFiles(
    @GetUser("id") userId: string,
    @Query("category") category?: string,
  ) {
    return this.uploadService.getUserFiles(userId, category);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  deleteFile(@GetUser("id") userId: string, @Param("id") fileId: string) {
    return this.uploadService.deleteFile(userId, fileId);
  }
}
