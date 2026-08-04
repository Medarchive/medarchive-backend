import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import pinoHttp from 'pino-http';
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
  app.useLogger(app.get(PinoLogger));

  const logger = new Logger('Bootstrap');
  app.enableShutdownHooks();

  const isProd = env().NODE_ENV === 'production';
  app.use(
    pinoHttp({
      level: isProd ? 'info' : 'debug',
      transport: isProd
        ? undefined
        : {
            target: 'pino-pretty',
            options: { colorize: true, singleLine: true },
          },
      genReqId: (req) => {
        const incoming = req.headers?.['x-request-id'];
        return typeof incoming === 'string' && incoming.trim()
          ? incoming.trim()
          : crypto.randomUUID();
      },
      customSuccessMessage: (_req, res) =>
        `request completed [${res.statusCode}]`,
      customErrorMessage: (_req, res) => `request failed [${res.statusCode}]`,
      customAttributeKeys: { responseTime: 'durationMs' },
      customProps: (req: import('http').IncomingMessage) => ({
        method: req.method,
        url: req.url,
        ip: req.socket?.remoteAddress,
        userAgent: req.headers?.['user-agent'],
        requestId: req.headers?.['x-request-id'],
      }),
      serializers: {
        req: () => undefined,
        res: () => undefined,
      },
    }),
  );

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
    origin: env()
      .ALLOWED_ORIGINS.split(',')
      .map((o) => o.trim()),
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

  if (env().NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('MedArchive Africa')
      .setDescription(
        'Decentralized EHR — patient-owned encrypted health records on Stellar',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'jwt',
      )
      .addApiKey({ type: 'apiKey', in: 'header', name: 'x-api-key' }, 'api-key')
      .addApiKey(
        { type: 'apiKey', in: 'header', name: 'x-api-signature' },
        'api-signature',
      )
      .addApiKey(
        { type: 'apiKey', in: 'header', name: 'x-api-timestamp' },
        'api-timestamp',
      )
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
  console.log(`MedArchive API running on port ${port} [${env().NODE_ENV}]`);
}

void bootstrap();
