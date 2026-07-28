import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { randomBytes, createHash } from 'crypto';
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import { providerInvitations, users } from '../db/schema';
import { MailService } from '../mail/mail.service';
import type { CreateInviteDto } from './dto/create-invite.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly mail: MailService,
  ) {}

  async createProviderInvite(dto: CreateInviteDto, adminId: string) {
    const existing = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email.toLowerCase()),
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

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

    const activationLink = `https://app.medarchive.africa/activate?token=${rawToken}&name=${encodeURIComponent(dto.name)}&email=${encodeURIComponent(dto.email.toLowerCase())}`;

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
}
