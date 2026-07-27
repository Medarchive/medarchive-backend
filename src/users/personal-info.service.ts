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

    const [created] = await Promise.all([
      this.db
        .insert(userPersonalInfo)
        .values({ userId: requestor.sub, ...infoDto })
        .returning(),
      gender
        ? this.db
            .update(users)
            .set({ gender, updatedAt: new Date() })
            .where(eq(users.id, requestor.sub))
        : Promise.resolve(),
    ]);

    return { ...created[0], gender: gender ?? null };
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

    const [updated, user] = await Promise.all([
      this.db
        .update(userPersonalInfo)
        .set({ ...infoDto, updatedAt: new Date() })
        .where(eq(userPersonalInfo.userId, requestor.sub))
        .returning()
        .then(([r]) => r),
      gender
        ? this.db
            .update(users)
            .set({ gender, updatedAt: new Date() })
            .where(eq(users.id, requestor.sub))
            .returning({ gender: users.gender })
            .then(([r]) => r)
        : this.db.query.users.findFirst({
            where: eq(users.id, requestor.sub),
            columns: { gender: true },
          }),
    ]);

    return { ...updated, gender: user?.gender ?? null };
  }
}
