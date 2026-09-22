import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPaymentDto {
  @ApiProperty({
    example: 'a1b2c3d4e5f6...',
    description: 'Stellar transaction hash of the submitted USDC payment',
  })
  @IsString()
  @IsNotEmpty()
  @Length(64, 64)
  declare txHash: string;
}
