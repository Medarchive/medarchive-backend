import { pgTable, text, uuid, timestamp, date, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const patientMedications = pgTable(
  'patient_medications',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    dosage: text('dosage').notNull(),
    frequency: text('frequency').notNull(),
    prescribedBy: text('prescribed_by'),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('patient_medications_user_id_idx').on(t.userId)],
);
