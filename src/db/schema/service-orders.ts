import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';

export const serviceOrderStatusEnum = pgEnum('service_order_status', [
  'PENDING',
  'PAID',
]);

export const serviceOrders = pgTable(
  'service_orders',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    reference: text('reference').notNull(),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerWalletAddress: text('provider_wallet_address').notNull(),
    description: text('description').notNull(),
    amount: numeric('amount', { precision: 18, scale: 7 }).notNull(),
    assetCode: text('asset_code').notNull().default('USDC'),
    status: serviceOrderStatusEnum('status').notNull().default('PENDING'),
    txHash: text('tx_hash'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('service_orders_reference_idx').on(t.reference),
    uniqueIndex('service_orders_tx_hash_idx').on(t.txHash),
    index('service_orders_patient_id_idx').on(t.patientId),
    index('service_orders_provider_id_idx').on(t.providerId),
  ],
);

export const serviceOrdersRelations = relations(serviceOrders, ({ one }) => ({
  patient: one(users, {
    fields: [serviceOrders.patientId],
    references: [users.id],
    relationName: 'patientServiceOrders',
  }),
  provider: one(users, {
    fields: [serviceOrders.providerId],
    references: [users.id],
    relationName: 'providerServiceOrders',
  }),
}));
