import { Injectable, Inject, Logger } from '@nestjs/common';
import { desc, eq, count } from 'drizzle-orm';
import { DB } from '../db/db.module.js';
import type { Database } from '../db/db.module.js';
import { activityLogs } from '../db/schema/index.js';
import type { activityActionEnum } from '../db/schema/index.js';
import type { PaginationDto } from '../common/dto/pagination.dto.js';
import { buildMeta, SortOrder } from '../common/dto/pagination.dto.js';

export type ActivityAction = (typeof activityActionEnum.enumValues)[number];

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(@Inject(DB) private readonly db: Database) {}

  log(
    userId: string,
    action: ActivityAction,
    metadata?: Record<string, unknown>,
  ): void {
    this.db
      .insert(activityLogs)
      .values({ userId, action, metadata: metadata ?? null })
      .catch((err: unknown) =>
        this.logger.error('Failed to write activity log', err),
      );
  }

  async findAll(userId: string, pagination: PaginationDto) {
    const { page, take, sortOrder } = pagination;
    const offset = (page - 1) * take;

    const [rows, [{ total }]] = await Promise.all([
      this.db.query.activityLogs.findMany({
        where: eq(activityLogs.userId, userId),
        orderBy:
          sortOrder === SortOrder.ASC
            ? [activityLogs.createdAt]
            : [desc(activityLogs.createdAt)],
        limit: take,
        offset,
      }),
      this.db
        .select({ total: count() })
        .from(activityLogs)
        .where(eq(activityLogs.userId, userId)),
    ]);

    return {
      data: rows,
      meta: buildMeta(total, page, take, rows.length),
    };
  }
}
