import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '../../config/env';

const TIMESTAMP_WINDOW_MS = 5 * 60 * 1000;

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();

    const apiKey = req.headers['x-api-key'];
    const signature = req.headers['x-api-signature'];
    const timestamp = req.headers['x-api-timestamp'];

    if (
      typeof apiKey !== 'string' ||
      typeof signature !== 'string' ||
      typeof timestamp !== 'string'
    ) {
      throw new UnauthorizedException('Missing API authentication headers');
    }

    const ts = Number(timestamp);
    if (isNaN(ts) || Math.abs(Date.now() - ts) > TIMESTAMP_WINDOW_MS) {
      throw new UnauthorizedException('Request timestamp out of acceptable window');
    }

    const payload = `${apiKey}:${timestamp}`;
    const expected = createHmac('sha256', env().API_KEY_SECRET)
      .update(payload)
      .digest('hex');

    const expectedBuf = Buffer.from(expected, 'hex');
    const receivedBuf = Buffer.alloc(expectedBuf.length);

    try {
      Buffer.from(signature, 'hex').copy(receivedBuf);
    } catch {
      throw new UnauthorizedException('Invalid signature format');
    }

    if (!timingSafeEqual(expectedBuf, receivedBuf)) {
      throw new UnauthorizedException('Invalid API signature');
    }

    return true;
  }
}
