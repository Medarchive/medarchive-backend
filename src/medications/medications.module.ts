import { Module } from '@nestjs/common';
import { MedicationsController } from './medications.controller';
import { MedicationsService } from './medications.service';
import { DashboardModule } from '../dashboard/dashboard.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  imports: [DashboardModule, ActivityLogModule],
  controllers: [MedicationsController],
  providers: [MedicationsService],
  exports: [MedicationsService],
})
export class MedicationsModule {}
