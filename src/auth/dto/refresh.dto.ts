import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty({
    example: '01960000-0000-7000-0000-000000000000',
    description: 'Refresh token issued during login or previous refresh',
  })
  @IsString()
  @IsNotEmpty()
  declare refreshToken: string;
}
