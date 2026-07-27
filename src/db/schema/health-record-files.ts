import { pgTable, text, uuid, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { healthRecords } from './health-records';

export const healthRecordFiles = pgTable(
  'health_record_files',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    healthRecordId: uuid('health_record_id')
      .notNull()
      .references(() => healthRecords.id, { onDelete: 'cascade' }),
    fileName: text('file_name').notNull(),
    fileType: text('file_type').notNull(),
    fileSize: integer('file_size').notNull(),
    s3Key: text('s3_key').notNull(),
    fileUrl: text('file_url').notNull(),
    fileUrlExpiresAt: timestamp('file_url_expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('health_record_files_record_id_idx').on(t.healthRecordId),
  ],
);

export const healthRecordFilesRelations = relations(healthRecordFiles, ({ one }) => ({
  record: one(healthRecords, {
    fields: [healthRecordFiles.healthRecordId],
    references: [healthRecords.id],
  }),
}));
