import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { env } from '../config/env';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  imports: [
    ActivityLogModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: env().JWT_SECRET,
        signOptions: { expiresIn: env().JWT_EXPIRES_IN as StringValue },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule, JwtStrategy],
})
export class AuthModule {}
