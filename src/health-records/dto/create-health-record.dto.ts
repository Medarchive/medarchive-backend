import { IsEnum, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum HealthRecordType {
  BLOOD_TEST = 'BLOOD_TEST',
  PRESCRIPTION = 'PRESCRIPTION',
  SCAN = 'SCAN',
  LAB_TEST = 'LAB_TEST',
  REPORT = 'REPORT',
  OTHER = 'OTHER',
}

export class CreateHealthRecordDto {
  @ApiProperty({ example: 'CBC Blood Test Report', type: 'string' })
  @IsString()
  @IsNotEmpty()
  declare title: string;

  @ApiProperty({ enum: HealthRecordType, example: 'LAB_TEST', type: 'string' })
  @IsEnum(HealthRecordType)
  declare recordType: HealthRecordType;

  @ApiPropertyOptional({ example: 'Complete Blood Count', description: 'Required when recordType is LAB_TEST', type: 'string' })
  @IsOptional()
  @IsString()
  declare labReportType?: string;

  @ApiPropertyOptional({ example: 'Dr. Mike JP', type: 'string' })
  @IsOptional()
  @IsString()
  declare referredBy?: string;

  @ApiPropertyOptional({ example: 'Routine check ordered by Dr. Okonkwo', type: 'string' })
  @IsOptional()
  @IsString()
  declare description?: string;

  @ApiProperty({ type: 'string', format: 'binary', description: 'The file to upload' })
  declare file: Express.Multer.File;
}
