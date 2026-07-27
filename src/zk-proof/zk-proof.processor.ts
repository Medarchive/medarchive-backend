import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';
import { generate } from '@zk-kit/poseidon-proof';
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import { healthRecordProofs } from '../db/schema';

export const ZK_PROOF_QUEUE = 'zk-proof';

export interface ZkProofJobData {
  recordId: string;
  userId: string;
  recordType: string;
  fileS3Keys: string[];
}

function toFieldElement(uuid: string): bigint {
  return BigInt('0x' + uuid.replace(/-/g, ''));
}

function stringToField(s: string): bigint {
  const hash = createHash('sha256').update(s).digest();
  return BigInt('0x' + hash.slice(0, 31).toString('hex'));
}

function buildPreimages(data: ZkProofJobData): bigint[] {
  return [
    toFieldElement(data.userId),
    stringToField(data.recordType),
    data.fileS3Keys.length > 0 ? stringToField(data.fileS3Keys.join(',')) : 0n,
  ];
}

@Processor(ZK_PROOF_QUEUE)
export class ZkProofProcessor extends WorkerHost {
  private readonly logger = new Logger(ZkProofProcessor.name);

  constructor(@Inject(DB) private readonly db: Database) {
    super();
  }

  async process(job: Job<ZkProofJobData>): Promise<void> {
    const { recordId } = job.data;

    try {
      const preimages = buildPreimages(job.data);
      // scope = recordId (public context); preimages = private inputs
      const poseidonProof = await generate(preimages, recordId);

      await this.db
        .update(healthRecordProofs)
        .set({
          status: 'GENERATED',
          commitment: poseidonProof.digest,
          proof: poseidonProof.proof as unknown as Record<string, unknown>,
          publicSignals: [poseidonProof.scope, String(poseidonProof.numberOfInputs)] as unknown as string[],
          generatedAt: new Date(),
        })
        .where(eq(healthRecordProofs.healthRecordId, recordId));

      this.logger.log(`ZK proof generated recordId=${recordId} commitment=${poseidonProof.digest}`);
    } catch (err) {
      this.logger.error(`ZK proof failed recordId=${recordId}`, err);

      await this.db
        .update(healthRecordProofs)
        .set({
          status: 'FAILED',
          error: err instanceof Error ? err.message : String(err),
        })
        .where(eq(healthRecordProofs.healthRecordId, recordId));
    }
  }
}
