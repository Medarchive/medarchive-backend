import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendOtpDto {
  @ApiProperty({ example: 'patient@example.com', description: 'Email address to resend the OTP to' })
  @IsEmail()
  declare email: string;
}
