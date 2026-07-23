import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMedicationDto {
  @ApiProperty({ example: 'Ibuprofen (Advil)' })
  @IsString()
  @IsNotEmpty()
  declare name: string;

  @ApiProperty({ example: '400mg' })
  @IsString()
  @IsNotEmpty()
  declare dosage: string;

  @ApiProperty({ example: 'BID', description: 'e.g. OD, BID, TID, QID, PRN' })
  @IsString()
  @IsNotEmpty()
  declare frequency: string;

  @ApiPropertyOptional({ example: 'Dr. Mike JP' })
  @IsOptional()
  @IsString()
  declare prescribedBy?: string;

  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  declare startDate: string;

  @ApiPropertyOptional({ example: '2026-08-01', description: 'Omit if ongoing' })
  @IsOptional()
  @IsDateString()
  declare endDate?: string;
}
