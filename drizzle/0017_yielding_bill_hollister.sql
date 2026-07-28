CREATE TYPE "public"."provider_type_enum" AS ENUM('LAB', 'HOSPITAL', 'CLINIC', 'PHARMACY', 'SPECIALIST', 'OTHER');--> statement-breakpoint
CREATE TABLE "provider_invitations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"token_hash" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "provider_profiles" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "provider_profiles" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "provider_profiles" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "provider_profiles" ADD COLUMN "organization_name" text;--> statement-breakpoint
ALTER TABLE "provider_profiles" ADD COLUMN "work_address" text;--> statement-breakpoint
ALTER TABLE "provider_profiles" ADD COLUMN "provider_type" "provider_type_enum";--> statement-breakpoint
ALTER TABLE "provider_profiles" ADD COLUMN "profile_picture_url" text;--> statement-breakpoint
ALTER TABLE "provider_profiles" ADD COLUMN "profile_picture_s3_key" text;--> statement-breakpoint
ALTER TABLE "health_records" ADD COLUMN "zk_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "provider_invitations" ADD CONSTRAINT "provider_invitations_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "provider_invitations_token_hash_idx" ON "provider_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "provider_invitations_email_idx" ON "provider_invitations" USING btree ("email");