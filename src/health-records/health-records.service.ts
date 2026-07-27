import { BadRequestException, Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gte, ilike, lte } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import { healthRecords, healthRecordFiles, users } from '../db/schema';
import { S3Service, PRESIGNED_URL_REFRESH_THRESHOLD_MS } from '../s3/s3.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { MailService } from '../mail/mail.service';
import { ZkProofService } from '../zk-proof/zk-proof.service';
import type { CreateHealthRecordDto } from './dto/create-health-record.dto';
import { SortOrder } from '../common/dto/pagination.dto';
import { buildMeta } from '../common/dto/pagination.dto';
import type { HealthRecordsQueryDto } from './dto/health-records-query.dto';
import { HealthRecordSortBy } from './dto/health-records-query.dto';
import { count } from 'drizzle-orm';

@Injectable()
export class HealthRecordsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly s3: S3Service,
    private readonly dashboard: DashboardService,
    private readonly activityLog: ActivityLogService,
    private readonly mail: MailService,
    private readonly zkProof: ZkProofService,
  ) {}

  async upload(userId: string, files: Express.Multer.File[], dto: CreateHealthRecordDto) {
    if (dto.recordType === 'LAB_TEST' && !dto.testName) {
      throw new BadRequestException('testName is required for LAB_TEST records');
    }
    if (dto.recordType === 'MEDICATION' && !dto.drug) {
      throw new BadRequestException('drug is required for MEDICATION records');
    }
    if (dto.recordType === 'ALLERGY' && (!dto.allergyType || !dto.cause)) {
      throw new BadRequestException('allergyType and cause are required for ALLERGY records');
    }

    const fileRows = files.length > 0
      ? await Promise.all(
          files.map(async (file) => {
            const key = `health-records/${userId}/${randomUUID()}/${file.originalname}`;
            await this.s3.upload(key, file.buffer, file.mimetype);
            const { fileUrl, fileUrlExpiresAt } = await this.s3.getDownloadUrl(key);
            return { fileName: file.originalname, fileType: file.mimetype, fileSize: file.size, s3Key: key, fileUrl, fileUrlExpiresAt };
          }),
        )
      : [];

    const [record] = await this.db
      .insert(healthRecords)
      .values({
        userId,
        title: dto.title,
        recordType: dto.recordType,
        testName: dto.testName,
        referredBy: dto.referredBy,
        drugClass: dto.drugClass,
        prescribedBy: dto.prescribedBy,
        drug: dto.drug,
        dosage: dto.dosage,
        frequency: dto.frequency,
        endDate: dto.endDate,
        allergyType: dto.allergyType,
        cause: dto.cause,
        management: dto.management,
        recordDate: dto.recordDate,
        description: dto.description,
      })
      .returning();

    if (fileRows.length > 0) {
      await this.db.insert(healthRecordFiles).values(
        fileRows.map((f) => ({ ...f, healthRecordId: record.id })),
      );
    }

    await this.dashboard.invalidate(userId);
    this.activityLog.log(userId, 'HEALTH_RECORD_UPLOADED', { recordId: record.id, title: dto.title, recordType: dto.recordType });

    const user = await this.db.query.users.findFirst({ where: eq(users.id, userId) });
    if (user) this.mail.sendHealthRecordUploaded(user.email, user.fullName, dto.title, dto.recordType).catch(() => {});

    this.zkProof.enqueue({
      recordId: record.id,
      userId,
      recordType: dto.recordType,
      fileS3Keys: fileRows.map((f) => f.s3Key),
    }).catch(() => {});

    return this.findOne(userId, record.id);
  }

  async findAll(userId: string, query: HealthRecordsQueryDto) {
    const { page, take, sortOrder, sortBy, recordType, search, startDate, endDate } = query;
    const offset = (page - 1) * take;

    const where = and(
      eq(healthRecords.userId, userId),
      recordType ? eq(healthRecords.recordType, recordType) : undefined,
      search ? ilike(healthRecords.title, `%${search}%`) : undefined,
      startDate ? gte(healthRecords.recordDate, startDate) : undefined,
      endDate ? lte(healthRecords.recordDate, endDate) : undefined,
    );

    const sortColumn = sortBy === HealthRecordSortBy.RECORD_DATE
      ? healthRecords.recordDate
      : healthRecords.createdAt;

    const [rows, [{ total }]] = await Promise.all([
      this.db.query.healthRecords.findMany({
        where,
        orderBy: sortOrder === SortOrder.ASC ? [sortColumn] : [desc(sortColumn)],
        limit: take,
        offset,
        with: { files: true },
      }),
      this.db
        .select({ total: count() })
        .from(healthRecords)
        .where(where),
    ]);

    const now = Date.now();
    const refreshed = await Promise.all(rows.map((r) => this.refreshFiles(r, now)));

    return {
      data: refreshed,
      meta: buildMeta(total, page, take, refreshed.length),
    };
  }

  async findOne(userId: string, id: string) {
    const record = await this.db.query.healthRecords.findFirst({
      where: eq(healthRecords.id, id),
      with: { files: true },
    });

    if (!record || record.userId !== userId) throw new NotFoundException('Record not found');

    return this.refreshFiles(record, Date.now());
  }

  async remove(userId: string, id: string) {
    const record = await this.db.query.healthRecords.findFirst({
      where: eq(healthRecords.id, id),
      with: { files: true },
    });

    if (!record || record.userId !== userId) throw new NotFoundException('Record not found');

    await Promise.all([
      ...record.files.map((f) => this.s3.delete(f.s3Key)),
      this.db.delete(healthRecords).where(eq(healthRecords.id, id)),
    ]);

    await this.dashboard.invalidate(userId);
    this.activityLog.log(userId, 'HEALTH_RECORD_DELETED', { recordId: id, title: record.title });
  }

  private async refreshFiles<T extends { files: Array<{ id: string; s3Key: string; fileUrl: string; fileUrlExpiresAt: Date }> }>(
    record: T,
    now: number,
  ): Promise<T> {
    if (record.files.length === 0) return record;

    const refreshedFiles = await Promise.all(
      record.files.map(async (f) => {
        const expiresAt = new Date(f.fileUrlExpiresAt).getTime();
        if (expiresAt - now > PRESIGNED_URL_REFRESH_THRESHOLD_MS) return f;

        const { fileUrl, fileUrlExpiresAt } = await this.s3.getDownloadUrl(f.s3Key);
        await this.db
          .update(healthRecordFiles)
          .set({ fileUrl, fileUrlExpiresAt, updatedAt: new Date() })
          .where(eq(healthRecordFiles.id, f.id));

        return { ...f, fileUrl, fileUrlExpiresAt };
      }),
    );

    return { ...record, files: refreshedFiles };
  }
}
