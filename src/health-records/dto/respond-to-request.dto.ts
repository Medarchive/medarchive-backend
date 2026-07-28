import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RespondToRequestDto {
  @ApiProperty({
    enum: ['APPROVED', 'DECLINED'],
    description: 'New status for the request',
  })
  @IsEnum(['APPROVED', 'DECLINED'])
  declare status: 'APPROVED' | 'DECLINED';
}
