import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';
import { generate } from '@zk-kit/poseidon-proof';
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import { clinicalProofs } from '../db/schema';
import { NotificationsService } from '../notifications/notifications.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { toFieldElement, stringToField } from '../zk-proof/zk-proof.processor';
import { ClinicalProofType } from './dto/create-clinical-proof.dto';

export const CLINICAL_PROOF_QUEUE = 'clinical-proof';

export interface ClinicalProofJobData {
  proofId: string;
  userId: string;
  proofType: ClinicalProofType;
  claimData: Record<string, unknown>;
}

export function buildClaimPreimages(data: ClinicalProofJobData): bigint[] {
  const base = [toFieldElement(data.userId), stringToField(data.proofType)];

  switch (data.proofType) {
    case ClinicalProofType.DIAGNOSIS_CATEGORY:
      return [
        ...base,
        stringToField(primitiveToString(data.claimData.category)),
      ];
    case ClinicalProofType.ALLERGY_CONFIRMATION:
      return [
        ...base,
        stringToField(primitiveToString(data.claimData.healthRecordId)),
      ];
    case ClinicalProofType.PRIOR_PRESCRIPTION_PATTERN:
      return [
        ...base,
        stringToField(primitiveToString(data.claimData.drugClass)),
      ];
    case ClinicalProofType.BLOOD_GROUP:
      return [
        ...base,
        stringToField(primitiveToString(data.claimData.bloodGroup)),
      ];
    case ClinicalProofType.GENOTYPE:
      return [
        ...base,
        stringToField(primitiveToString(data.claimData.genotype)),
      ];
    case ClinicalProofType.CHRONIC_CONDITION:
      return [
        ...base,
        stringToField(primitiveToString(data.claimData.conditionId)),
        stringToField(primitiveToString(data.claimData.hasCondition)),
      ];
  }
}

export function primitiveToString(value: unknown): string {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
    return String(value);
  return '';
}

@Processor(CLINICAL_PROOF_QUEUE)
export class ClinicalProofsProcessor extends WorkerHost {
  private readonly logger = new Logger(ClinicalProofsProcessor.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly notifications: NotificationsService,
    private readonly dashboard: DashboardService,
  ) {
    super();
  }

  async process(job: Job<ClinicalProofJobData>): Promise<void> {
    const { proofId, userId } = job.data;

    try {
      const preimages = buildClaimPreimages(job.data);
      const scope = BigInt(
        '0x' + createHash('sha256').update(proofId).digest('hex').slice(0, 62),
      );
      const poseidonProof = await generate(preimages, scope);

      await this.db
        .update(clinicalProofs)
        .set({
          status: 'GENERATED',
          commitment: poseidonProof.digest as string,
          proof: poseidonProof.proof as unknown,
          publicSignals: [
            poseidonProof.scope,
            String(poseidonProof.numberOfInputs),
          ] as unknown,
          generatedAt: new Date(),
        })
        .where(eq(clinicalProofs.id, proofId));

      this.logger.log(
        `Clinical proof generated proofId=${proofId} type=${job.data.proofType}`,
      );

      this.notifications.push(
        userId,
        'CLINICAL_PROOF_GENERATED',
        'Proof Ready',
        'Your clinical proof has been generated and is ready to share.',
        { proofId, proofType: job.data.proofType },
      );
      await this.dashboard.invalidate(userId);
    } catch (err) {
      this.logger.error(`Clinical proof failed proofId=${proofId}`, err);

      await this.db
        .update(clinicalProofs)
        .set({
          status: 'FAILED',
          error: err instanceof Error ? err.message : String(err),
        })
        .where(eq(clinicalProofs.id, proofId));

      this.notifications.push(
        userId,
        'CLINICAL_PROOF_FAILED',
        'Proof Generation Failed',
        'We were unable to generate your clinical proof. Please try again.',
        { proofId },
      );
      await this.dashboard.invalidate(userId);
    }
  }
}
