import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProviderPatientSearchDto {
  @ApiProperty({ example: 'MA-12345678', description: "Patient's Care ID" })
  @IsString()
  @IsNotEmpty()
  declare careId: string;
}
