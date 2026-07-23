import { Module } from '@nestjs/common';
import { HealthRecordsController } from './health-records.controller';
import { HealthRecordsService } from './health-records.service';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [DashboardModule],
  controllers: [HealthRecordsController],
  providers: [HealthRecordsService],
  exports: [HealthRecordsService],
})
export class HealthRecordsModule {}
