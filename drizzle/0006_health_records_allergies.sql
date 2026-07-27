-- extend health_record_type enum
ALTER TYPE "public"."health_record_type" ADD VALUE IF NOT EXISTS 'MEDICATION';

-- rename lab_report_type -> test_name, add new columns
ALTER TABLE "health_records" RENAME COLUMN "lab_report_type" TO "test_name";
ALTER TABLE "health_records"
  ADD COLUMN "drug_class"    text,
  ADD COLUMN "prescribed_by" text,
  ADD COLUMN "drug"          text,
  ADD COLUMN "dosage"        text,
  ADD COLUMN "record_date"   date;

-- allergies
CREATE TYPE "public"."allergy_type" AS ENUM('FOOD', 'DRUG', 'ENVIRONMENTAL', 'INSECT', 'LATEX', 'OTHER');

CREATE TABLE "patient_allergies" (
  "id"           uuid PRIMARY KEY DEFAULT uuidv7(),
  "user_id"      uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "allergy_type" "allergy_type" NOT NULL,
  "cause"        text NOT NULL,
  "management"   text NOT NULL,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "patient_allergies_user_id_idx" ON "patient_allergies"("user_id");
