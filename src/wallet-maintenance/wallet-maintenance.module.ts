import { Module } from '@nestjs/common';
import { WalletTrustlineService } from './wallet-trustline.service';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [WalletModule, NotificationsModule],
  providers: [WalletTrustlineService],
  exports: [WalletTrustlineService],
})
export class WalletMaintenanceModule {}
