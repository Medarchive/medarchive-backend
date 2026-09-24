import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPaymentDto {
  @ApiProperty({
    example: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    description:
      'Hex-encoded Stellar transaction hash (exactly 64 hex characters) ' +
      'of the USDC payment your wallet already submitted to Horizon. Get ' +
      'this from your wallet after signing — Med Archive did not build or ' +
      'sign the transaction, it only verifies it afterward.',
    minLength: 64,
    maxLength: 64,
  })
  @IsString()
  @IsNotEmpty()
  @Length(64, 64)
  declare txHash: string;
}
