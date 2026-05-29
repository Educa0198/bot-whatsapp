CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_id TEXT NOT NULL UNIQUE,
  profile_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id),
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  wa_message_id TEXT,
  text TEXT,
  payload_json JSONB,
  llm_metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL UNIQUE,
  payload_json JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_messages_wa_message_id
  ON messages (wa_message_id)
  WHERE wa_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_messages_conversation_id_created_at
  ON messages (conversation_id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS ux_webhook_events_event_key
  ON webhook_events (event_key);
