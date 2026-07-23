import { IsDateString, IsISO31661Alpha2, IsOptional, IsString, IsMobilePhone, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PersonalInfoDto {
  @ApiProperty({ example: 'John', minLength: 1 })
  @IsString()
  @MinLength(1)
  declare firstName: string;

  @ApiProperty({ example: 'Doe', minLength: 1 })
  @IsString()
  @MinLength(1)
  declare lastName: string;

  @ApiPropertyOptional({ example: 'James' })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({ example: '1990-05-15', description: 'ISO 8601 date (YYYY-MM-DD)' })
  @IsDateString()
  declare dateOfBirth: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsMobilePhone()
  phone?: string;

  @ApiProperty({ example: '12 Broad Street' })
  @IsString()
  @MinLength(1)
  declare addressLine1: string;

  @ApiPropertyOptional({ example: 'Flat 3B' })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiProperty({ example: 'Lagos' })
  @IsString()
  @MinLength(1)
  declare city: string;

  @ApiProperty({ example: 'Lagos State', description: 'State, province, or region' })
  @IsString()
  @MinLength(1)
  declare region: string;

  @ApiProperty({ example: '100001' })
  @IsString()
  @MinLength(1)
  declare postcode: string;

  @ApiProperty({ example: 'NG', description: 'ISO 3166-1 alpha-2 country code' })
  @IsISO31661Alpha2()
  declare country: string;
}
