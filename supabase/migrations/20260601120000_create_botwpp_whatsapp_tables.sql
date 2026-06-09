CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "BotWpp - customers" (
  phone_number TEXT PRIMARY KEY,
  whatsapp_name TEXT,
  opt_in_status BOOLEAN NOT NULL DEFAULT false,
  crm_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "BotWpp - sessions" (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL REFERENCES "BotWpp - customers"(phone_number),
  last_user_message_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closed', 'transferred_to_human')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "BotWpp - messages" (
  message_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id UUID NOT NULL REFERENCES "BotWpp - sessions"(session_id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT,
  raw_payload JSONB,
  llm_metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "BotWpp - webhook_events" (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL UNIQUE,
  payload_json JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_BotWpp - active_session_phone_number"
  ON "BotWpp - sessions" (phone_number)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS "ix_BotWpp - sessions_phone_number_status"
  ON "BotWpp - sessions" (phone_number, status);

CREATE INDEX IF NOT EXISTS "ix_BotWpp - messages_session_id_created_at"
  ON "BotWpp - messages" (session_id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_BotWpp - webhook_events_event_key"
  ON "BotWpp - webhook_events" (event_key);
