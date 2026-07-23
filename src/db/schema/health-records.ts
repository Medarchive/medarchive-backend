import { pgTable, text, uuid, timestamp, pgEnum, integer, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const healthRecordTypeEnum = pgEnum('health_record_type', [
  'BLOOD_TEST',
  'PRESCRIPTION',
  'SCAN',
  'LAB_TEST',
  'REPORT',
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
    fileName: text('file_name').notNull(),
    fileType: text('file_type').notNull(),
    fileSize: integer('file_size').notNull(),
    recordType: healthRecordTypeEnum('record_type').notNull(),
    labReportType: text('lab_report_type'),
    referredBy: text('referred_by'),
    description: text('description'),
    s3Key: text('s3_key').notNull(),
    fileUrl: text('file_url').notNull(),
    fileUrlExpiresAt: timestamp('file_url_expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('health_records_user_id_idx').on(t.userId),
    index('health_records_record_type_idx').on(t.recordType),
    index('health_records_created_at_idx').on(t.createdAt),
  ],
);
