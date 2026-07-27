import { pgTable, text, uuid, timestamp, pgEnum, index, date } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';
import { healthRecordFiles } from './health-record-files';

export const healthRecordTypeEnum = pgEnum('health_record_type', [
  'BLOOD_TEST',
  'PRESCRIPTION',
  'SCAN',
  'LAB_TEST',
  'MEDICATION',
  'REPORT',
  'ALLERGY',
  'OTHER',
]);

export const allergyTypeEnum = pgEnum('allergy_type', [
  'FOOD',
  'DRUG',
  'ENVIRONMENTAL',
  'INSECT',
  'LATEX',
  'OTHER',
]);

export const healthRecords = pgTable(
  'health_records',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    recordType: healthRecordTypeEnum('record_type').notNull(),
    // LAB_TEST fields
    testName: text('test_name'),
    referredBy: text('referred_by'),
    // PRESCRIPTION fields
    drugClass: text('drug_class'),
    prescribedBy: text('prescribed_by'),
    // MEDICATION fields
    drug: text('drug'),
    dosage: text('dosage'),
    frequency: text('frequency'),
    endDate: date('end_date'),
    // ALLERGY fields
    allergyType: allergyTypeEnum('allergy_type'),
    cause: text('cause'),
    management: text('management'),
    // shared optional fields
    recordDate: date('record_date'),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('health_records_user_id_idx').on(t.userId),
    index('health_records_record_type_idx').on(t.recordType),
    index('health_records_created_at_idx').on(t.createdAt),
  ],
);

export const healthRecordsRelations = relations(healthRecords, ({ many }) => ({
  files: many(healthRecordFiles),
}));
