import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  SQL,
} from 'drizzle-orm';
import { randomBytes, createHash } from 'crypto';
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import {
  activityLogs,
  notifications,
  providerInvitations,
  providerProfiles,
  providerRecordRequests,
  users,
  wallets,
} from '../db/schema';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { buildMeta, SortOrder } from '../common/dto/pagination.dto';
import type { CreateInviteDto } from './dto/create-invite.dto';
import type { AdminListUsersDto } from './dto/list-users.dto';
import type { AdminListActivityLogsDto } from './dto/list-activity-logs.dto';
import type { AdminListAccessRequestsDto } from './dto/list-access-requests.dto';
import type { BroadcastNotificationDto } from './dto/broadcast-notification.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
  ) {}

  async createProviderInvite(dto: CreateInviteDto, adminId: string) {
    const existing = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email.toLowerCase()),
    });
    if (existing)
      throw new ConflictException('A user with this email already exists');

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.db.insert(providerInvitations).values({
      tokenHash,
      email: dto.email.toLowerCase(),
      name: dto.name,
      expiresAt,
      createdById: adminId,
    });

    const activationLink = `https://medarchive.africa/auth/activate?token=${rawToken}&name=${encodeURIComponent(dto.name)}&email=${encodeURIComponent(dto.email.toLowerCase())}`;

    this.mail
      .sendProviderInvitation(dto.email.toLowerCase(), dto.name, activationLink)
      .catch((err: unknown) => {
        this.logger.error(
          `Failed to send provider invitation email to ${dto.email}: ${String(err)}`,
        );
      });

    this.logger.log(
      `Provider invite created email=${dto.email} adminId=${adminId}`,
    );

    return { email: dto.email.toLowerCase(), name: dto.name, expiresAt };
  }

  async listInvites(page: number, take: number) {
    const offset = (page - 1) * take;
    const [rows, [{ total }]] = await Promise.all([
      this.db.query.providerInvitations.findMany({
        orderBy: [desc(providerInvitations.createdAt)],
        limit: take,
        offset,
      }),
      this.db.select({ total: count() }).from(providerInvitations),
    ]);

    const emails = rows.map((r) => r.email);
    const providerData =
      emails.length > 0
        ? await this.db
            .select({
              email: users.email,
              userId: users.id,
              verifiedAt: providerProfiles.verifiedAt,
            })
            .from(users)
            .leftJoin(providerProfiles, eq(providerProfiles.userId, users.id))
            .where(
              and(eq(users.role, 'PROVIDER'), inArray(users.email, emails)),
            )
            .then((res) => Object.fromEntries(res.map((r) => [r.email, r])))
        : {};

    const now = new Date();
    const data = rows.map(({ tokenHash: _, ...r }) => {
      const provider = providerData[r.email];
      return {
        ...r,
        inviteStatus: r.usedAt
          ? 'USED'
          : r.expiresAt < now
            ? 'EXPIRED'
            : 'PENDING',
        provider: provider
          ? { userId: provider.userId, verified: provider.verifiedAt !== null }
          : null,
      };
    });

    return { data, meta: buildMeta(Number(total), page, take, data.length) };
  }

  async revokeInvite(id: string) {
    const invite = await this.db.query.providerInvitations.findFirst({
      where: eq(providerInvitations.id, id),
    });
    if (!invite) throw new NotFoundException('Invitation not found');

    await this.db
      .delete(providerInvitations)
      .where(eq(providerInvitations.id, id));
  }

  async listUsers(dto: AdminListUsersDto) {
    const offset = (dto.page - 1) * dto.take;
    const conditions: SQL[] = [];
    if (dto.role) conditions.push(eq(users.role, dto.role));
    if (dto.search) conditions.push(ilike(users.email, `%${dto.search}%`));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const orderCol = users.createdAt;
    const orderExpr =
      dto.sortOrder === SortOrder.ASC ? asc(orderCol) : desc(orderCol);

    const [rows, [{ total }]] = await Promise.all([
      this.db.query.users.findMany({
        where,
        columns: { password: false },
        limit: dto.take,
        offset,
        orderBy: orderExpr,
      }),
      this.db.select({ total: count() }).from(users).where(where),
    ]);

    return {
      data: rows,
      meta: buildMeta(Number(total), dto.page, dto.take, rows.length),
    };
  }

  async getUser(id: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, id),
      columns: { password: false },
    });
    if (!user) throw new NotFoundException('User not found');

    const wallet = await this.db.query.wallets.findFirst({
      where: eq(wallets.userId, id),
      columns: {
        id: true,
        address: true,
        network: true,
        label: true,
        verifiedAt: true,
      },
    });

    return { ...user, wallet: wallet ?? null };
  }

  async deleteUser(id: string, requestorId: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, id),
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'ADMIN')
      throw new ForbiddenException('Cannot delete an admin account');
    if (id === requestorId)
      throw new ForbiddenException('Cannot delete your own account');
    await this.db.delete(users).where(eq(users.id, id));
  }

  async verifyProvider(id: string) {
    const profile = await this.db.query.providerProfiles.findFirst({
      where: eq(providerProfiles.userId, id),
    });
    if (!profile) throw new NotFoundException('Provider profile not found');
    if (profile.verifiedAt)
      throw new BadRequestException('Provider already verified');

    await this.db
      .update(providerProfiles)
      .set({ verifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(providerProfiles.userId, id));

    this.notifications.push(
      id,
      'PROVIDER_VERIFIED',
      'Account Verified',
      'Your provider account has been verified. You can now access all provider features.',
    );

    return null;
  }

  async listWallets(page: number, take: number) {
    const offset = (page - 1) * take;
    const [rows, [{ total }]] = await Promise.all([
      this.db.query.wallets.findMany({
        columns: { encryptedSecret: false },
        limit: take,
        offset,
        orderBy: [desc(wallets.createdAt)],
      }),
      this.db.select({ total: count() }).from(wallets),
    ]);
    return {
      data: rows,
      meta: buildMeta(Number(total), page, take, rows.length),
    };
  }

  async listAccessRequests(dto: AdminListAccessRequestsDto) {
    const offset = (dto.page - 1) * dto.take;
    const conditions: SQL[] = [];
    if (dto.status)
      conditions.push(eq(providerRecordRequests.status, dto.status));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const orderExpr =
      dto.sortOrder === SortOrder.ASC
        ? asc(providerRecordRequests.createdAt)
        : desc(providerRecordRequests.createdAt);

    const [rows, [{ total }]] = await Promise.all([
      this.db.query.providerRecordRequests.findMany({
        where,
        limit: dto.take,
        offset,
        orderBy: orderExpr,
        with: {
          patient: { columns: { id: true, fullName: true, email: true } },
          provider: { columns: { id: true, fullName: true, email: true } },
        },
      }),
      this.db
        .select({ total: count() })
        .from(providerRecordRequests)
        .where(where),
    ]);

    return {
      data: rows,
      meta: buildMeta(Number(total), dto.page, dto.take, rows.length),
    };
  }

  async listActivityLogs(dto: AdminListActivityLogsDto) {
    const offset = (dto.page - 1) * dto.take;
    const conditions: SQL[] = [];
    if (dto.userId) conditions.push(eq(activityLogs.userId, dto.userId));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const orderExpr =
      dto.sortOrder === SortOrder.ASC
        ? asc(activityLogs.createdAt)
        : desc(activityLogs.createdAt);

    const [rows, [{ total }]] = await Promise.all([
      this.db.query.activityLogs.findMany({
        where,
        limit: dto.take,
        offset,
        orderBy: orderExpr,
      }),
      this.db.select({ total: count() }).from(activityLogs).where(where),
    ]);

    return {
      data: rows,
      meta: buildMeta(Number(total), dto.page, dto.take, rows.length),
    };
  }

  async getStats() {
    const [
      [{ patients }],
      [{ providers }],
      [{ admins }],
      [{ totalWallets }],
      [{ pendingVerifications }],
      [{ pendingRequests }],
    ] = await Promise.all([
      this.db
        .select({ patients: count() })
        .from(users)
        .where(eq(users.role, 'PATIENT')),
      this.db
        .select({ providers: count() })
        .from(users)
        .where(eq(users.role, 'PROVIDER')),
      this.db
        .select({ admins: count() })
        .from(users)
        .where(eq(users.role, 'ADMIN')),
      this.db.select({ totalWallets: count() }).from(wallets),
      this.db
        .select({ pendingVerifications: count() })
        .from(providerProfiles)
        .where(isNull(providerProfiles.verifiedAt)),
      this.db
        .select({ pendingRequests: count() })
        .from(providerRecordRequests)
        .where(eq(providerRecordRequests.status, 'PENDING')),
    ]);

    return {
      users: {
        patients: Number(patients),
        providers: Number(providers),
        admins: Number(admins),
      },
      wallets: Number(totalWallets),
      pendingProviderVerifications: Number(pendingVerifications),
      pendingAccessRequests: Number(pendingRequests),
    };
  }

  async broadcastNotification(dto: BroadcastNotificationDto) {
    const conditions: SQL[] = [];
    if (dto.role) conditions.push(eq(users.role, dto.role));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const targets = await this.db.query.users.findMany({
      where,
      columns: { id: true },
      limit: 10_000,
    });

    const values = targets.map((u) => ({
      userId: u.id,
      type: 'BROADCAST' as const,
      title: dto.title,
      body: dto.body,
      data: null,
    }));

    if (values.length === 0) return { sent: 0 };

    const BATCH = 500;
    for (let i = 0; i < values.length; i += BATCH) {
      await this.db.insert(notifications).values(values.slice(i, i + BATCH));
    }

    return { sent: values.length };
  }
}
