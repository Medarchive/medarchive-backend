import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request } from 'express';
import { getContextUserId } from '../context/request.context';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request & { log?: { assign?: (obj: Record<string, unknown>) => void } }>();

    return next.handle().pipe(
      tap(() => {
        const userId = getContextUserId();
        if (userId && req.log?.assign) {
          req.log.assign({ userId });
        }
      }),
    );
  }
}
