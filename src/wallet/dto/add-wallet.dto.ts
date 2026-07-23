import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum WalletNetwork {
  MAINNET = 'MAINNET',
  TESTNET = 'TESTNET',
}

export class AddWalletDto {
  @ApiProperty({ example: 'GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOOHSUJUJ', description: 'Stellar public key (G...)' })
  @IsString()
  @IsNotEmpty()
  declare address: string;

  @ApiPropertyOptional({ enum: WalletNetwork, default: 'MAINNET' })
  @IsOptional()
  @IsEnum(WalletNetwork)
  declare network?: WalletNetwork;

  @ApiPropertyOptional({ example: 'My main wallet' })
  @IsOptional()
  @IsString()
  declare label?: string;
}
