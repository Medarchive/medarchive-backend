import { IsEnum, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum BloodGroup {
  A_POSITIVE = 'A_POSITIVE',
  A_NEGATIVE = 'A_NEGATIVE',
  B_POSITIVE = 'B_POSITIVE',
  B_NEGATIVE = 'B_NEGATIVE',
  AB_POSITIVE = 'AB_POSITIVE',
  AB_NEGATIVE = 'AB_NEGATIVE',
  O_POSITIVE = 'O_POSITIVE',
  O_NEGATIVE = 'O_NEGATIVE',
}

export enum Genotype {
  AA = 'AA',
  AS = 'AS',
  SS = 'SS',
  AC = 'AC',
  SC = 'SC',
}

export class UpdateMedicalProfileDto {
  @ApiPropertyOptional({ enum: BloodGroup, example: 'O_POSITIVE' })
  @IsOptional()
  @IsEnum(BloodGroup)
  declare bloodGroup?: BloodGroup;

  @ApiPropertyOptional({ enum: Genotype, example: 'AA' })
  @IsOptional()
  @IsEnum(Genotype)
  declare genotype?: Genotype;

  @ApiPropertyOptional({ example: 170.5, description: 'Height in centimetres' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(50)
  @Max(300)
  declare heightCm?: number;

  @ApiPropertyOptional({ example: 68.0, description: 'Weight in kilograms' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(700)
  declare weightKg?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  declare currentlyTakingMedication?: boolean;
}
