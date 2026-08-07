import { Module } from '@nestjs/common';
import { ProviderProfileService } from './provider-profile.service';
import { ProviderProfileController } from './provider-profile.controller';
import { S3Module } from '../s3/s3.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  imports: [S3Module, ActivityLogModule],
  controllers: [ProviderProfileController],
  providers: [ProviderProfileService],
})
export class ProviderProfileModule {}
