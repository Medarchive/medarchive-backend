import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ClinicalProofsController } from './clinical-proofs.controller';
import { ClinicalProofsService } from './clinical-proofs.service';
import {
  ClinicalProofsProcessor,
  CLINICAL_PROOF_QUEUE,
} from './clinical-proofs.processor';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [
    ActivityLogModule,
    NotificationsModule,
    DashboardModule,
    BullModule.registerQueue({ name: CLINICAL_PROOF_QUEUE }),
  ],
  controllers: [ClinicalProofsController],
  providers: [ClinicalProofsService, ClinicalProofsProcessor],
  exports: [ClinicalProofsService],
})
export class ClinicalProofsModule {}
