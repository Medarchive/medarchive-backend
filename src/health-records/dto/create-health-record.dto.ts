import { IsDateString, IsEnum, IsOptional, IsString, IsNotEmpty, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum HealthRecordType {
  BLOOD_TEST = 'BLOOD_TEST',
  PRESCRIPTION = 'PRESCRIPTION',
  SCAN = 'SCAN',
  LAB_TEST = 'LAB_TEST',
  MEDICATION = 'MEDICATION',
  REPORT = 'REPORT',
  ALLERGY = 'ALLERGY',
  OTHER = 'OTHER',
}

export enum AllergyType {
  FOOD = 'FOOD',
  DRUG = 'DRUG',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  INSECT = 'INSECT',
  LATEX = 'LATEX',
  OTHER = 'OTHER',
}

export class CreateHealthRecordDto {
  @ApiProperty({ example: 'CBC Blood Test Report', type: 'string' })
  @IsString()
  @IsNotEmpty()
  declare title: string;

  @ApiProperty({ enum: HealthRecordType, example: 'LAB_TEST', type: 'string' })
  @IsEnum(HealthRecordType)
  declare recordType: HealthRecordType;

  // LAB_TEST — testName required
  @ApiPropertyOptional({ example: 'Complete Blood Count', description: 'Required for LAB_TEST', type: 'string' })
  @ValidateIf((o: CreateHealthRecordDto) => o.recordType === HealthRecordType.LAB_TEST)
  @IsString()
  @IsNotEmpty()
  declare testName?: string;

  @ApiPropertyOptional({ example: 'Dr. Mike JP', description: 'LAB_TEST: referring physician', type: 'string' })
  @IsOptional()
  @IsString()
  declare referredBy?: string;

  // PRESCRIPTION
  @ApiPropertyOptional({ example: 'Antibiotic', description: 'PRESCRIPTION: drug class', type: 'string' })
  @IsOptional()
  @IsString()
  declare drugClass?: string;

  @ApiPropertyOptional({ example: 'Dr. Okonkwo', description: 'PRESCRIPTION: prescribing physician', type: 'string' })
  @IsOptional()
  @IsString()
  declare prescribedBy?: string;

  // MEDICATION — drug required
  @ApiPropertyOptional({ example: 'Amoxicillin', description: 'Required for MEDICATION', type: 'string' })
  @ValidateIf((o: CreateHealthRecordDto) => o.recordType === HealthRecordType.MEDICATION)
  @IsString()
  @IsNotEmpty()
  declare drug?: string;

  @ApiPropertyOptional({ example: '500mg', description: 'MEDICATION: dosage', type: 'string' })
  @IsOptional()
  @IsString()
  declare dosage?: string;

  @ApiPropertyOptional({ example: 'BID', description: 'MEDICATION: frequency (e.g. OD, BID, TID, PRN)', type: 'string' })
  @IsOptional()
  @IsString()
  declare frequency?: string;

  @ApiPropertyOptional({ example: '2026-08-26', description: 'MEDICATION: end date (omit if ongoing)', type: 'string' })
  @IsOptional()
  @IsDateString()
  declare endDate?: string;

  // ALLERGY — allergyType and cause required
  @ApiPropertyOptional({ enum: AllergyType, description: 'Required for ALLERGY', type: 'string' })
  @ValidateIf((o: CreateHealthRecordDto) => o.recordType === HealthRecordType.ALLERGY)
  @IsEnum(AllergyType)
  declare allergyType?: AllergyType;

  @ApiPropertyOptional({ example: 'Peanuts', description: 'Required for ALLERGY — what triggers it', type: 'string' })
  @ValidateIf((o: CreateHealthRecordDto) => o.recordType === HealthRecordType.ALLERGY)
  @IsString()
  @IsNotEmpty()
  declare cause?: string;

  @ApiPropertyOptional({ example: 'Carry EpiPen at all times', description: 'ALLERGY: management plan', type: 'string' })
  @IsOptional()
  @IsString()
  declare management?: string;

  // shared
  @ApiPropertyOptional({ example: '2026-07-26', description: 'Date of test / prescription / medication', type: 'string' })
  @IsOptional()
  @IsDateString()
  declare recordDate?: string;

  @ApiPropertyOptional({ example: 'Routine check ordered by Dr. Okonkwo', type: 'string' })
  @IsOptional()
  @IsString()
  declare description?: string;

}
