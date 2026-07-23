import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WalletNonceDto {
  @ApiProperty({ example: 'GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOOHSUJUJ' })
  @IsString()
  @IsNotEmpty()
  declare address: string;
}

export class WalletLoginDto {
  @ApiProperty({ example: 'GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOOHSUJUJ' })
  @IsString()
  @IsNotEmpty()
  declare address: string;

  @ApiProperty({ example: '01960000-0000-7000-0000-000000000000', description: 'Nonce from POST /auth/wallet-nonce' })
  @IsString()
  @IsNotEmpty()
  declare nonce: string;

  @ApiProperty({ example: 'a1b2c3d4e5f6...', description: 'Stellar keypair signature of the nonce, hex-encoded' })
  @IsString()
  @IsNotEmpty()
  declare signature: string;
}
