import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';
import { zkProofStatusEnum } from './zk-proofs';

export const clinicalProofTypeEnum = pgEnum('clinical_proof_type', [
  'DIAGNOSIS_CATEGORY',
  'ALLERGY_CONFIRMATION',
  'PRIOR_PRESCRIPTION_PATTERN',
  'BLOOD_GROUP',
  'GENOTYPE',
  'CHRONIC_CONDITION',
]);

export const clinicalProofs = pgTable(
  'clinical_proofs',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    proofType: clinicalProofTypeEnum('proof_type').notNull(),
    claimData: jsonb('claim_data').notNull(),
    status: zkProofStatusEnum('status').notNull().default('PENDING'),
    commitment: text('commitment'),
    proof: jsonb('proof'),
    publicSignals: jsonb('public_signals'),
    error: text('error'),
    generatedAt: timestamp('generated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('clinical_proofs_user_id_idx').on(t.userId),
    index('clinical_proofs_proof_type_idx').on(t.proofType),
  ],
);

export const clinicalProofsRelations = relations(clinicalProofs, ({ one }) => ({
  user: one(users, {
    fields: [clinicalProofs.userId],
    references: [users.id],
  }),
}));
