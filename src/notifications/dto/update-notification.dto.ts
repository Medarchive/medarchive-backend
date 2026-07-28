import { IsDefined, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateNotificationDto {
  @ApiProperty({ description: 'true to mark read, false to mark unread' })
  @IsDefined()
  @IsBoolean()
  declare read: boolean;
}
