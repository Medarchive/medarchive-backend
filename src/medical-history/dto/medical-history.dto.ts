import { IsArray, IsUUID, ArrayMinSize, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MedicalHistoryDto {
  @ApiProperty({
    example: ['01960000-0000-7000-0000-000000000001', '01960000-0000-7000-0000-000000000002'],
    description: 'Array of medical condition IDs to apply',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  declare conditionIds: string[];

  @ApiProperty({ example: false, description: 'Whether the user is currently taking any medication' })
  @IsBoolean()
  declare currentlyTakingMedication: boolean;
}
