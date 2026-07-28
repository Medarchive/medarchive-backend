import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ProviderType {
  LAB = 'LAB',
  HOSPITAL = 'HOSPITAL',
  CLINIC = 'CLINIC',
  PHARMACY = 'PHARMACY',
  SPECIALIST = 'SPECIALIST',
  OTHER = 'OTHER',
}

export class UpdateProviderProfileDto {
  @ApiPropertyOptional({ example: 'Dr' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Emeka' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Okonkwo' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'Lagos University Teaching Hospital' })
  @IsOptional()
  @IsString()
  organizationName?: string;

  @ApiPropertyOptional({ example: '1 Idi-Araba Road, Surulere, Lagos' })
  @IsOptional()
  @IsString()
  workAddress?: string;

  @ApiPropertyOptional({ enum: ProviderType, example: ProviderType.HOSPITAL })
  @IsOptional()
  @IsEnum(ProviderType)
  providerType?: ProviderType;

  @ApiPropertyOptional({ example: 'Cardiology' })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiPropertyOptional({ example: 'MED-12345' })
  @IsOptional()
  @IsString()
  licenseNumber?: string;
}
