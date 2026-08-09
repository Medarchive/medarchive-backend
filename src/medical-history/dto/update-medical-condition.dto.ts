import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateMedicalConditionDto {
  @ApiPropertyOptional({ example: 'Hypertension' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ enum: ['DISEASE', 'ALLERGY', 'CONDITION'] })
  @IsOptional()
  @IsEnum(['DISEASE', 'ALLERGY', 'CONDITION'])
  category?: 'DISEASE' | 'ALLERGY' | 'CONDITION';

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
