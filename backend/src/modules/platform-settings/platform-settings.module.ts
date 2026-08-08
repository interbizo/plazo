import { Global, Module } from '@nestjs/common';
import { PlatformSettingsService } from './platform-settings.service';
import {
  PlatformSettingsController,
  PublicPlatformSettingsController,
} from './platform-settings.controller';
import { DatabaseModule } from '@modules/database/database.module';

@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [PlatformSettingsController, PublicPlatformSettingsController],
  providers: [PlatformSettingsService],
  exports: [PlatformSettingsService],
})
export class PlatformSettingsModule {}
