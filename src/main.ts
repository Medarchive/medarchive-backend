import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { validateEnv, env } from './config/env';
import {
  ApiErrorResponse,
  ApiSuccessResponse,
  AuthTokensData,
  LoginWithNonceData,
  LoginWithTokensData,
  OtpResendData,
  PaginatedUsersData,
  PaginationMetaData,
  PatientProfileData,
  ProviderProfileData,
  RegisterResponseData,
  UserProfileData,
} from './common/swagger/api-responses';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  validateEnv(process.env);

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = new Logger('Bootstrap');
  app.enableShutdownHooks();

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          scriptSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:'],
        },
      },
    }),
  );

  app.use(compression());

  app.enableCors({
    origin: env().ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-api-key',
      'x-api-signature',
      'x-api-timestamp',
      'x-request-id',
    ],
    exposedHeaders: [
      'x-request-id',
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-ratelimit-reset',
    ],
  });

  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.enableVersioning({ type: VersioningType.URI });

  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(reflector),
  );
  app.useGlobalFilters(new AllExceptionsFilter(), new ThrottlerExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (env().NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('MedArchive Africa')
      .setDescription('Decentralized EHR — patient-owned encrypted health records on Stellar')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'jwt')
      .addApiKey({ type: 'apiKey', in: 'header', name: 'x-api-key' }, 'api-key')
      .addApiKey({ type: 'apiKey', in: 'header', name: 'x-api-signature' }, 'api-signature')
      .addApiKey({ type: 'apiKey', in: 'header', name: 'x-api-timestamp' }, 'api-timestamp')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig, {
      extraModels: [
        ApiSuccessResponse,
        ApiErrorResponse,
        RegisterResponseData,
        OtpResendData,
        LoginWithTokensData,
        LoginWithNonceData,
        AuthTokensData,
        UserProfileData,
        PatientProfileData,
        ProviderProfileData,
        PaginatedUsersData,
      ],
    });
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });

    logger.log('Swagger docs → /api/docs');
  }

  const port = env().APP_PORT;
  await app.listen(port);
  logger.log(`MedArchive API running on port ${port} [${env().NODE_ENV}]`);
}

bootstrap();
