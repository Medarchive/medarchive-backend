import { Module } from '@nestjs/common';
import { MedicalHistoryController } from './medical-history.controller';
import { MedicalConditionsController } from './medical-conditions.controller';
import { MedicalProfileController } from './medical-profile.controller';
import { MedicalHistoryService } from './medical-history.service';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [DashboardModule],
  controllers: [MedicalHistoryController, MedicalConditionsController, MedicalProfileController],
  providers: [MedicalHistoryService],
  exports: [MedicalHistoryService],
})
export class MedicalHistoryModule {}
