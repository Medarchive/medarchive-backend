import {
  pgTable,
  text,
  uuid,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const walletNetworkEnum = pgEnum('wallet_network', [
  'MAINNET',
  'TESTNET',
]);

export const wallets = pgTable(
  'wallets',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    address: text('address').notNull().unique(),
    network: walletNetworkEnum('network').notNull().default('MAINNET'),
    label: text('label'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('wallets_user_id_idx').on(t.userId)],
);
