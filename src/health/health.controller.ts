import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { sql } from 'drizzle-orm';

@ApiTags('health')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('health')
export class HealthController {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Service health check' })
  async check() {
    const [dbOk, redisOk] = await Promise.allSettled([
      this.db.execute(sql`SELECT 1`).then(() => true),
      this.cache.set('__health__', '1', 1000).then(() => true),
    ]);

    const db = dbOk.status === 'fulfilled';
    const redis = redisOk.status === 'fulfilled';
    const healthy = db && redis;

    return {
      status: healthy ? 'ok' : 'degraded',
      db: db ? 'ok' : 'unreachable',
      redis: redis ? 'ok' : 'unreachable',
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version ?? '0.0.1',
    };
  }
}
