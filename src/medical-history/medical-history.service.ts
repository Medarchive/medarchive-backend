import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { eq, inArray, and, sql } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { Database, DbTransaction } from '../db/db.module';
import {
  userMedicalConditions,
  medicalConditions,
  userMedicalProfile,
} from '../db/schema';
import type { JwtPayload } from '../auth/auth.types';
import { DashboardService } from '../dashboard/dashboard.service';
import type { MedicalHistoryDto } from './dto/medical-history.dto';
import type { UpdateMedicalProfileDto } from './dto/medical-profile.dto';

const ACTIVE_CONDITIONS_CACHE_KEY = 'medical_conditions:active_ids';

@Injectable()
export class MedicalHistoryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MedicalHistoryService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly dashboard: DashboardService,
  ) {}

  async onApplicationBootstrap() {
    const tableExists = await this.db.execute(
      sql`SELECT 1 FROM information_schema.tables WHERE table_name = 'medical_conditions' LIMIT 1`,
    );

    if (!tableExists.length) {
      this.logger.warn(
        'Conditions cache warm skipped — table does not exist yet.',
      );
      return;
    }

    await this.warmConditionsCache();
  }

  async add(requestor: JwtPayload, dto: MedicalHistoryDto) {
    await this.assertConditionsExist(dto.conditionIds);

    await this.db.transaction(async (tx) => {
      await tx
        .insert(userMedicalConditions)
        .values(
          dto.conditionIds.map((conditionId) => ({
            userId: requestor.sub,
            conditionId,
          })),
        )
        .onConflictDoNothing();

      await this.upsertMedicalProfile(
        requestor.sub,
        dto.currentlyTakingMedication,
        tx,
      );
    });

    await this.dashboard.invalidate(requestor.sub);
    return this.findAll(requestor.sub);
  }

  async replace(requestor: JwtPayload, dto: MedicalHistoryDto) {
    await this.assertConditionsExist(dto.conditionIds);

    await this.db.transaction(async (tx) => {
      await tx
        .delete(userMedicalConditions)
        .where(eq(userMedicalConditions.userId, requestor.sub));

      await tx
        .insert(userMedicalConditions)
        .values(
          dto.conditionIds.map((conditionId) => ({
            userId: requestor.sub,
            conditionId,
          })),
        );

      await this.upsertMedicalProfile(
        requestor.sub,
        dto.currentlyTakingMedication,
        tx,
      );
    });

    await this.dashboard.invalidate(requestor.sub);
    return this.findAll(requestor.sub);
  }

  async remove(requestor: JwtPayload, dto: MedicalHistoryDto) {
    await this.db
      .delete(userMedicalConditions)
      .where(
        and(
          eq(userMedicalConditions.userId, requestor.sub),
          inArray(userMedicalConditions.conditionId, dto.conditionIds),
        ),
      );

    await this.dashboard.invalidate(requestor.sub);
    return this.findAll(requestor.sub);
  }

  private async upsertMedicalProfile(
    userId: string,
    currentlyTakingMedication: boolean,
    tx: Database | DbTransaction = this.db,
  ) {
    await tx
      .insert(userMedicalProfile)
      .values({ userId, currentlyTakingMedication })
      .onConflictDoUpdate({
        target: userMedicalProfile.userId,
        set: { currentlyTakingMedication, updatedAt: new Date() },
      });
  }

  private async findAll(userId: string) {
    const [conditions, profile] = await Promise.all([
      this.db.query.userMedicalConditions.findMany({
        where: eq(userMedicalConditions.userId, userId),
        with: { condition: true },
      }),
      this.db.query.userMedicalProfile.findFirst({
        where: eq(userMedicalProfile.userId, userId),
      }),
    ]);

    return {
      currentlyTakingMedication: profile?.currentlyTakingMedication ?? false,
      conditions: conditions.map((r) => r.condition),
    };
  }

  async getMedicalProfile(userId: string) {
    const [profile, conditions] = await Promise.all([
      this.db.query.userMedicalProfile.findFirst({
        where: eq(userMedicalProfile.userId, userId),
      }),
      this.db.query.userMedicalConditions.findMany({
        where: eq(userMedicalConditions.userId, userId),
        with: { condition: true },
      }),
    ]);

    return {
      bloodGroup: profile?.bloodGroup ?? null,
      genotype: profile?.genotype ?? null,
      heightCm: profile?.heightCm ?? null,
      weightKg: profile?.weightKg ?? null,
      currentlyTakingMedication: profile?.currentlyTakingMedication ?? false,
      conditions: conditions.map((r) => r.condition),
    };
  }

  async updateMedicalProfile(userId: string, dto: UpdateMedicalProfileDto) {
    const values = {
      ...dto,
      heightCm: dto.heightCm != null ? String(dto.heightCm) : undefined,
      weightKg: dto.weightKg != null ? String(dto.weightKg) : undefined,
    };

    await this.db
      .insert(userMedicalProfile)
      .values({ userId, ...values })
      .onConflictDoUpdate({
        target: userMedicalProfile.userId,
        set: { ...values, updatedAt: new Date() },
      });

    await this.dashboard.invalidate(userId);
    return this.getMedicalProfile(userId);
  }

  async invalidateConditionsCache() {
    await this.cache.del(ACTIVE_CONDITIONS_CACHE_KEY);
    await this.warmConditionsCache();
  }

  private async warmConditionsCache() {
    const rows = await this.db
      .select({ id: medicalConditions.id })
      .from(medicalConditions)
      .where(eq(medicalConditions.isActive, true));

    if (!rows.length) {
      this.logger.warn(
        'Conditions cache warm skipped: no active conditions found. Run the seed.',
      );
      return;
    }

    const activeIds = rows.map((r) => r.id);
    await this.cache.set(ACTIVE_CONDITIONS_CACHE_KEY, activeIds, 0);
    this.logger.log(
      `Conditions cache warmed with ${activeIds.length} active conditions`,
    );
  }

  private async assertConditionsExist(conditionIds: string[]) {
    const activeIds = await this.cache.get<string[]>(
      ACTIVE_CONDITIONS_CACHE_KEY,
    );
    const activeSet = new Set(activeIds ?? []);
    const hasInvalid = conditionIds.some((id) => !activeSet.has(id));
    if (hasInvalid)
      throw new BadRequestException(
        'One or more condition IDs are invalid or inactive',
      );
  }
}
