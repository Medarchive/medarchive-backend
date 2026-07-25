CREATE TYPE "public"."activity_action" AS ENUM(
  'LOGIN',
  'HEALTH_RECORD_UPLOADED',
  'HEALTH_RECORD_DELETED',
  'EMERGENCY_CONTACT_ADDED',
  'EMERGENCY_CONTACT_UPDATED',
  'EMERGENCY_CONTACT_DELETED',
  'MEDICATION_ADDED',
  'MEDICATION_UPDATED',
  'MEDICATION_DELETED',
  'CARE_ID_GENERATED',
  'SHARE_LINK_GENERATED',
  'WALLET_LINKED',
  'WALLET_VERIFIED',
  'WALLET_REMOVED',
  'MEDICAL_PROFILE_UPDATED',
  'CONDITIONS_UPDATED'
);

CREATE TABLE "activity_logs" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "action" "activity_action" NOT NULL,
  "metadata" jsonb,
  "ip_address" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id");
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");
