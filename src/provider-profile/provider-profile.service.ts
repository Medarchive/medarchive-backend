import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { extname } from 'path';
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import {
  healthRecords,
  patientCareIds,
  providerProfiles,
  providerRecordRequests,
  userPersonalInfo,
  users,
} from '../db/schema';
import {
  S3Service,
  PRESIGNED_URL_REFRESH_THRESHOLD_MS,
} from '../s3/s3.service';
import { healthRecordFiles } from '../db/schema';
import type { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';
import type { CreateRecordRequestDto } from './dto/create-record-request.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import type { PaginationDto } from '../common/dto/pagination.dto';
import type { ProviderPatientSearchDto } from './dto/provider-patient-search.dto';

export interface PatientRecordsQuery {
  careId?: string;
  userId?: string;
  email?: string;
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
]);

const MAX_PICTURE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

@Injectable()
export class ProviderProfileService {
  private readonly logger = new Logger(ProviderProfileService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly s3: S3Service,
    private readonly notifications: NotificationsService,
    private readonly activityLog: ActivityLogService,
  ) {}

  private async getProfile(userId: string) {
    const profile = await this.db.query.providerProfiles.findFirst({
      where: eq(providerProfiles.userId, userId),
    });
    if (!profile) {
      throw new NotFoundException('Provider profile not found');
    }
    return profile;
  }

  async findOne(userId: string) {
    return this.getProfile(userId);
  }

  async update(userId: string, dto: UpdateProviderProfileDto) {
    await this.getProfile(userId);

    const [updated] = await this.db
      .update(providerProfiles)
      .set({
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.organizationName !== undefined && {
          organizationName: dto.organizationName,
        }),
        ...(dto.workAddress !== undefined && { workAddress: dto.workAddress }),
        ...(dto.providerType !== undefined && {
          providerType: dto.providerType,
        }),
        ...(dto.specialty !== undefined && { specialty: dto.specialty }),
        ...(dto.licenseNumber !== undefined && {
          licenseNumber: dto.licenseNumber,
        }),
        updatedAt: new Date(),
      })
      .where(eq(providerProfiles.userId, userId))
      .returning();

