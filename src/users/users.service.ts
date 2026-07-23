import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, ilike, count, and, asc, desc, SQL } from 'drizzle-orm';
import * as argon2 from 'argon2';

const ARGON2_OPTIONS: Parameters<typeof argon2.hash>[1] = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import { users, wallets, userPersonalInfo, patientProfiles, providerProfiles } from '../db/schema';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { ListUsersDto } from './dto/list-users.dto';
import { SortOrder, buildMeta } from '../common/dto/pagination.dto';
import type { JwtPayload } from '../auth/auth.types';

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async getMe(requestor: JwtPayload) {
    return this.findFullProfile(requestor.sub);
  }

  async updateMe(requestor: JwtPayload, dto: UpdateProfileDto) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, requestor.sub),
    });

    if (!user) throw new NotFoundException('User not found');

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('currentPassword is required to set a new password');
      }

      const match = await argon2.verify(user.password, dto.currentPassword);
      if (!match) throw new ForbiddenException('Current password is incorrect');
    }

    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const taken = await this.db.query.users.findFirst({
        where: eq(users.email, dto.email.toLowerCase()),
      });
      if (taken) throw new ConflictException('Email already in use');
    }

    const userUpdates: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (dto.fullName) userUpdates.fullName = dto.fullName;
    if (dto.email) userUpdates.email = dto.email.toLowerCase();
    if (dto.phone) userUpdates.phone = dto.phone;
    if (dto.newPassword) userUpdates.password = await argon2.hash(dto.newPassword, ARGON2_OPTIONS);

    if (Object.keys(userUpdates).length > 1) {
      await this.db.update(users).set(userUpdates).where(eq(users.id, user.id));
    }

    if ((dto.specialty || dto.licenseNumber) && user.role === 'PROVIDER') {
      const profileUpdates: Partial<typeof providerProfiles.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (dto.specialty) profileUpdates.specialty = dto.specialty;
      if (dto.licenseNumber) profileUpdates.licenseNumber = dto.licenseNumber;

      await this.db
        .update(providerProfiles)
        .set(profileUpdates)
        .where(eq(providerProfiles.userId, user.id));
    }

    return this.findFullProfile(user.id);
  }

  async findById(id: string) {
    const profile = await this.findFullProfile(id);
    if (!profile) throw new NotFoundException('User not found');
    return profile;
  }

  async listUsers(dto: ListUsersDto) {
    const offset = (dto.page - 1) * dto.take;

    const conditions: SQL[] = [];
    if (dto.role) conditions.push(eq(users.role, dto.role));
    if (dto.search) conditions.push(ilike(users.email, `%${dto.search}%`));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const sortCol = users[dto.sortBy];
    const orderExpr = dto.sortOrder === SortOrder.ASC ? asc(sortCol) : desc(sortCol);

    const [rows, [{ total }]] = await Promise.all([
      this.db.query.users.findMany({
        where: whereClause,
        limit: dto.take,
        offset,
        orderBy: orderExpr,
        columns: { password: false },
      }),
      this.db.select({ total: count() }).from(users).where(whereClause),
    ]);

    return {
      data: rows,
      meta: buildMeta(Number(total), dto.page, dto.take, rows.length),
    };
  }

  async verifyProvider(id: string) {
    const profile = await this.db.query.providerProfiles.findFirst({
      where: eq(providerProfiles.userId, id),
    });

    if (!profile) throw new NotFoundException('Provider profile not found');
    if (profile.verifiedAt) throw new BadRequestException('Provider already verified');

    await this.db
      .update(providerProfiles)
      .set({ verifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(providerProfiles.userId, id));

    return null;
  }

  private async findFullProfile(userId: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { password: false },
    });

    if (!user) return null;

    const [personalInfo, wallet] = await Promise.all([
      this.db.query.userPersonalInfo.findFirst({
        where: eq(userPersonalInfo.userId, userId),
      }),
      this.db.query.wallets.findFirst({
        where: eq(wallets.userId, userId),
        columns: { id: true, address: true, network: true, label: true, verifiedAt: true },
      }),
    ]);

    if (user.role === 'PATIENT') {
      const profile = await this.db.query.patientProfiles.findFirst({
        where: eq(patientProfiles.userId, userId),
      });
      return { ...user, personalInfo: personalInfo ?? null, wallet: wallet ?? null, profile };
    }

    if (user.role === 'PROVIDER') {
      const profile = await this.db.query.providerProfiles.findFirst({
        where: eq(providerProfiles.userId, userId),
      });
      return { ...user, personalInfo: personalInfo ?? null, wallet: wallet ?? null, profile };
    }

    return { ...user, personalInfo: personalInfo ?? null, wallet: wallet ?? null, profile: null };
  }
}
