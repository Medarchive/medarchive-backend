import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [ActivityLogModule, MailModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
