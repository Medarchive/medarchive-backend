import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { getRequestId, getContextUserId } from '../context/request.context';
import { ZodError } from 'zod';

const INTERNAL_ERROR_MESSAGE =
  "Something went wrong on our end. We've been notified and are looking into it.";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('http');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const requestId = getRequestId();
    const userId = getContextUserId();
    const isProd = process.env.NODE_ENV === 'production';

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string = INTERNAL_ERROR_MESSAGE;
    let error: string | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        if (Array.isArray(b.message)) {
          error = b.message[0] as string;
          message = 'Validation failed.';
        } else {
          message = (b.message as string) ?? exception.message;
        }
      }
    } else if (exception instanceof ZodError) {
      statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
      message = 'Validation failed.';
      const first = exception.issues[0];
      error = first.path.length
        ? `${first.path.join('.')} ${first.message}`
        : first.message;
    }

    const isRouteMiss =
      statusCode === HttpStatus.NOT_FOUND && message.startsWith('Cannot ');

    if (!isRouteMiss) {
      const is5xx = statusCode >= 500;
      const payload: Record<string, unknown> = {
        event: 'exception.caught',
        requestId,
        statusCode,
        message,
        ...(userId && { userId }),
        ...(is5xx && !isProd && { stack: (exception as Error)?.stack }),
      };

      if (is5xx) {
        this.logger.error(payload);
      } else {
        this.logger.warn(payload);
      }
    }

    res.status(statusCode).json({
      statusCode,
      message,
      timestamp: new Date().toISOString(),
      ...(error && { error }),
      data: null,
    });
  }
}
