import { IsEnum, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BroadcastNotificationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare body: string;

  @ApiPropertyOptional({ enum: ['PATIENT', 'PROVIDER', 'ADMIN'] })
  @IsOptional()
  @IsEnum(['PATIENT', 'PROVIDER', 'ADMIN'])
  role?: 'PATIENT' | 'PROVIDER' | 'ADMIN';
}
