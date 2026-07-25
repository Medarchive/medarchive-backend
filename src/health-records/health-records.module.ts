import { Module } from '@nestjs/common';
import { HealthRecordsController } from './health-records.controller';
import { HealthRecordsService } from './health-records.service';
import { DashboardModule } from '../dashboard/dashboard.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  imports: [DashboardModule, ActivityLogModule],
  controllers: [HealthRecordsController],
  providers: [HealthRecordsService],
  exports: [HealthRecordsService],
})
export class HealthRecordsModule {}
