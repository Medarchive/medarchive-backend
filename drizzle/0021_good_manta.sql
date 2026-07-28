ALTER TABLE "wallets" ADD COLUMN "encrypted_secret" text;--> statement-breakpoint
ALTER TABLE "health_record_proofs" ADD COLUMN "anchor_tx_hash" text;--> statement-breakpoint
ALTER TABLE "health_record_proofs" ADD COLUMN "verification_tx_hash" text;