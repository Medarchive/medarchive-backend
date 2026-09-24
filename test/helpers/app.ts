import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from '../../src/app.module';
import { StellarService } from '../../src/wallet/stellar.service';
import { MailService } from '../../src/mail/mail.service';
import { DB } from '../../src/db/db.module';
import type { Database } from '../../src/db/db.module';
import { AllExceptionsFilter } from '../../src/common/filters/http-exception.filter';
import { ThrottlerExceptionFilter } from '../../src/common/filters/throttler-exception.filter';
import { LoggingInterceptor } from '../../src/common/interceptors/logging.interceptor';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';
import { createStellarServiceMock } from './mock-stellar.service';
import { createMailServiceMock } from './mock-mail.service';

export interface TestApp {
  app: INestApplication;
  db: Database;
  stellar: ReturnType<typeof createStellarServiceMock>;
  mail: ReturnType<typeof createMailServiceMock>;
}

export async function createTestApp(): Promise<TestApp> {
  const stellar = createStellarServiceMock();
  const mail = createMailServiceMock();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(StellarService)
    .useValue(stellar)
    .overrideProvider(MailService)
    .useValue(mail)
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.enableVersioning({ type: VersioningType.URI });
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(reflector),
  );
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new ThrottlerExceptionFilter(),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();

  return { app, db: moduleRef.get<Database>(DB), stellar, mail };
}
