CREATE TYPE "public"."record_request_status" AS ENUM('PENDING', 'APPROVED', 'DECLINED');--> statement-breakpoint
CREATE TABLE "provider_record_requests" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"patient_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"request_type" text NOT NULL,
	"note" text,
	"status" "record_request_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "provider_record_requests" ADD CONSTRAINT "provider_record_requests_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_record_requests" ADD CONSTRAINT "provider_record_requests_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "provider_record_requests_patient_id_idx" ON "provider_record_requests" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "provider_record_requests_provider_id_idx" ON "provider_record_requests" USING btree ("provider_id");