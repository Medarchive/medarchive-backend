import { Module } from '@nestjs/common';
import { ServiceOrdersController } from './service-orders.controller';
import { ServiceOrdersService } from './service-orders.service';
import { ServiceOrdersMonitorService } from './service-orders-monitor.service';
import { WalletModule } from '../wallet/wallet.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [WalletModule, ActivityLogModule, NotificationsModule],
  controllers: [ServiceOrdersController],
  providers: [ServiceOrdersService, ServiceOrdersMonitorService],
  exports: [ServiceOrdersService],
})
export class ServiceOrdersModule {}
