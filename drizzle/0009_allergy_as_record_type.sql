-- Drop the standalone allergies table and its enum
DROP TABLE IF EXISTS "patient_allergies";

-- allergy_type enum already exists from 0006 — reuse it
-- Add ALLERGY to health_record_type enum
ALTER TYPE "public"."health_record_type" ADD VALUE IF NOT EXISTS 'ALLERGY';

-- Add allergy-specific columns to health_records
ALTER TABLE "health_records"
  ADD COLUMN IF NOT EXISTS "allergy_type" "allergy_type",
  ADD COLUMN IF NOT EXISTS "cause"        text,
  ADD COLUMN IF NOT EXISTS "management"   text;
