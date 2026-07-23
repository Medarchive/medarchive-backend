import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { Database } from '../db/db.module';
import { patientMedications } from '../db/schema';
import { DashboardService } from '../dashboard/dashboard.service';
import type { CreateMedicationDto } from './dto/create-medication.dto';
import type { UpdateMedicationDto } from './dto/update-medication.dto';

@Injectable()
export class MedicationsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly dashboard: DashboardService,
  ) {}

  async create(userId: string, dto: CreateMedicationDto) {
    const [medication] = await this.db
      .insert(patientMedications)
      .values({ userId, ...dto })
      .returning();

    await this.dashboard.invalidate(userId);
    return medication;
  }

  async findAll(userId: string) {
    return this.db.query.patientMedications.findMany({
      where: eq(patientMedications.userId, userId),
      orderBy: [desc(patientMedications.startDate)],
    });
  }

  async update(userId: string, id: string, dto: UpdateMedicationDto) {
    const [updated] = await this.db
      .update(patientMedications)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(patientMedications.id, id), eq(patientMedications.userId, userId)))
      .returning();

    if (!updated) throw new NotFoundException('Medication not found');

    await this.dashboard.invalidate(userId);
    return updated;
  }

  async remove(userId: string, id: string) {
    const [deleted] = await this.db
      .delete(patientMedications)
      .where(and(eq(patientMedications.id, id), eq(patientMedications.userId, userId)))
      .returning();

    if (!deleted) throw new NotFoundException('Medication not found');

    await this.dashboard.invalidate(userId);
  }
}
