import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import { userPersonalInfo, users } from '../db/schema';
import type { PersonalInfoDto } from './dto/personal-info.dto';
import type { JwtPayload } from '../auth/auth.types';

@Injectable()
export class PersonalInfoService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async findOne(requestor: JwtPayload) {
    const [info, user] = await Promise.all([
      this.db.query.userPersonalInfo.findFirst({
        where: eq(userPersonalInfo.userId, requestor.sub),
      }),
      this.db.query.users.findFirst({
        where: eq(users.id, requestor.sub),
        columns: { gender: true },
      }),
    ]);

    if (!info) return null;
    return { ...info, gender: user?.gender ?? null };
  }

  async create(requestor: JwtPayload, dto: PersonalInfoDto) {
    const existing = await this.db.query.userPersonalInfo.findFirst({
      where: eq(userPersonalInfo.userId, requestor.sub),
    });

    if (existing)
      throw new ConflictException(
        'Personal information already submitted. Use PATCH /personal-info to update.',
      );

    const { gender, ...infoDto } = dto;

    const [created] = await this.db.transaction(async (tx) => {
      const result = await tx
        .insert(userPersonalInfo)
        .values({ userId: requestor.sub, ...infoDto })
        .returning();

      if (gender) {
        await tx
          .update(users)
          .set({ gender, updatedAt: new Date() })
          .where(eq(users.id, requestor.sub));
      }

      return result;
    });

    return { ...created, gender: gender ?? null };
  }

  async update(requestor: JwtPayload, dto: Partial<PersonalInfoDto>) {
    const existing = await this.db.query.userPersonalInfo.findFirst({
      where: eq(userPersonalInfo.userId, requestor.sub),
    });

    if (!existing)
      throw new NotFoundException(
        'Personal information not found. Use POST /personal-info to create it first.',
      );

    const { gender, ...infoDto } = dto;

    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(userPersonalInfo)
        .set({ ...infoDto, updatedAt: new Date() })
        .where(eq(userPersonalInfo.userId, requestor.sub))
        .returning();

      let resolvedGender: string | null = null;

      if (gender) {
        const [u] = await tx
          .update(users)
          .set({ gender, updatedAt: new Date() })
          .where(eq(users.id, requestor.sub))
          .returning({ gender: users.gender });
        resolvedGender = u?.gender ?? null;
      } else {
        const u = await tx.query.users.findFirst({
          where: eq(users.id, requestor.sub),
          columns: { gender: true },
        });
        resolvedGender = u?.gender ?? null;
      }

      return { ...updated, gender: resolvedGender };
    });
  }
}
