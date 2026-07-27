CREATE TABLE "health_record_files" (
  "id"                  uuid PRIMARY KEY DEFAULT uuidv7(),
  "health_record_id"    uuid NOT NULL REFERENCES "health_records"("id") ON DELETE CASCADE,
  "file_name"           text NOT NULL,
  "file_type"           text NOT NULL,
  "file_size"           integer NOT NULL,
  "s3_key"              text NOT NULL,
  "file_url"            text NOT NULL,
  "file_url_expires_at" timestamptz NOT NULL,
  "created_at"          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "health_record_files_record_id_idx" ON "health_record_files"("health_record_id");

ALTER TABLE "health_records"
  DROP COLUMN IF EXISTS "file_name",
  DROP COLUMN IF EXISTS "file_type",
  DROP COLUMN IF EXISTS "file_size",
  DROP COLUMN IF EXISTS "s3_key",
  DROP COLUMN IF EXISTS "file_url",
  DROP COLUMN IF EXISTS "file_url_expires_at";
