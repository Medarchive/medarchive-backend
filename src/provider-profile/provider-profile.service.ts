import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { extname } from 'path';
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import {
  healthRecords,
  patientCareIds,
  providerProfiles,
  providerRecordRequests,
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
    const { patientId, careId, email, requestType, note } = dto;
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

    const [created, provider] = await Promise.all([
      this.db
        .insert(providerRecordRequests)
        .values({ patientId: resolvedPatientId, providerId, requestType, note })
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
