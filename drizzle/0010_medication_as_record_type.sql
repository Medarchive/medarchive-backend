-- Drop the standalone medications table
DROP TABLE IF EXISTS "patient_medications";

-- Add medication-specific columns to health_records
ALTER TABLE "health_records"
  ADD COLUMN IF NOT EXISTS "frequency" text,
  ADD COLUMN IF NOT EXISTS "end_date"  date;
