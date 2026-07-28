import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { WalletEncryptionService } from './wallet-encryption.service';
import { StellarService } from './stellar.service';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [ActivityLogModule, MailModule],
  controllers: [WalletController],
  providers: [WalletService, WalletEncryptionService, StellarService],
  exports: [WalletService, WalletEncryptionService, StellarService],
})
export class WalletModule {}
