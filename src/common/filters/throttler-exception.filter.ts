import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Response, Request } from 'express';
import { getRequestId } from '../context/request.context';

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ThrottlerFilter');

  catch(_exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const requestId = getRequestId();

    this.logger.warn({
      event: 'rate_limit.exceeded',
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
    });

    // Respond as 404 Not Found — prevents bots from fingerprinting rate limiting
    res.status(HttpStatus.NOT_FOUND).json({
      statusCode: HttpStatus.NOT_FOUND,
      message: 'The requested resource could not be found.',
      timestamp: new Date().toISOString(),
      data: null,
    });
  }
}
