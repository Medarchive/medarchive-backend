import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { WalletEncryptionService } from './wallet-encryption.service';
import { StellarService } from './stellar.service';
import { WalletProvisionProcessor } from './wallet-provision.processor';
import { WALLET_PROVISION_QUEUE } from './wallet-provision.types';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    ActivityLogModule,
    MailModule,
    BullModule.registerQueue({ name: WALLET_PROVISION_QUEUE }),
  ],
  controllers: [WalletController],
  providers: [
    WalletService,
    WalletEncryptionService,
    StellarService,
    WalletProvisionProcessor,
  ],
  exports: [WalletService, WalletEncryptionService, StellarService],
})
export class WalletModule {}
