CREATE SEQUENCE IF NOT EXISTS care_id_seq START 1;--> statement-breakpoint
CREATE OR REPLACE FUNCTION generate_care_id() RETURNS text LANGUAGE sql AS $$
  SELECT 'MA-' || lpad(nextval('care_id_seq')::text, 6, '0');
$$;--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('PATIENT', 'PROVIDER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."wallet_network" AS ENUM('MAINNET', 'TESTNET');--> statement-breakpoint
CREATE TYPE "public"."blood_group" AS ENUM('A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE');--> statement-breakpoint
CREATE TYPE "public"."condition_category" AS ENUM('DISEASE', 'ALLERGY', 'CONDITION');--> statement-breakpoint
CREATE TYPE "public"."genotype" AS ENUM('AA', 'AS', 'SS', 'AC', 'SC');--> statement-breakpoint
CREATE TYPE "public"."health_record_type" AS ENUM('BLOOD_TEST', 'PRESCRIPTION', 'SCAN', 'LAB_TEST', 'REPORT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."care_id_status" AS ENUM('PENDING', 'VERIFIED', 'SUSPENDED');--> statement-breakpoint
CREATE TABLE "patient_profiles" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "provider_profiles" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"specialty" text,
	"license_number" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_personal_info" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"middle_name" text,
	"date_of_birth" date NOT NULL,
	"phone" text,
	"address_line1" text NOT NULL,
	"address_line2" text,
	"city" text NOT NULL,
	"region" text NOT NULL,
	"postcode" text NOT NULL,
	"country" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_personal_info_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"password" text NOT NULL,
	"role" "user_role" NOT NULL,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"address" text NOT NULL,
	"network" "wallet_network" DEFAULT 'MAINNET' NOT NULL,
	"label" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallets_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "wallets_address_unique" UNIQUE("address")
);
--> statement-breakpoint
CREATE TABLE "medical_conditions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"category" "condition_category" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_medical_conditions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"condition_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_medical_profile" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"currently_taking_medication" boolean DEFAULT false NOT NULL,
	"blood_group" "blood_group",
	"genotype" "genotype",
	"height_cm" numeric(5, 2),
	"weight_kg" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_medical_profile_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "health_records" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"record_type" "health_record_type" NOT NULL,
	"lab_report_type" text,
	"description" text,
	"s3_key" text NOT NULL,
	"file_url" text NOT NULL,
	"file_url_expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_care_ids" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"care_id" text DEFAULT generate_care_id() NOT NULL,
	"status" "care_id_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_care_ids_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "patient_care_ids_care_id_unique" UNIQUE("care_id")
);
--> statement-breakpoint
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_profiles" ADD CONSTRAINT "provider_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_personal_info" ADD CONSTRAINT "user_personal_info_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_medical_conditions" ADD CONSTRAINT "user_medical_conditions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_medical_conditions" ADD CONSTRAINT "user_medical_conditions_condition_id_medical_conditions_id_fk" FOREIGN KEY ("condition_id") REFERENCES "public"."medical_conditions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_medical_profile" ADD CONSTRAINT "user_medical_profile_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_care_ids" ADD CONSTRAINT "patient_care_ids_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "patient_profiles_user_id_idx" ON "patient_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "provider_profiles_user_id_idx" ON "provider_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_hash_idx" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_revoked_idx" ON "refresh_tokens" USING btree ("user_id","revoked_at");--> statement-breakpoint
CREATE INDEX "refresh_tokens_expires_idx" ON "refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "user_personal_info_user_id_idx" ON "user_personal_info" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "wallets_user_id_idx" ON "wallets" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "medical_conditions_name_idx" ON "medical_conditions" USING btree ("name");--> statement-breakpoint
CREATE INDEX "medical_conditions_category_idx" ON "medical_conditions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "medical_conditions_active_idx" ON "medical_conditions" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "user_medical_conditions_user_condition_idx" ON "user_medical_conditions" USING btree ("user_id","condition_id");--> statement-breakpoint
CREATE INDEX "user_medical_conditions_user_id_idx" ON "user_medical_conditions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "health_records_user_id_idx" ON "health_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "health_records_record_type_idx" ON "health_records" USING btree ("record_type");--> statement-breakpoint
CREATE INDEX "health_records_created_at_idx" ON "health_records" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "patient_care_ids_care_id_idx" ON "patient_care_ids" USING btree ("care_id");