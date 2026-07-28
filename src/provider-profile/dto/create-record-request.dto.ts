import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class CreateRecordRequestDto {
  @ApiPropertyOptional({
    example: '018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b',
    description:
      "Patient's user ID (UUID). Provide exactly one of: patientId, careId, email.",
  })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({
    example: 'MA-12345678',
    description:
      "Patient's Care ID. Provide exactly one of: patientId, careId, email.",
  })
  @IsOptional()
  @IsString()
  careId?: string;

  @ApiPropertyOptional({
    example: 'patient@example.com',
    description:
      "Patient's email. Provide exactly one of: patientId, careId, email.",
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: 'Lab results',
    description:
      'Type of records being requested (e.g. "Lab results", "Full medical history")',
  })
  @IsString()
  @IsNotEmpty()
  declare requestType: string;

  @ApiPropertyOptional({
    example: 'Required for an ongoing treatment plan.',
    description: 'Optional note to the patient',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
