CREATE TABLE "patient_medications" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"dosage" text NOT NULL,
	"frequency" text NOT NULL,
	"prescribed_by" text,
	"start_date" date NOT NULL,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "referred_by" text;--> statement-breakpoint
ALTER TABLE "patient_medications" ADD CONSTRAINT "patient_medications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "patient_medications_user_id_idx" ON "patient_medications" USING btree ("user_id");