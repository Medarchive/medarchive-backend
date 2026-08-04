import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { eq } from 'drizzle-orm';
import { verify } from '@zk-kit/poseidon-proof';
import type { PoseidonProof } from '@zk-kit/poseidon-proof';
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import { healthRecordProofs, wallets } from '../db/schema';
import { ZK_PROOF_QUEUE, type ZkProofJobData } from './zk-proof.processor';
import { WalletEncryptionService } from '../wallet/wallet-encryption.service';
import { StellarService } from '../wallet/stellar.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ZkProofService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @InjectQueue(ZK_PROOF_QUEUE) private readonly queue: Queue<ZkProofJobData>,
    private readonly walletEncryption: WalletEncryptionService,
    private readonly stellar: StellarService,
    private readonly notifications: NotificationsService,
  ) {}

  async enqueue(data: ZkProofJobData): Promise<void> {
    await this.queue.add('generate', data);
    await this.db
      .insert(healthRecordProofs)
      .values({ healthRecordId: data.recordId });
  }

  async verify(
    recordId: string,
    patientUserId: string,
  ): Promise<{
    valid: boolean;
    commitment: string;
    anchorTxHash: string | null;
    verificationTxHash: string | null;
  }> {
    const row = await this.db.query.healthRecordProofs.findFirst({
      where: eq(healthRecordProofs.healthRecordId, recordId),
    });

    if (!row) throw new NotFoundException('No proof found for this record');
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

    let verificationTxHash: string | null = row.verificationTxHash ?? null;
    const wallet = await this.db.query.wallets.findFirst({
      where: eq(wallets.userId, patientUserId),
    });

    if (wallet?.encryptedSecret) {
      const decryptedSecret = this.walletEncryption.decrypt(
        wallet.encryptedSecret,
      );
      const txHash = await this.stellar.submitVerificationTx(
        decryptedSecret,
        row.commitment!,
      );
      verificationTxHash = txHash;
      await this.db
        .update(healthRecordProofs)
        .set({ verificationTxHash: txHash })
        .where(eq(healthRecordProofs.healthRecordId, recordId));
      this.notifications.push(
        patientUserId,
        'VERIFICATION_TX_CHARGED',
        'Verification Transaction Charged',
        'A small XLM fee was deducted from your wallet to verify your health record proof on the Stellar blockchain.',
        { recordId, txHash },
      );
    }

    return {
      valid,
      commitment: row.commitment!,
      anchorTxHash: row.anchorTxHash ?? null,
      verificationTxHash,
    };
  }

  async getStatus(recordId: string) {
    return this.db.query.healthRecordProofs.findFirst({
      where: eq(healthRecordProofs.healthRecordId, recordId),
    });
  }
}
