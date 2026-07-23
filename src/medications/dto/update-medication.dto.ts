import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMedicationDto {
  @ApiPropertyOptional({ example: 'Ibuprofen (Advil)' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  declare name?: string;

  @ApiPropertyOptional({ example: '400mg' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  declare dosage?: string;

  @ApiPropertyOptional({ example: 'BID' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  declare frequency?: string;

  @ApiPropertyOptional({ example: 'Dr. Mike JP' })
  @IsOptional()
  @IsString()
  declare prescribedBy?: string;

  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsOptional()
  @IsDateString()
  declare startDate?: string;

  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsDateString()
  declare endDate?: string;
}
