import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmergencyContactDto {
  @ApiProperty({ example: 'Ngozi' })
  @IsString()
  @IsNotEmpty()
  declare firstName: string;

  @ApiProperty({ example: 'Okonkwo' })
  @IsString()
  @IsNotEmpty()
  declare lastName: string;

  @ApiProperty({ example: 'Mother' })
  @IsString()
  @IsNotEmpty()
  declare relationship: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @IsNotEmpty()
  declare contactNumber: string;

  @ApiPropertyOptional({ example: 'ngozi@example.com' })
  @IsOptional()
  @IsEmail()
  declare email?: string;
}
