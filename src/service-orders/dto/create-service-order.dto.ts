import { IsNotEmpty, IsNumberString, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateServiceOrderDto {
  @ApiProperty({
    example: '019fdd0c-216c-71e5-a515-0ba76eb5933d',
    description: "Patient's user ID",
  })
  @IsUUID()
  declare patientId: string;

  @ApiProperty({
    example: 'Consultation — General Checkup',
    description: 'Human-readable description shown to the patient.',
  })
  @IsString()
  @IsNotEmpty()
  declare description: string;

  @ApiProperty({
    example: '25.5000000',
    description:
      'Amount in USDC, as a numeric string (never a float — avoids ' +
      'floating-point precision loss). Up to 7 decimal places, matching ' +
      "Stellar's native precision.",
    pattern: '^\\d+(\\.\\d{1,7})?$',
  })
  @IsNumberString({ no_symbols: false })
  declare amount: string;
}
