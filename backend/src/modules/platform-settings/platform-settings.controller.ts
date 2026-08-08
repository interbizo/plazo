import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlatformSettingsService } from './platform-settings.service';
import { UpdatePlatformSettingDto } from './platform-settings.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { GetUser } from '@common/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Admin - Platform Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/platform-settings')
export class PlatformSettingsController {
  constructor(private readonly service: PlatformSettingsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all platform settings / feature flags' })
  getAll() {
    return this.service.getAllSettings();
  }

  @Patch(':key')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a platform setting value (SUPER_ADMIN only)' })
  update(
    @Param('key') key: string,
    @Body() dto: UpdatePlatformSettingDto,
    @GetUser('id') adminId: string,
  ) {
    return this.service.setFlag(key, dto.value, dto.description, adminId);
  }

  @Get('maintenance')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get maintenance mode status' })
  getMaintenanceStatus() {
    return this.service.getMaintenanceStatus();
  }
}

@ApiTags('Public - Platform Settings')
@Controller('api/public/platform-settings')
export class PublicPlatformSettingsController {
  constructor(private readonly service: PlatformSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get public feature flags and maintenance status' })
  async getPublicFlags() {
    const settings = await this.service.getAllSettings();
    const flags: Record<string, string> = {};
    for (const s of settings) {
      flags[s.key] = s.value;
    }
    return flags;
  }
}
