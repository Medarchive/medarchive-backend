import { IsEmail, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEmergencyContactDto {
  @ApiPropertyOptional({ example: 'Ngozi' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  declare firstName?: string;

  @ApiPropertyOptional({ example: 'Okonkwo' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  declare lastName?: string;

  @ApiPropertyOptional({ example: 'Mother' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  declare relationship?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  declare contactNumber?: string;

  @ApiPropertyOptional({ example: 'ngozi@example.com' })
  @IsOptional()
  @IsEmail()
  declare email?: string;
}
