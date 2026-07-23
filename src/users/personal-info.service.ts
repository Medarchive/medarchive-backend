import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import { userPersonalInfo } from '../db/schema';
import type { PersonalInfoDto } from './dto/personal-info.dto';
import type { JwtPayload } from '../auth/auth.types';

@Injectable()
export class PersonalInfoService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async create(requestor: JwtPayload, dto: PersonalInfoDto) {
    const existing = await this.db.query.userPersonalInfo.findFirst({
      where: eq(userPersonalInfo.userId, requestor.sub),
    });

    if (existing)
      throw new ConflictException(
        'Personal information already submitted. Use PUT /personal-info to update.',
      );

    const [created] = await this.db
      .insert(userPersonalInfo)
      .values({ userId: requestor.sub, ...dto })
      .returning();

    return created;
  }

  async update(requestor: JwtPayload, dto: Partial<PersonalInfoDto>) {
    const existing = await this.db.query.userPersonalInfo.findFirst({
      where: eq(userPersonalInfo.userId, requestor.sub),
    });

    if (!existing)
      throw new NotFoundException(
        'Personal information not found. Use POST /personal-info to create it first.',
      );

    const [updated] = await this.db
      .update(userPersonalInfo)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(userPersonalInfo.userId, requestor.sub))
      .returning();

    return updated;
  }
}
