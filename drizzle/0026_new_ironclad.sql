CREATE TYPE "public"."service_order_status" AS ENUM('PENDING', 'PAID');--> statement-breakpoint
ALTER TYPE "public"."activity_action" ADD VALUE 'SERVICE_ORDER_CREATED';--> statement-breakpoint
ALTER TYPE "public"."activity_action" ADD VALUE 'SERVICE_ORDER_PAID';--> statement-breakpoint
CREATE TABLE "service_orders" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"reference" text NOT NULL,
	"patient_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"provider_wallet_address" text NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(18, 7) NOT NULL,
	"asset_code" text DEFAULT 'USDC' NOT NULL,
	"status" "service_order_status" DEFAULT 'PENDING' NOT NULL,
	"tx_hash" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "service_orders_reference_idx" ON "service_orders" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "service_orders_tx_hash_idx" ON "service_orders" USING btree ("tx_hash");--> statement-breakpoint
CREATE INDEX "service_orders_patient_id_idx" ON "service_orders" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "service_orders_provider_id_idx" ON "service_orders" USING btree ("provider_id");