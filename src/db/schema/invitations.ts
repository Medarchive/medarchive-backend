import {
  pgTable,
  text,
  uuid,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const providerInvitations = pgTable(
  'provider_invitations',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    tokenHash: text('token_hash').notNull(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdById: uuid('created_by_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('provider_invitations_token_hash_idx').on(t.tokenHash),
    index('provider_invitations_email_idx').on(t.email),
  ],
);
