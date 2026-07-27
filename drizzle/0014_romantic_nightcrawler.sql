CREATE TYPE "public"."zk_proof_status" AS ENUM('PENDING', 'GENERATED', 'FAILED');--> statement-breakpoint
CREATE TABLE "health_record_proofs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"health_record_id" uuid NOT NULL,
	"status" "zk_proof_status" DEFAULT 'PENDING' NOT NULL,
	"commitment" text,
	"proof" jsonb,
	"public_signals" jsonb,
	"error" text,
	"generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "health_record_proofs_health_record_id_unique" UNIQUE("health_record_id")
);
--> statement-breakpoint
ALTER TABLE "health_record_proofs" ADD CONSTRAINT "health_record_proofs_health_record_id_health_records_id_fk" FOREIGN KEY ("health_record_id") REFERENCES "public"."health_records"("id") ON DELETE cascade ON UPDATE no action;