import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { Response } from 'express';
import { getRequestId } from '../context/request.context';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

export interface ApiResponse {
  statusCode: number;
  message: string;
  timestamp: string;
  data: unknown;
}

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<ApiResponse> {
    const res = ctx.switchToHttp().getResponse<Response>();
    const message =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? 'success';

    return next.handle().pipe(
      map((data) => ({
        statusCode: res.statusCode,
        message,
        timestamp: new Date().toISOString(),
        data: data ?? null,
      })),
    );
  }
}
