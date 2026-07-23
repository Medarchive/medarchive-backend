import {
  IsEmail,
  IsEnum,
  IsMobilePhone,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RegisterRole {
  PATIENT = 'PATIENT',
  PROVIDER = 'PROVIDER',
}

export class RegisterDto {
  @ApiProperty({ example: 'John Doe', description: 'Full legal name', minLength: 2 })
  @IsString()
  @MinLength(2)
  declare fullName: string;

  @ApiProperty({ example: 'patient@example.com', description: 'Email address — used for login and OTP delivery' })
  @IsEmail()
  declare email: string;

  @ApiPropertyOptional({ example: '+2348012345678', description: 'International format phone number' })
  @IsOptional()
  @IsMobilePhone()
  phone?: string;

  @ApiProperty({ example: 'P@ssw0rd123', description: 'Account password', minLength: 8 })
  @IsString()
  @MinLength(8)
  declare password: string;

  @ApiProperty({ enum: RegisterRole, example: RegisterRole.PATIENT, description: 'Account type — PATIENT or PROVIDER' })
  @IsEnum(RegisterRole)
  declare role: RegisterRole;
}
