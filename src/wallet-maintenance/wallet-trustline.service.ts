import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { isNotNull } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import { wallets } from '../db/schema';
import { StellarService } from '../wallet/stellar.service';
import { WalletEncryptionService } from '../wallet/wallet-encryption.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface TrustlineSweepResult {
  processed: number;
  fixed: number;
  skipped: number;
  failed: number;
}

@Injectable()
export class WalletTrustlineService {
  private readonly logger = new Logger(WalletTrustlineService.name);
  private running = false;

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly stellar: StellarService,
    private readonly walletEncryption: WalletEncryptionService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron(): Promise<void> {
    if (this.running) {
      this.logger.warn(
        'Previous USDC trustline sweep still running, skipping this tick',
      );
      return;
    }
    this.running = true;
    try {
      await this.ensureTrustlines();
    } finally {
      this.running = false;
    }
  }

  async ensureTrustlines(): Promise<TrustlineSweepResult> {
    const rows = await this.db.query.wallets.findMany({
      where: isNotNull(wallets.encryptedSecret),
    });

    let fixed = 0;
    let skipped = 0;
    let failed = 0;

    for (const wallet of rows) {
      try {
        const outcome = await this.ensureTrustlineForWallet(wallet);
        if (outcome === 'fixed') fixed++;
        else skipped++;
      } catch (err) {
        failed++;
        this.logger.error(
          `Failed to ensure USDC trustline for wallet ${wallet.id}: ${String(err)}`,
        );
      }
    }

    if (fixed > 0 || failed > 0) {
      this.logger.log(
        `USDC trustline sweep: ${rows.length} candidate(s), ${fixed} fixed, ${skipped} already ok, ${failed} failed`,
      );
    }

    return { processed: rows.length, fixed, skipped, failed };
  }

  private async ensureTrustlineForWallet(
    wallet: typeof wallets.$inferSelect,
  ): Promise<'fixed' | 'skipped'> {
    if (!wallet.encryptedSecret) return 'skipped';

    const exists = await this.stellar.accountExists(wallet.address);
    if (!exists) {
      await this.stellar.fundTestnetAccountViaFriendbot(wallet.address);
    } else {
      const hasTrustline = await this.stellar.hasUsdcTrustline(wallet.address);
      if (hasTrustline) return 'skipped';
    }

    const secret = this.walletEncryption.decrypt(wallet.encryptedSecret);
    const txHash = await this.stellar.establishUsdcTrustline(secret);

    this.notifications.push(
      wallet.userId,
      'USDC_TRUSTLINE_ESTABLISHED',
      'USDC Ready',
      'Your Stellar wallet can now send and receive USDC.',
      { txHash },
    );

    return 'fixed';
  }
}
