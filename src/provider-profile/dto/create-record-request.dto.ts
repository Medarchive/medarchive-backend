import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class CreateRecordRequestDto {
  @ApiPropertyOptional({ example: 'MA-12345678', description: "Patient's Care ID. Provide exactly one of: patientId, careId, email." })
  @IsOptional()
  @IsString()
  careId?: string;

  @ApiPropertyOptional({ example: '018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b', description: "Patient's user ID. Provide exactly one of: patientId, careId, email." })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ example: 'patient@example.com', description: "Patient's email. Provide exactly one of: patientId, careId, email." })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '019fdd0c-216c-71e5-a515-0ba76eb5933d', description: 'Specific health record ID to request access to (optional — omit to request by type)' })
  @IsOptional()
  @IsUUID()
  recordId?: string;

  @ApiProperty({ example: 'Lab results', description: 'Type of records being requested' })
  @IsString()
  @IsNotEmpty()
  declare requestType: string;

  @ApiPropertyOptional({ example: 'Required for ongoing treatment.' })
  @IsOptional()
  @IsString()
  note?: string;
}
