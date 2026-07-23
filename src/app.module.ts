import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';
import KeyvRedis from '@keyv/redis';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MedicalHistoryModule } from './medical-history/medical-history.module';
import { CareIdModule } from './care-id/care-id.module';
import { S3Module } from './s3/s3.module';
import { HealthRecordsModule } from './health-records/health-records.module';
import { EmergencyContactsModule } from './emergency-contacts/emergency-contacts.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { WalletModule } from './wallet/wallet.module';
import { MedicationsModule } from './medications/medications.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { env } from './config/env';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env.development.local',
      isGlobal: true,
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => ({
        stores: [new KeyvRedis(env().REDIS_URL)],
      }),
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          { name: 'global', ttl: 60_000, limit: 100 },
          { name: 'auth', ttl: 60_000, limit: 10 },
        ],
        storage: new ThrottlerStorageRedisService(env().REDIS_URL),
      }),
    }),
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: { url: env().REDIS_URL },
      }),
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    DbModule,
    HealthModule,
    MailModule,
    AuthModule,
    UsersModule,
    MedicalHistoryModule,
    CareIdModule,
    S3Module,
    HealthRecordsModule,
    EmergencyContactsModule,
    DashboardModule,
    WalletModule,
    MedicationsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('/*path');
  }
}
