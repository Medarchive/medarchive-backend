CREATE TABLE IF NOT EXISTS "provider_invitations" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "token_hash" text UNIQUE NOT NULL,
  "email" text NOT NULL,
  "name" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_by_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "provider_invitations_email_idx" ON "provider_invitations" ("email");
