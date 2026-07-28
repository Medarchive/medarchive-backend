import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';

export const recordRequestStatusEnum = pgEnum('record_request_status', [
  'PENDING',
  'APPROVED',
  'DECLINED',
]);

export const providerRecordRequests = pgTable(
  'provider_record_requests',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    requestType: text('request_type').notNull(),
    note: text('note'),
    status: recordRequestStatusEnum('status').notNull().default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('provider_record_requests_patient_id_idx').on(t.patientId),
    index('provider_record_requests_provider_id_idx').on(t.providerId),
  ],
);

export const providerRecordRequestsRelations = relations(
  providerRecordRequests,
  ({ one }) => ({
    patient: one(users, {
      fields: [providerRecordRequests.patientId],
      references: [users.id],
      relationName: 'patientRequests',
    }),
    provider: one(users, {
      fields: [providerRecordRequests.providerId],
      references: [users.id],
      relationName: 'providerRequests',
    }),
  }),
);
