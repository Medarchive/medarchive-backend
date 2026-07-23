import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import { patientCareIds, wallets, userPersonalInfo } from '../db/schema';
import { DashboardService } from '../dashboard/dashboard.service';

const SHARE_LINK_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class CareIdService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly dashboard: DashboardService,
  ) {}

  async getOrCreate(userId: string) {
    const existing = await this.db.query.patientCareIds.findFirst({
      where: eq(patientCareIds.userId, userId),
    });

    if (existing) return existing;

    const [created] = await this.db
      .insert(patientCareIds)
      .values({ userId })
      .returning();

    await this.dashboard.invalidate(userId);
    return created;
  }

  async get(userId: string) {
    return this.db.query.patientCareIds.findFirst({
      where: eq(patientCareIds.userId, userId),
    });
  }

  async generateShareLink(userId: string) {
    const careId = await this.db.query.patientCareIds.findFirst({
      where: eq(patientCareIds.userId, userId),
    });

    if (!careId) throw new NotFoundException('Care ID not generated yet');

    const token = randomBytes(32).toString('hex');
    await this.cache.set(`care-id:share:${token}`, userId, SHARE_LINK_TTL_MS);

    return { token, expiresInHours: 24 };
  }

  async resolveShareLink(token: string) {
    const userId = await this.cache.get<string>(`care-id:share:${token}`);
    if (!userId) throw new NotFoundException('Share link is invalid or has expired');

    const [careId, wallet, personalInfo] = await Promise.all([
      this.db.query.patientCareIds.findFirst({ where: eq(patientCareIds.userId, userId) }),
      this.db.query.wallets.findFirst({ where: eq(wallets.userId, userId) }),
      this.db.query.userPersonalInfo.findFirst({ where: eq(userPersonalInfo.userId, userId) }),
    ]);

    return {
      careId: careId?.careId ?? null,
      status: careId?.status ?? null,
      walletAddress: wallet?.address ?? null,
      name: personalInfo ? `${personalInfo.firstName} ${personalInfo.lastName}` : null,
      createdAt: careId?.createdAt ?? null,
    };
  }
}
