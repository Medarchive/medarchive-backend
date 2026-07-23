import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { eq, desc } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import {
  userMedicalProfile,
  userMedicalConditions,
  healthRecords,
  patientCareIds,
  emergencyContacts,
} from '../db/schema';
import { S3Service, PRESIGNED_URL_REFRESH_THRESHOLD_MS } from '../s3/s3.service';

export const dashboardCacheKey = (userId: string) => `dashboard:${userId}`;
const DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly s3: S3Service,
  ) {}

  async get(userId: string) {
    const cached = await this.cache.get(dashboardCacheKey(userId));
    if (cached) return cached;

    const data = await this.aggregate(userId);
    await this.cache.set(dashboardCacheKey(userId), data, DASHBOARD_CACHE_TTL_MS);
    return data;
  }

  async invalidate(userId: string) {
    await this.cache.del(dashboardCacheKey(userId));
  }

  private async aggregate(userId: string) {
    const [profile, conditions, recentRecords, careId, contacts] = await Promise.all([
      this.db.query.userMedicalProfile.findFirst({
        where: eq(userMedicalProfile.userId, userId),
      }),
      this.db.query.userMedicalConditions.findMany({
        where: eq(userMedicalConditions.userId, userId),
        with: { condition: true },
      }),
      this.db.query.healthRecords.findMany({
        where: eq(healthRecords.userId, userId),
        orderBy: [desc(healthRecords.createdAt)],
        limit: 6,
      }),
      this.db.query.patientCareIds.findFirst({
        where: eq(patientCareIds.userId, userId),
      }),
      this.db.query.emergencyContacts.findMany({
        where: eq(emergencyContacts.userId, userId),
        orderBy: emergencyContacts.createdAt,
      }),
    ]);

    const now = Date.now();
    const refreshedRecords = await Promise.all(
      recentRecords.map(async (r) => {
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
      healthOverview: {
        bloodGroup: profile?.bloodGroup ?? null,
        genotype: profile?.genotype ?? null,
        heightCm: profile?.heightCm ?? null,
        weightKg: profile?.weightKg ?? null,
        currentlyTakingMedication: profile?.currentlyTakingMedication ?? false,
        conditions: conditions.map((r) => r.condition),
      },
      recentRecords: refreshedRecords,
      careId: careId ?? null,
      emergencyContacts: contacts,
    };
  }
}
