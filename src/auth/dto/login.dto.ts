import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'patient@example.com', description: 'Registered email address' })
  @IsEmail()
  declare email: string;

  @ApiProperty({ example: 'P@ssw0rd123', description: 'Account password', minLength: 8 })
  @IsString()
  @MinLength(8)
  declare password: string;
}
