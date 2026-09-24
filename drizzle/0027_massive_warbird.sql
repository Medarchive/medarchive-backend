CREATE TYPE "public"."clinical_proof_type" AS ENUM('DIAGNOSIS_CATEGORY', 'ALLERGY_CONFIRMATION', 'PRIOR_PRESCRIPTION_PATTERN', 'BLOOD_GROUP', 'GENOTYPE', 'CHRONIC_CONDITION');--> statement-breakpoint
ALTER TYPE "public"."activity_action" ADD VALUE 'CLINICAL_PROOF_REQUESTED';--> statement-breakpoint
ALTER TYPE "public"."activity_action" ADD VALUE 'CLINICAL_PROOF_VERIFIED';--> statement-breakpoint
CREATE TABLE "clinical_proofs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"proof_type" "clinical_proof_type" NOT NULL,
	"claim_data" jsonb NOT NULL,
	"status" "zk_proof_status" DEFAULT 'PENDING' NOT NULL,
	"commitment" text,
	"proof" jsonb,
	"public_signals" jsonb,
	"error" text,
	"generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "provider_record_requests" ADD COLUMN "proof_type" "clinical_proof_type";--> statement-breakpoint
ALTER TABLE "clinical_proofs" ADD CONSTRAINT "clinical_proofs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clinical_proofs_user_id_idx" ON "clinical_proofs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "clinical_proofs_proof_type_idx" ON "clinical_proofs" USING btree ("proof_type");