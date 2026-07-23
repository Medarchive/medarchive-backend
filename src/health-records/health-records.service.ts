import { BadRequestException, Injectable, Inject, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import { healthRecords } from '../db/schema';
import { S3Service, PRESIGNED_URL_REFRESH_THRESHOLD_MS } from '../s3/s3.service';
import { DashboardService } from '../dashboard/dashboard.service';
import type { CreateHealthRecordDto } from './dto/create-health-record.dto';
import { SortOrder } from '../common/dto/pagination.dto';
import type { PaginationDto } from '../common/dto/pagination.dto';
import { buildMeta } from '../common/dto/pagination.dto';
import { count } from 'drizzle-orm';

@Injectable()
export class HealthRecordsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly s3: S3Service,
    private readonly dashboard: DashboardService,
  ) {}

  async upload(userId: string, file: Express.Multer.File, dto: CreateHealthRecordDto) {
    if (dto.recordType === 'LAB_TEST' && !dto.labReportType) {
      throw new BadRequestException('labReportType is required for LAB_TEST records');
    }

    const key = `health-records/${userId}/${randomUUID()}/${file.originalname}`;

    await this.s3.upload(key, file.buffer, file.mimetype);
    const { fileUrl, fileUrlExpiresAt } = await this.s3.getDownloadUrl(key);

    const [record] = await this.db
      .insert(healthRecords)
      .values({
        userId,
        title: dto.title,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        recordType: dto.recordType,
        labReportType: dto.labReportType,
        referredBy: dto.referredBy,
        description: dto.description,
        s3Key: key,
        fileUrl,
        fileUrlExpiresAt,
      })
      .returning();

    await this.dashboard.invalidate(userId);
    return record;
  }

  async findAll(userId: string, pagination: PaginationDto) {
    const { page, take, sortOrder } = pagination;
    const offset = (page - 1) * take;

    const [rows, [{ total }]] = await Promise.all([
      this.db.query.healthRecords.findMany({
        where: eq(healthRecords.userId, userId),
        orderBy: sortOrder === SortOrder.ASC
          ? [healthRecords.createdAt]
          : [desc(healthRecords.createdAt)],
        limit: take,
        offset,
      }),
      this.db
        .select({ total: count() })
        .from(healthRecords)
        .where(eq(healthRecords.userId, userId)),
    ]);

    const now = Date.now();
    const refreshed = await Promise.all(
      rows.map(async (r) => {
        const expiresAt = new Date(r.fileUrlExpiresAt).getTime();
        if (expiresAt - now > PRESIGNED_URL_REFRESH_THRESHOLD_MS) return r;

        const { fileUrl, fileUrlExpiresAt } = await this.s3.getDownloadUrl(r.s3Key);
        await this.db
          .update(healthRecords)
          .set({ fileUrl, fileUrlExpiresAt, updatedAt: new Date() })
          .where(eq(healthRecords.id, r.id));

        return { ...r, fileUrl, fileUrlExpiresAt };
      }),
    );

    return {
      data: refreshed,
      meta: buildMeta(total, page, take, refreshed.length),
    };
  }

  async findOne(userId: string, id: string) {
    const record = await this.db.query.healthRecords.findFirst({
      where: eq(healthRecords.id, id),
    });

    if (!record || record.userId !== userId) throw new NotFoundException('Record not found');

    const now = Date.now();
    const expiresAt = new Date(record.fileUrlExpiresAt).getTime();
    if (expiresAt - now <= PRESIGNED_URL_REFRESH_THRESHOLD_MS) {
      const { fileUrl, fileUrlExpiresAt } = await this.s3.getDownloadUrl(record.s3Key);
      await this.db
        .update(healthRecords)
        .set({ fileUrl, fileUrlExpiresAt, updatedAt: new Date() })
        .where(eq(healthRecords.id, id));

      return { ...record, fileUrl, fileUrlExpiresAt };
    }

    return record;
  }

  async remove(userId: string, id: string) {
    const record = await this.db.query.healthRecords.findFirst({
      where: eq(healthRecords.id, id),
    });

    if (!record || record.userId !== userId) throw new NotFoundException('Record not found');

    await Promise.all([
      this.s3.delete(record.s3Key),
      this.db.delete(healthRecords).where(eq(healthRecords.id, id)),
    ]);

    await this.dashboard.invalidate(userId);
  }
}
