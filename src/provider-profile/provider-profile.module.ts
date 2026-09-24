import { Module } from '@nestjs/common';
import { ProviderProfileService } from './provider-profile.service';
import { ProviderProfileController } from './provider-profile.controller';
import { S3Module } from '../s3/s3.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { ClinicalProofsModule } from '../clinical-proofs/clinical-proofs.module';

@Module({
  imports: [S3Module, ActivityLogModule, ClinicalProofsModule],
  controllers: [ProviderProfileController],
  providers: [ProviderProfileService],
})
export class ProviderProfileModule {}
