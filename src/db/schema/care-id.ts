import { pgTable, text, uuid, timestamp, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const careIdStatusEnum = pgEnum('care_id_status', [
  'PENDING',
  'VERIFIED',
  'SUSPENDED',
]);

export const patientCareIds = pgTable(
  'patient_care_ids',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    careId: text('care_id').notNull().unique().default(sql`generate_care_id()`),
    status: careIdStatusEnum('status').notNull().default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('patient_care_ids_care_id_idx').on(t.careId)],
);
