CREATE TYPE "public"."zk_proof_status" AS ENUM('PENDING', 'GENERATED', 'FAILED');

CREATE TABLE "health_record_proofs" (
  "id"                uuid PRIMARY KEY DEFAULT uuidv7(),
  "health_record_id"  uuid NOT NULL UNIQUE REFERENCES "health_records"("id") ON DELETE CASCADE,
  "status"            "zk_proof_status" NOT NULL DEFAULT 'PENDING',
  "commitment"        text,
  "proof"             jsonb,
  "public_signals"    jsonb,
  "error"             text,
  "generated_at"      timestamptz,
  "created_at"        timestamptz NOT NULL DEFAULT now()
);
