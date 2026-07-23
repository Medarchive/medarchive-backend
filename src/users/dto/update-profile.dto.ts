import { IsEmail, IsOptional, IsMobilePhone, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Jane Doe', description: 'Updated full name', minLength: 2 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @ApiPropertyOptional({ example: 'jane@example.com', description: 'New email address — must not already be in use' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+2348099887766', description: 'International format phone number' })
  @IsOptional()
  @IsMobilePhone()
  phone?: string;

  @ApiPropertyOptional({ example: 'OldP@ss123', description: 'Current password — required when setting a new password', minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  currentPassword?: string;

  @ApiPropertyOptional({ example: 'NewP@ss456', description: 'New password — requires currentPassword', minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;

  @ApiPropertyOptional({ example: 'Cardiology', description: 'Provider only — medical specialty' })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiPropertyOptional({ example: 'LIC-98765', description: 'Provider only — medical license number' })
  @IsOptional()
  @IsString()
  licenseNumber?: string;
}
