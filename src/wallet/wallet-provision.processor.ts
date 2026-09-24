import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WalletService } from './wallet.service';
import {
  WALLET_PROVISION_QUEUE,
  type WalletProvisionJobData,
} from './wallet-provision.types';

@Processor(WALLET_PROVISION_QUEUE)
export class WalletProvisionProcessor extends WorkerHost {
  private readonly logger = new Logger(WalletProvisionProcessor.name);

  constructor(private readonly walletService: WalletService) {
    super();
  }

  async process(job: Job<WalletProvisionJobData>): Promise<void> {
    try {
      await this.walletService.create(job.data.userId);
      this.logger.log(`Custodial wallet provisioned userId=${job.data.userId}`);
    } catch (err) {
      this.logger.error(
        `Custodial wallet provisioning failed userId=${job.data.userId}: ${String(err)}`,
      );
    }
  }
}
