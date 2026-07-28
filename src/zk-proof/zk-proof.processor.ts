import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';
import { generate } from '@zk-kit/poseidon-proof';
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import { healthRecordProofs, healthRecords, wallets } from '../db/schema';
import { StellarService } from '../wallet/stellar.service';
import { WalletEncryptionService } from '../wallet/wallet-encryption.service';
import { NotificationsService } from '../notifications/notifications.service';

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

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly stellar: StellarService,
    private readonly walletEncryption: WalletEncryptionService,
    private readonly notifications: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<ZkProofJobData>): Promise<void> {
    const { recordId } = job.data;

    try {
      const preimages = buildPreimages(job.data);
      const poseidonProof = await generate(preimages, recordId);

      await Promise.all([
        this.db
          .update(healthRecordProofs)
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
          .where(eq(healthRecordProofs.healthRecordId, recordId)),
        this.db
          .update(healthRecords)
          .set({ zkVerified: true, updatedAt: new Date() })
          .where(eq(healthRecords.id, recordId)),
      ]);

      this.logger.log(
        `ZK proof generated recordId=${recordId} commitment=${poseidonProof.digest}`,
      );

      this.anchorFromUserWallet(
        job.data.userId,
        recordId,
        poseidonProof.digest as string,
      ).catch((err) => {
        this.logger.warn(
          `Stellar anchoring failed recordId=${recordId}: ${String(err)}`,
        );
        this.notifications.push(
          job.data.userId,
          'ANCHOR_TX_FAILED',
          'Blockchain Anchoring Failed',
          'We were unable to anchor your health record proof on the blockchain. Please ensure your wallet has sufficient XLM.',
          { recordId },
        );
      });
    } catch (err) {
      this.logger.error(`ZK proof failed recordId=${recordId}`, err);

      await this.db
        .update(healthRecordProofs)
        .set({
          status: 'FAILED',
          error: err instanceof Error ? err.message : String(err),
        })
        .where(eq(healthRecordProofs.healthRecordId, recordId));

      this.notifications.push(
        job.data.userId,
        'ZK_PROOF_FAILED',
        'Health Record Proof Generation Failed',
        'We were unable to generate a cryptographic proof for your health record. Please try again.',
        { recordId },
      );
    }
  }

  private async anchorFromUserWallet(
    userId: string,
    recordId: string,
    commitment: string,
  ): Promise<void> {
    const wallet = await this.db.query.wallets.findFirst({
      where: eq(wallets.userId, userId),
    });
    if (!wallet?.encryptedSecret) return;
    const secret = this.walletEncryption.decrypt(wallet.encryptedSecret);
    const txHash = await this.stellar.submitVerificationTx(secret, commitment);
    await this.db
      .update(healthRecordProofs)
      .set({ anchorTxHash: txHash })
      .where(eq(healthRecordProofs.healthRecordId, recordId));
    this.notifications.push(
      userId,
      'ANCHOR_TX_CONFIRMED',
      'Health Record Anchored on Blockchain',
      'Your health record proof has been successfully anchored on the Stellar blockchain.',
      { recordId, txHash },
    );
  }
}
