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
      'Shape depends on proofType — the claim must be TRUE for your own ' +
      'medical records, or the proof is rejected before anything is ' +
      'generated. One of:\n\n' +
      '- DIAGNOSIS_CATEGORY: { category: "DISEASE" | "ALLERGY" | "CONDITION" }\n' +
      '- ALLERGY_CONFIRMATION: { healthRecordId: string } — must be your own ALLERGY-type health record\n' +
      '- PRIOR_PRESCRIPTION_PATTERN: { drugClass: string } — matched against your PRESCRIPTION/MEDICATION records\n' +
      '- BLOOD_GROUP: { bloodGroup: "A_POSITIVE" | "A_NEGATIVE" | "B_POSITIVE" | ' +
      '"B_NEGATIVE" | "AB_POSITIVE" | "AB_NEGATIVE" | "O_POSITIVE" | "O_NEGATIVE" }\n' +
      '- GENOTYPE: { genotype: "AA" | "AS" | "SS" | "AC" | "SC" }\n' +
      '- CHRONIC_CONDITION: { conditionId: string, hasCondition: boolean } — ' +
      'conditionId from GET /medical-conditions; hasCondition can prove ' +
      'presence OR absence',
    example: { bloodGroup: 'O_POSITIVE' },
  })
  @IsObject()
  @IsNotEmpty()
  declare claimData: Record<string, unknown>;
}
