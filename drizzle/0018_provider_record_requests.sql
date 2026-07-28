CREATE TYPE IF NOT EXISTS "record_request_status" AS ENUM('PENDING', 'APPROVED', 'DECLINED');

CREATE TABLE IF NOT EXISTS "provider_record_requests" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "patient_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "provider_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "request_type" text NOT NULL,
  "note" text,
  "status" "record_request_status" NOT NULL DEFAULT 'PENDING',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "provider_record_requests_patient_id_idx" ON "provider_record_requests" ("patient_id");
CREATE INDEX IF NOT EXISTS "provider_record_requests_provider_id_idx" ON "provider_record_requests" ("provider_id");
