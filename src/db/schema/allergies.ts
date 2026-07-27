import {
  pgTable,
  uuid,
  timestamp,
  text,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const allergyTypeEnum = pgEnum('allergy_type', [
  'FOOD',
  'DRUG',
  'ENVIRONMENTAL',
  'INSECT',
  'LATEX',
  'OTHER',
]);

export const patientAllergies = pgTable(
  'patient_allergies',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    allergyType: allergyTypeEnum('allergy_type').notNull(),
    cause: text('cause').notNull(),
    management: text('management').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('patient_allergies_user_id_idx').on(t.userId)],
);
