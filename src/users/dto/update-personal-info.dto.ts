import { IsDateString, IsISO31661Alpha2, IsOptional, IsString, IsMobilePhone, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePersonalInfoDto {
  @ApiPropertyOptional({ example: 'John', minLength: 1 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe', minLength: 1 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @ApiPropertyOptional({ example: 'James' })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiPropertyOptional({ example: '1990-05-15', description: 'ISO 8601 date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsMobilePhone()
  phone?: string;

  @ApiPropertyOptional({ example: '12 Broad Street' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  addressLine1?: string;

  @ApiPropertyOptional({ example: 'Flat 3B' })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  city?: string;

  @ApiPropertyOptional({ example: 'Lagos State' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  region?: string;

  @ApiPropertyOptional({ example: '100001' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  postcode?: string;

  @ApiPropertyOptional({ example: 'NG', description: 'ISO 3166-1 alpha-2 country code' })
  @IsOptional()
  @IsISO31661Alpha2()
  country?: string;
}
