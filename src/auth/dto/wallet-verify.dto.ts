import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WalletVerifyDto {
  @ApiProperty({ example: 'patient@example.com', description: 'Registered email address' })
  @IsEmail()
  declare email: string;

  @ApiProperty({
    example: '01960000-0000-7000-0000-000000000000',
    description: 'Nonce received from POST /auth/login when walletRequired is true',
  })
  @IsString()
  @IsNotEmpty()
  declare nonce: string;

  @ApiProperty({
    example: 'a1b2c3d4e5f6...',
    description: 'Stellar keypair signature of the nonce, hex-encoded',
  })
  @IsString()
  @IsNotEmpty()
  declare signature: string;
}
