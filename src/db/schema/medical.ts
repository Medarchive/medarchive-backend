import { pgTable, text, uuid, timestamp, pgEnum, integer, boolean, numeric, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';

export const conditionCategoryEnum = pgEnum('condition_category', [
  'DISEASE',
  'ALLERGY',
  'CONDITION',
]);

export const medicalConditions = pgTable(
  'medical_conditions',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    name: text('name').notNull(),
    category: conditionCategoryEnum('category').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('medical_conditions_name_idx').on(t.name),
    index('medical_conditions_category_idx').on(t.category),
    index('medical_conditions_active_idx').on(t.isActive),
  ],
);

export const userMedicalConditions = pgTable(
  'user_medical_conditions',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    conditionId: uuid('condition_id')
      .notNull()
      .references(() => medicalConditions.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('user_medical_conditions_user_condition_idx').on(t.userId, t.conditionId),
    index('user_medical_conditions_user_id_idx').on(t.userId),
  ],
);

export const bloodGroupEnum = pgEnum('blood_group', [
  'A_POSITIVE',
  'A_NEGATIVE',
  'B_POSITIVE',
  'B_NEGATIVE',
  'AB_POSITIVE',
  'AB_NEGATIVE',
  'O_POSITIVE',
  'O_NEGATIVE',
]);

export const genotypeEnum = pgEnum('genotype', ['AA', 'AS', 'SS', 'AC', 'SC']);

export const userMedicalProfile = pgTable('user_medical_profile', {
  id: uuid('id').primaryKey().default(sql`uuidv7()`),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  currentlyTakingMedication: boolean('currently_taking_medication').notNull().default(false),
  bloodGroup: bloodGroupEnum('blood_group'),
  genotype: genotypeEnum('genotype'),
  heightCm: numeric('height_cm', { precision: 5, scale: 2 }),
  weightKg: numeric('weight_kg', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userMedicalConditionsRelations = relations(userMedicalConditions, ({ one }) => ({
  condition: one(medicalConditions, {
    fields: [userMedicalConditions.conditionId],
    references: [medicalConditions.id],
  }),
}));
