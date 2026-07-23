import {
  pgTable,
  text,
  uuid,
  timestamp,
  date,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const userRoleEnum = pgEnum('user_role', ['PATIENT', 'PROVIDER', 'ADMIN']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    fullName: text('full_name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    password: text('password').notNull(),
    role: userRoleEnum('role').notNull(),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_email_idx').on(t.email)],
);

export const userPersonalInfo = pgTable(
  'user_personal_info',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    middleName: text('middle_name'),
    dateOfBirth: date('date_of_birth').notNull(),
    phone: text('phone'),
    addressLine1: text('address_line1').notNull(),
    addressLine2: text('address_line2'),
    city: text('city').notNull(),
    region: text('region').notNull(),
    postcode: text('postcode').notNull(),
    country: text('country').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('user_personal_info_user_id_idx').on(t.userId)],
);

export const patientProfiles = pgTable(
  'patient_profiles',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('patient_profiles_user_id_idx').on(t.userId)],
);

export const providerProfiles = pgTable(
  'provider_profiles',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    specialty: text('specialty'),
    licenseNumber: text('license_number'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('provider_profiles_user_id_idx').on(t.userId)],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('refresh_tokens_hash_idx').on(t.tokenHash),
    index('refresh_tokens_user_revoked_idx').on(t.userId, t.revokedAt),
    index('refresh_tokens_expires_idx').on(t.expiresAt),
  ],
);
