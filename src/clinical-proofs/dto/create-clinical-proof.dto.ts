import { IsEnum, IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ClinicalProofType {
  DIAGNOSIS_CATEGORY = 'DIAGNOSIS_CATEGORY',
  ALLERGY_CONFIRMATION = 'ALLERGY_CONFIRMATION',
  PRIOR_PRESCRIPTION_PATTERN = 'PRIOR_PRESCRIPTION_PATTERN',
  BLOOD_GROUP = 'BLOOD_GROUP',
  GENOTYPE = 'GENOTYPE',
  CHRONIC_CONDITION = 'CHRONIC_CONDITION',
}

export class CreateClinicalProofDto {
  @ApiProperty({
    enum: ClinicalProofType,
    example: ClinicalProofType.BLOOD_GROUP,
  })
  @IsEnum(ClinicalProofType)
  declare proofType: ClinicalProofType;

  @ApiProperty({
    description:
      'Shape depends on proofType. ' +
      'DIAGNOSIS_CATEGORY: { category: "DISEASE"|"ALLERGY"|"CONDITION" }. ' +
      'ALLERGY_CONFIRMATION: { healthRecordId: string }. ' +
      'PRIOR_PRESCRIPTION_PATTERN: { drugClass: string }. ' +
      'BLOOD_GROUP: { bloodGroup: string }. ' +
      'GENOTYPE: { genotype: string }. ' +
      'CHRONIC_CONDITION: { conditionId: string, hasCondition: boolean }.',
    example: { bloodGroup: 'O_POSITIVE' },
  })
  @IsObject()
  @IsNotEmpty()
  declare claimData: Record<string, unknown>;
}
