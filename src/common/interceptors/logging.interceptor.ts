import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Request, Response } from 'express';
import { getRequestId, getContextUserId } from '../context/request.context';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const res = ctx.switchToHttp().getResponse<Response>();
    const { method, originalUrl, ip } = req;
    const userAgent = req.headers['user-agent'] ?? '-';
    const contentLength = req.headers['content-length'] ?? '0';
    const requestId = getRequestId();
    const startedAt = Date.now();

    this.logger.log(
      `Request Started  | ${method} ${originalUrl} | ip=${ip} | requestId=${requestId} | contentLength=${contentLength}B | ua="${userAgent}"`,
    );

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - startedAt;
        const status = res.statusCode;
        const userId = getContextUserId();
        const responseSize = res.getHeader('content-length') ?? '-';
        const userPart = userId ? ` | userId=${userId}` : '';

        this.logger.log(
          `Request Completed | ${method} ${originalUrl} | status=${status} | duration=${ms}ms | responseSize=${responseSize}B | requestId=${requestId}${userPart}`,
        );
      }),
      catchError((err: unknown) => {
        const ms = Date.now() - startedAt;
        const status = (err as { status?: number })?.status ?? 500;
        const message = (err as Error)?.message ?? 'Unknown error';
        const errorCode = (err as { code?: string })?.code ?? '-';

        this.logger.error(
          `Request Failed    | ${method} ${originalUrl} | status=${status} | duration=${ms}ms | requestId=${requestId} | errorCode=${errorCode} | message="${message}"`,
          process.env.NODE_ENV !== 'production' ? (err as Error)?.stack : undefined,
        );

        return throwError(() => err);
      }),
    );
  }
}
