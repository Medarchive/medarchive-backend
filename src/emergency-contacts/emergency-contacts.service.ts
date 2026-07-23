import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import { emergencyContacts } from '../db/schema';
import { DashboardService } from '../dashboard/dashboard.service';
import type { CreateEmergencyContactDto } from './dto/create-emergency-contact.dto';
import type { UpdateEmergencyContactDto } from './dto/update-emergency-contact.dto';

@Injectable()
export class EmergencyContactsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly dashboard: DashboardService,
  ) {}

  async create(userId: string, dto: CreateEmergencyContactDto) {
    const [contact] = await this.db
      .insert(emergencyContacts)
      .values({ userId, ...dto })
      .returning();

    await this.dashboard.invalidate(userId);
    return contact;
  }

  async findAll(userId: string) {
    return this.db.query.emergencyContacts.findMany({
      where: eq(emergencyContacts.userId, userId),
      orderBy: emergencyContacts.createdAt,
    });
  }

  async update(userId: string, id: string, dto: UpdateEmergencyContactDto) {
    const [updated] = await this.db
      .update(emergencyContacts)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(emergencyContacts.id, id), eq(emergencyContacts.userId, userId)))
      .returning();

    if (!updated) throw new NotFoundException('Contact not found');

    await this.dashboard.invalidate(userId);
    return updated;
  }

  async remove(userId: string, id: string) {
    const [deleted] = await this.db
      .delete(emergencyContacts)
      .where(and(eq(emergencyContacts.id, id), eq(emergencyContacts.userId, userId)))
      .returning();

    if (!deleted) throw new NotFoundException('Contact not found');

    await this.dashboard.invalidate(userId);
  }
}
