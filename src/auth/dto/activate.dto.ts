import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActivateDto {
  @ApiProperty({
    description: 'The raw activation token from the invite link',
    example: 'a1b2c3d4...',
  })
  @IsString()
  @IsNotEmpty()
  declare token: string;

  @ApiProperty({
    description: 'The new password to set for the provider account',
    minLength: 8,
    example: 'Str0ng!Pass#2026',
  })
  @IsString()
  @MinLength(8)
  declare password: string;
}
