CREATE TYPE "public"."gender" AS ENUM('MALE', 'FEMALE');--> statement-breakpoint
CREATE TYPE "public"."allergy_type" AS ENUM('FOOD', 'DRUG', 'ENVIRONMENTAL', 'INSECT', 'LATEX', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."activity_action" AS ENUM('LOGIN', 'HEALTH_RECORD_UPLOADED', 'HEALTH_RECORD_DELETED', 'EMERGENCY_CONTACT_ADDED', 'EMERGENCY_CONTACT_UPDATED', 'EMERGENCY_CONTACT_DELETED', 'MEDICATION_ADDED', 'MEDICATION_UPDATED', 'MEDICATION_DELETED', 'CARE_ID_GENERATED', 'SHARE_LINK_GENERATED', 'WALLET_LINKED', 'WALLET_VERIFIED', 'WALLET_REMOVED', 'MEDICAL_PROFILE_UPDATED', 'CONDITIONS_UPDATED');--> statement-breakpoint
ALTER TYPE "public"."health_record_type" ADD VALUE 'MEDICATION' BEFORE 'REPORT';--> statement-breakpoint
ALTER TYPE "public"."health_record_type" ADD VALUE 'ALLERGY' BEFORE 'OTHER';--> statement-breakpoint
CREATE TABLE "health_record_files" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"health_record_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"s3_key" text NOT NULL,
	"file_url" text NOT NULL,
	"file_url_expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" "activity_action" NOT NULL,
	"metadata" jsonb,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "patient_medications" CASCADE;--> statement-breakpoint
ALTER TABLE "health_records" RENAME COLUMN "lab_report_type" TO "test_name";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "gender" "gender";--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "drug_class" text;--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "prescribed_by" text;--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "drug" text;--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "dosage" text;--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "frequency" text;--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "end_date" date;--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "allergy_type" "allergy_type";--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "cause" text;--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "management" text;--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "record_date" date;--> statement-breakpoint
ALTER TABLE "health_record_files" ADD CONSTRAINT "health_record_files_health_record_id_health_records_id_fk" FOREIGN KEY ("health_record_id") REFERENCES "public"."health_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "health_record_files_record_id_idx" ON "health_record_files" USING btree ("health_record_id");--> statement-breakpoint
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "health_records" DROP COLUMN "file_name";--> statement-breakpoint
ALTER TABLE "health_records" DROP COLUMN "file_type";--> statement-breakpoint
ALTER TABLE "health_records" DROP COLUMN "file_size";--> statement-breakpoint
ALTER TABLE "health_records" DROP COLUMN "s3_key";--> statement-breakpoint
ALTER TABLE "health_records" DROP COLUMN "file_url";--> statement-breakpoint
ALTER TABLE "health_records" DROP COLUMN "file_url_expires_at";