import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { eq } from 'drizzle-orm';
import { verify } from '@zk-kit/poseidon-proof';
import type { PoseidonProof } from '@zk-kit/poseidon-proof';
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import { healthRecordProofs } from '../db/schema';
import { ZK_PROOF_QUEUE, type ZkProofJobData } from './zk-proof.processor';

@Injectable()
export class ZkProofService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @InjectQueue(ZK_PROOF_QUEUE) private readonly queue: Queue<ZkProofJobData>,
  ) {}

  async enqueue(data: ZkProofJobData): Promise<void> {
    await this.db.insert(healthRecordProofs).values({ healthRecordId: data.recordId });
    await this.queue.add('generate', data);
  }

  async verify(recordId: string): Promise<{ valid: boolean; commitment: string }> {
    const row = await this.db.query.healthRecordProofs.findFirst({
      where: eq(healthRecordProofs.healthRecordId, recordId),
    });

    if (!row) throw new NotFoundException('No proof found for this record');
    if (row.status === 'PENDING') throw new BadRequestException('Proof not yet generated');
    if (row.status === 'FAILED') throw new BadRequestException('Proof generation failed');

    const [scope, numberOfInputsStr] = row.publicSignals as string[];
    const poseidonProof: PoseidonProof = {
      numberOfInputs: Number(numberOfInputsStr),
      scope,
      digest: row.commitment!,
      proof: row.proof as PoseidonProof['proof'],
    };

    const valid = await verify(poseidonProof);
    return { valid, commitment: row.commitment! };
  }

  async getStatus(recordId: string) {
    return this.db.query.healthRecordProofs.findFirst({
      where: eq(healthRecordProofs.healthRecordId, recordId),
    });
  }
}
