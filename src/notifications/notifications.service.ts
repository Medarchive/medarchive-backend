import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { and, count, desc, eq, isNull, isNotNull } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import { notifications } from '../db/schema';
import { buildMeta, SortOrder } from '../common/dto/pagination.dto';
import type { NotificationsQueryDto } from './dto/notifications-query.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@Inject(DB) private readonly db: Database) {}

  async findAll(userId: string, query: NotificationsQueryDto) {
    const { page, take, sortOrder, read } = query;
    const offset = (page - 1) * take;

    const conditions = [eq(notifications.userId, userId)];
    if (read === true) conditions.push(isNotNull(notifications.readAt));
    if (read === false) conditions.push(isNull(notifications.readAt));
    const where = and(...conditions);

    const [rows, [{ total }]] = await Promise.all([
      this.db.query.notifications.findMany({
        where,
        orderBy:
          sortOrder === SortOrder.ASC
            ? [notifications.createdAt]
            : [desc(notifications.createdAt)],
        limit: take,
        offset,
      }),
      this.db.select({ total: count() }).from(notifications).where(where),
    ]);

    return { data: rows, meta: buildMeta(total, page, take, rows.length) };
  }

  async update(userId: string, id: string, read: boolean) {
    const [updated] = await this.db
      .update(notifications)
      .set({ readAt: read ? new Date() : null })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();

    if (!updated) {
      const exists = await this.db.query.notifications.findFirst({
        where: eq(notifications.id, id),
      });
      if (!exists) throw new NotFoundException('Notification not found');
      throw new ForbiddenException();
    }

    return updated;
  }

  async remove(userId: string, id: string) {
    const [deleted] = await this.db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning({ id: notifications.id });

    if (!deleted) {
      const exists = await this.db.query.notifications.findFirst({
        where: eq(notifications.id, id),
      });
      if (!exists) throw new NotFoundException('Notification not found');
      throw new ForbiddenException();
    }
  }

  push(
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): void {
    this.db
      .insert(notifications)
      .values({ userId, type, title, body, data: data ?? null })
      .catch((err: unknown) =>
        this.logger.error('Failed to insert notification', err),
      );
  }
}
