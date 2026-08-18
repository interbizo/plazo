import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { DatabaseModule } from "@modules/database/database.module";
import { UploadService } from "./upload.service";
import { UploadController } from "./upload.controller";
import { StorageService } from "./storage/storage.service";
import { LocalStorageService } from "./storage/local.storage";
import { S3StorageService } from "./storage/s3.storage";

@Module({
  imports: [
    DatabaseModule,
    MulterModule.register({
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  ],
  providers: [UploadService, StorageService, LocalStorageService, S3StorageService],
  controllers: [UploadController],
  exports: [UploadService, StorageService],
})
export class UploadModule {}
