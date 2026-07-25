import { Module } from '@nestjs/common';
import { EmergencyContactsController } from './emergency-contacts.controller';
import { EmergencyContactsService } from './emergency-contacts.service';
import { DashboardModule } from '../dashboard/dashboard.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  imports: [DashboardModule, ActivityLogModule],
  controllers: [EmergencyContactsController],
  providers: [EmergencyContactsService],
  exports: [EmergencyContactsService],
})
export class EmergencyContactsModule {}
