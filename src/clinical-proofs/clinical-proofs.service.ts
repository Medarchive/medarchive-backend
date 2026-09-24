import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { and, eq } from 'drizzle-orm';
import { verify } from '@zk-kit/poseidon-proof';
import type { PoseidonProof } from '@zk-kit/poseidon-proof';
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import {
  clinicalProofs,
  healthRecords,
  medicalConditions,
  userMedicalConditions,
  userMedicalProfile,
} from '../db/schema';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { DashboardService } from '../dashboard/dashboard.service';
import {
  CLINICAL_PROOF_QUEUE,
  primitiveToString,
  type ClinicalProofJobData,
} from './clinical-proofs.processor';
import { ClinicalProofType } from './dto/create-clinical-proof.dto';
import type { CreateClinicalProofDto } from './dto/create-clinical-proof.dto';

@Injectable()
export class ClinicalProofsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @InjectQueue(CLINICAL_PROOF_QUEUE)
    private readonly queue: Queue<ClinicalProofJobData>,
    private readonly activityLog: ActivityLogService,
    private readonly dashboard: DashboardService,
  ) {}

  async create(userId: string, dto: CreateClinicalProofDto) {
    await this.validateClaim(userId, dto.proofType, dto.claimData);

    const [row] = await this.db
      .insert(clinicalProofs)
      .values({
        userId,
        proofType: dto.proofType,
        claimData: dto.claimData,
      })
      .returning();

    await this.queue.add('generate', {
      proofId: row.id,
      userId,
      proofType: dto.proofType,
      claimData: dto.claimData,
    });

    this.activityLog.log(userId, 'CLINICAL_PROOF_REQUESTED', {
      proofId: row.id,
      proofType: dto.proofType,
    });
    await this.dashboard.invalidate(userId);

    return row;
  }

  async findOne(userId: string, id: string) {
    const row = await this.db.query.clinicalProofs.findFirst({
      where: and(eq(clinicalProofs.id, id), eq(clinicalProofs.userId, userId)),
    });
    if (!row) throw new NotFoundException('Clinical proof not found');
    return row;
  }

  async findAll(userId: string) {
    return this.db.query.clinicalProofs.findMany({
      where: eq(clinicalProofs.userId, userId),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  }

  async verify(proofId: string): Promise<{
    valid: boolean;
    patientId: string;
    proofType: ClinicalProofType;
    claimData: Record<string, unknown>;
  }> {
    const row = await this.db.query.clinicalProofs.findFirst({
      where: eq(clinicalProofs.id, proofId),
    });

    if (!row) throw new NotFoundException('Clinical proof not found');
    if (row.status === 'PENDING')
      throw new BadRequestException('Proof not yet generated');
    if (row.status === 'FAILED')
      throw new BadRequestException('Proof generation failed');

    const [scope, numberOfInputsStr] = row.publicSignals as string[];
    const poseidonProof: PoseidonProof = {
      numberOfInputs: Number(numberOfInputsStr),
      scope,
      digest: row.commitment!,
      proof: row.proof as PoseidonProof['proof'],
    };

    const valid = await verify(poseidonProof);

    return {
      valid,
      patientId: row.userId,
      proofType: row.proofType as ClinicalProofType,
      claimData: row.claimData as Record<string, unknown>,
    };
  }

  private async validateClaim(
    userId: string,
    proofType: ClinicalProofType,
    claimData: Record<string, unknown>,
  ): Promise<void> {
    switch (proofType) {
      case ClinicalProofType.BLOOD_GROUP: {
        const profile = await this.db.query.userMedicalProfile.findFirst({
          where: eq(userMedicalProfile.userId, userId),
        });
        if (!profile?.bloodGroup || profile.bloodGroup !== claimData.bloodGroup)
          throw new BadRequestException(
            'Claimed blood group does not match your medical profile',
          );
        return;
      }

      case ClinicalProofType.GENOTYPE: {
        const profile = await this.db.query.userMedicalProfile.findFirst({
          where: eq(userMedicalProfile.userId, userId),
        });
        if (!profile?.genotype || profile.genotype !== claimData.genotype)
          throw new BadRequestException(
            'Claimed genotype does not match your medical profile',
          );
        return;
      }

      case ClinicalProofType.CHRONIC_CONDITION: {
        const conditionId = primitiveToString(claimData.conditionId);
        const condition = await this.db.query.medicalConditions.findFirst({
          where: eq(medicalConditions.id, conditionId),
        });
        if (!condition) throw new BadRequestException('Unknown condition');

        const link = await this.db.query.userMedicalConditions.findFirst({
          where: and(
            eq(userMedicalConditions.userId, userId),
            eq(userMedicalConditions.conditionId, conditionId),
          ),
        });
        const actuallyHasCondition = !!link;
        if (actuallyHasCondition !== Boolean(claimData.hasCondition))
          throw new BadRequestException(
            'Claimed condition status does not match your medical record',
          );
        return;
      }

      case ClinicalProofType.DIAGNOSIS_CATEGORY: {
        const category = primitiveToString(claimData.category);
        const conditions = await this.db.query.userMedicalConditions.findMany({
          where: eq(userMedicalConditions.userId, userId),
          with: { condition: true },
        });
        const hasCategory = conditions.some(
          (c) => c.condition.category === category,
        );
        if (!hasCategory)
          throw new BadRequestException(
            'You have no recorded diagnosis in this category',
          );
        return;
      }

      case ClinicalProofType.ALLERGY_CONFIRMATION: {
        const healthRecordId = primitiveToString(claimData.healthRecordId);
        const record = await this.db.query.healthRecords.findFirst({
          where: and(
            eq(healthRecords.id, healthRecordId),
            eq(healthRecords.userId, userId),
          ),
        });
        if (!record || record.recordType !== 'ALLERGY')
          throw new BadRequestException(
            'No matching allergy record found on your account',
          );
        return;
      }

      case ClinicalProofType.PRIOR_PRESCRIPTION_PATTERN: {
        const drugClass = primitiveToString(claimData.drugClass);
        const records = await this.db.query.healthRecords.findMany({
          where: eq(healthRecords.userId, userId),
        });
        const hasPattern = records.some(
          (r) =>
            (r.recordType === 'PRESCRIPTION' ||
              r.recordType === 'MEDICATION') &&
            r.drugClass === drugClass,
        );
        if (!hasPattern)
          throw new BadRequestException(
            'No matching prescription record found on your account',
          );
        return;
      }
    }
  }
}