    return updated;
  }

  async lookupPatientRecords(query: PatientRecordsQuery) {
    const { careId, userId, email } = query;
    const provided = [careId, userId, email].filter(Boolean).length;
    if (provided === 0)
      throw new BadRequestException(
        'Provide exactly one of: careId, userId, email',
      );
    if (provided > 1)
      throw new BadRequestException(
        'Provide exactly one of: careId, userId, email',
      );

    let patientId: string;

    if (careId) {
      const care = await this.db.query.patientCareIds.findFirst({
        where: eq(patientCareIds.careId, careId),
      });
      if (!care)
        throw new NotFoundException('No patient found for this care ID');
      patientId = care.userId;
    } else if (userId) {
      const user = await this.db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { id: true, role: true },
      });
      if (!user || user.role !== 'PATIENT')
        throw new NotFoundException('No patient found for this user ID');
      patientId = user.id;
    } else {
      const user = await this.db.query.users.findFirst({
        where: eq(users.email, email!.toLowerCase()),
        columns: { id: true, role: true },
      });
      if (!user || user.role !== 'PATIENT')
        throw new NotFoundException('No patient found for this email');
      patientId = user.id;
    }

    const [patient, records] = await Promise.all([
      this.db.query.users.findFirst({
        where: eq(users.id, patientId),
        columns: { id: true, fullName: true, email: true },
      }),
      this.db.query.healthRecords.findMany({
        where: eq(healthRecords.userId, patientId),
        orderBy: [desc(healthRecords.createdAt)],
        with: { files: true },
      }),
    ]);

    const now = Date.now();
    const refreshedRecords = await Promise.all(
      records.map((r) => this.refreshFiles(r, now)),
    );

    return { patient, records: refreshedRecords };
  }

  private async refreshFiles<
    T extends {
      files: Array<{
        id: string;
        s3Key: string;
        fileUrl: string;
        fileUrlExpiresAt: Date;
      }>;
    },
  >(record: T, now: number): Promise<T> {
    if (record.files.length === 0) return record;

    const refreshedFiles = await Promise.all(
      record.files.map(async (f) => {
        const expiresAt = new Date(f.fileUrlExpiresAt).getTime();
        if (expiresAt - now > PRESIGNED_URL_REFRESH_THRESHOLD_MS) return f;
        const { fileUrl, fileUrlExpiresAt } = await this.s3.getDownloadUrl(
          f.s3Key,
        );
        await this.db
          .update(healthRecordFiles)
          .set({ fileUrl, fileUrlExpiresAt, updatedAt: new Date() })
          .where(eq(healthRecordFiles.id, f.id));
        return { ...f, fileUrl, fileUrlExpiresAt };
      }),
    );

    return { ...record, files: refreshedFiles };
  }

  async createRecordRequest(providerId: string, dto: CreateRecordRequestDto) {
    const { patientId, careId, email, requestType, note, recordId } = dto;
    const provided = [patientId, careId, email].filter(Boolean).length;
    if (provided === 0)
      throw new BadRequestException(
        'Provide exactly one of: patientId, careId, email',
      );
    if (provided > 1)
      throw new BadRequestException(
        'Provide exactly one of: patientId, careId, email',
      );

    let resolvedPatientId: string;

    if (careId) {
      const care = await this.db.query.patientCareIds.findFirst({
        where: eq(patientCareIds.careId, careId),
      });
      if (!care)
        throw new NotFoundException('No patient found for this care ID');
      resolvedPatientId = care.userId;
    } else if (patientId) {
      const user = await this.db.query.users.findFirst({
        where: eq(users.id, patientId),
        columns: { id: true, role: true },
      });
      if (!user || user.role !== 'PATIENT')
        throw new NotFoundException('No patient found for this user ID');
      resolvedPatientId = user.id;
    } else {
      const user = await this.db.query.users.findFirst({
        where: eq(users.email, email!.toLowerCase()),
        columns: { id: true, role: true },
      });
      if (!user || user.role !== 'PATIENT')
        throw new NotFoundException('No patient found for this email');
      resolvedPatientId = user.id;
    }

    if (recordId) {
      const record = await this.db.query.healthRecords.findFirst({
        where: and(eq(healthRecords.id, recordId), eq(healthRecords.userId, resolvedPatientId)),
        columns: { id: true },
      });
      if (!record) throw new NotFoundException('Record not found for this patient');
    }

    const [created, provider] = await Promise.all([
      this.db
        .insert(providerRecordRequests)
        .values({ patientId: resolvedPatientId, providerId, requestType, note, recordId: recordId ?? null })
        .returning()
        .then((rows) => rows[0]),
      this.db.query.users.findFirst({
        where: eq(users.id, providerId),
        columns: { fullName: true },
      }),
    ]);

    this.notifications.push(
      resolvedPatientId,
      'RECORD_ACCESS_REQUEST',
      'New Record Access Request',
      `${provider?.fullName ?? 'A provider'} has requested access to your health records.`,
      { requestId: created.id, requestType },
    );

    return created;
  }

  async searchPatient(dto: ProviderPatientSearchDto) {
    const care = await this.db.query.patientCareIds.findFirst({
      where: eq(patientCareIds.careId, dto.careId),
    });
    if (!care) throw new NotFoundException('No patient found for this care ID');

    const [user, personalInfo] = await Promise.all([
      this.db.query.users.findFirst({
        where: eq(users.id, care.userId),
        columns: { id: true, fullName: true, email: true, phone: true },
      }),
      this.db.query.userPersonalInfo.findFirst({
        where: eq(userPersonalInfo.userId, care.userId),
        columns: { dateOfBirth: true },
      }),
    ]);

    if (!user) throw new NotFoundException('Patient not found');

    return {
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone ?? null,
      dateOfBirth: personalInfo?.dateOfBirth ?? null,
      careId: care.careId,
      careIdStatus: care.status,
    };
  }

  async getApprovedRecords(providerId: string, patientId: string) {
    const approvedRequests = await this.db.query.providerRecordRequests.findMany({
      where: and(
        eq(providerRecordRequests.providerId, providerId),
        eq(providerRecordRequests.patientId, patientId),
        eq(providerRecordRequests.status, 'APPROVED'),
      ),
      columns: { recordId: true },
    });

    const approvedRecordIds = approvedRequests
      .map((r) => r.recordId)
      .filter((id): id is string => id !== null);

    if (approvedRecordIds.length === 0) return [];

    const records = await this.db.query.healthRecords.findMany({
      where: and(
        eq(healthRecords.userId, patientId),
        inArray(healthRecords.id, approvedRecordIds),
      ),
      with: { files: true },
      orderBy: [desc(healthRecords.createdAt)],
    });

    const now = Date.now();
    return Promise.all(records.map((r) => this.refreshFiles(r, now)));
  }

  async getApprovedRecord(providerId: string, patientId: string, recordId: string) {
    const [request, record] = await Promise.all([
      this.db.query.providerRecordRequests.findFirst({
        where: and(
          eq(providerRecordRequests.providerId, providerId),
          eq(providerRecordRequests.patientId, patientId),
          eq(providerRecordRequests.recordId, recordId),
          eq(providerRecordRequests.status, 'APPROVED'),
        ),
        columns: { id: true },
      }),
      this.db.query.healthRecords.findFirst({
        where: and(eq(healthRecords.id, recordId), eq(healthRecords.userId, patientId)),
        with: { files: true },
      }),
    ]);

    if (!request) throw new NotFoundException('No approved access for this record');
    if (!record) throw new NotFoundException('Record not found');

    const now = Date.now();
    return this.refreshFiles(record, now);
  }

  async getRecordRequest(providerId: string, requestId: string) {
    const request = await this.db.query.providerRecordRequests.findFirst({
      where: and(
        eq(providerRecordRequests.id, requestId),
        eq(providerRecordRequests.providerId, providerId),
      ),
    });
    if (!request) throw new NotFoundException('Record request not found');
    return request;
  }

  async getOwnActivity(userId: string, pagination: PaginationDto) {
    return this.activityLog.findAll(userId, pagination);
  }

  async uploadPicture(userId: string, file: Express.Multer.File) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Only JPEG, PNG, WEBP, or HEIC images are allowed',
      );
    }

    if (file.size > MAX_PICTURE_SIZE_BYTES) {
      throw new BadRequestException('Profile picture must be 5 MB or smaller');
    }

    const profile = await this.getProfile(userId);

    if (profile.profilePictureS3Key) {
      await this.s3
        .delete(profile.profilePictureS3Key)
        .catch((err: unknown) => {
          this.logger.warn(
            `Failed to delete old profile picture key=${profile.profilePictureS3Key}: ${String(err)}`,
          );
        });
    }

    const ext =
      MIME_TO_EXT[file.mimetype] ??
      extname(file.originalname).replace('.', '') ??
      'jpg';
    const s3Key = `provider-profiles/${userId}/picture.${ext}`;

    await this.s3.upload(s3Key, file.buffer, file.mimetype);

    const { fileUrl } = await this.s3.getDownloadUrl(s3Key);

    const [updated] = await this.db
      .update(providerProfiles)
      .set({
        profilePictureUrl: fileUrl,
        profilePictureS3Key: s3Key,
        updatedAt: new Date(),
      })
      .where(eq(providerProfiles.userId, userId))
      .returning();

    this.logger.log(`Profile picture uploaded userId=${userId} key=${s3Key}`);
    return updated;
  }
}
