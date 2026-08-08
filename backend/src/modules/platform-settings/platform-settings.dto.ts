import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlatformSettingDto {
  @ApiProperty({ description: 'Nilai baru untuk setting ini', example: 'true' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({ description: 'Deskripsi opsional', example: 'Toggle modul forum' })
  @IsString()
  @IsOptional()
  description?: string;
}
