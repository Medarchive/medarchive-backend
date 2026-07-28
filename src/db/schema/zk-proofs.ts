import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { healthRecords } from './health-records';

export const zkProofStatusEnum = pgEnum('zk_proof_status', [
  'PENDING',
  'GENERATED',
  'FAILED',
]);

export const healthRecordProofs = pgTable('health_record_proofs', {
  id: uuid('id')
    .primaryKey()
    .default(sql`uuidv7()`),
  healthRecordId: uuid('health_record_id')
    .notNull()
    .unique()
    .references(() => healthRecords.id, { onDelete: 'cascade' }),
  status: zkProofStatusEnum('status').notNull().default('PENDING'),
  commitment: text('commitment'),
  proof: jsonb('proof'),
  publicSignals: jsonb('public_signals'),
  error: text('error'),
  anchorTxHash: text('anchor_tx_hash'),
  verificationTxHash: text('verification_tx_hash'),
  generatedAt: timestamp('generated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const healthRecordProofsRelations = relations(
  healthRecordProofs,
  ({ one }) => ({
    record: one(healthRecords, {
      fields: [healthRecordProofs.healthRecordId],
      references: [healthRecords.id],
    }),
  }),
);
