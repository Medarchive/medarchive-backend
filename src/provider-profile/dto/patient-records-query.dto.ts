import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PatientRecordsQueryDto {
  @ApiPropertyOptional({
    example: 'MA-12345678',
    description: "Patient's Care ID",
  })
  @IsOptional()
  @IsString()
  careId?: string;

  @ApiPropertyOptional({
    example: '018f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b',
    description: "Patient's user ID (UUID)",
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    example: 'patient@example.com',
    description: "Patient's email address",
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}
