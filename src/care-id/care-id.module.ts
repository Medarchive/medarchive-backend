import { Module } from '@nestjs/common';
import { CareIdController } from './care-id.controller';
import { CareIdService } from './care-id.service';
import { DashboardModule } from '../dashboard/dashboard.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  imports: [DashboardModule, ActivityLogModule],
  controllers: [CareIdController],
  providers: [CareIdService],
  exports: [CareIdService],
})
export class CareIdModule {}
