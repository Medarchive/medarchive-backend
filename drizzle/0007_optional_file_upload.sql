ALTER TABLE "health_records"
  ALTER COLUMN "file_name"         DROP NOT NULL,
  ALTER COLUMN "file_type"         DROP NOT NULL,
  ALTER COLUMN "file_size"         DROP NOT NULL,
  ALTER COLUMN "s3_key"            DROP NOT NULL,
  ALTER COLUMN "file_url"          DROP NOT NULL,
  ALTER COLUMN "file_url_expires_at" DROP NOT NULL;
