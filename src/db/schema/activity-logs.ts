import {
  pgTable,
  uuid,
  timestamp,
  text,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.js';

export const activityActionEnum = pgEnum('activity_action', [
  'LOGIN',
  'HEALTH_RECORD_UPLOADED',
  'HEALTH_RECORD_DELETED',
  'EMERGENCY_CONTACT_ADDED',
  'EMERGENCY_CONTACT_UPDATED',
  'EMERGENCY_CONTACT_DELETED',
  'MEDICATION_ADDED',
  'MEDICATION_UPDATED',
  'MEDICATION_DELETED',
  'CARE_ID_GENERATED',
  'SHARE_LINK_GENERATED',
  'WALLET_LINKED',
  'WALLET_VERIFIED',
  'WALLET_REMOVED',
  'MEDICAL_PROFILE_UPDATED',
  'CONDITIONS_UPDATED',
]);

export const activityLogs = pgTable(
  'activity_logs',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    action: activityActionEnum('action').notNull(),
    metadata: jsonb('metadata'),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('activity_logs_user_id_idx').on(t.userId),
    index('activity_logs_created_at_idx').on(t.createdAt),
  ],
);
