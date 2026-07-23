import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ example: 'patient@example.com', description: 'Email address to verify' })
  @IsEmail()
  declare email: string;

  @ApiProperty({ example: '482931', description: '6-digit OTP sent to the email address', minLength: 6, maxLength: 6 })
  @IsString()
  @Length(6, 6)
  declare otp: string;
}
