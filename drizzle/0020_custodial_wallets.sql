ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "encrypted_secret" text;
ALTER TABLE "health_record_proofs"
  ADD COLUMN IF NOT EXISTS "anchor_tx_hash" text,
  ADD COLUMN IF NOT EXISTS "verification_tx_hash" text;
