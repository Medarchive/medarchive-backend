import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateMedicalConditionDto {
  @ApiProperty({ example: 'Hypertension' })
  @IsString()
  @IsNotEmpty()
  declare name: string;

  @ApiProperty({ enum: ['DISEASE', 'ALLERGY', 'CONDITION'] })
  @IsEnum(['DISEASE', 'ALLERGY', 'CONDITION'])
  declare category: 'DISEASE' | 'ALLERGY' | 'CONDITION';

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
