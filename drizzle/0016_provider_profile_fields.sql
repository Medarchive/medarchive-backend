CREATE TYPE IF NOT EXISTS "provider_type_enum" AS ENUM('LAB', 'HOSPITAL', 'CLINIC', 'PHARMACY', 'SPECIALIST', 'OTHER');
ALTER TABLE "provider_profiles"
  ADD COLUMN IF NOT EXISTS "title" text,
  ADD COLUMN IF NOT EXISTS "first_name" text,
  ADD COLUMN IF NOT EXISTS "last_name" text,
  ADD COLUMN IF NOT EXISTS "organization_name" text,
  ADD COLUMN IF NOT EXISTS "work_address" text,
  ADD COLUMN IF NOT EXISTS "provider_type" "provider_type_enum",
  ADD COLUMN IF NOT EXISTS "profile_picture_url" text,
  ADD COLUMN IF NOT EXISTS "profile_picture_s3_key" text;
