CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "health_records_title_trgm_idx"
  ON "health_records" USING GIN ("title" gin_trgm_ops);
