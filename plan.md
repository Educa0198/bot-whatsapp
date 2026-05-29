# plan.md — WhatsApp + Meta API + LLM Architecture (Phase 1-3)

## Summary
Build a WhatsApp automation backend that:
1. Receives WhatsApp messages via Meta Webhook.
2. Stores message and conversation data in Supabase Postgres.
3. Sends inbound user messages to an LLM (OpenAI), stores the response, and replies back through Meta API.

Tech decisions locked:
- Backend: Node.js + TypeScript
- Database: Supabase Postgres
- LLM: OpenAI API

## Implementation Plan (Step-by-step)

### 1. Project Bootstrap (Foundation)
1. Initialize Node.js + TypeScript project structure.
2. Add core dependencies:
- `express` (HTTP server/webhook)
- `axios` (Meta API HTTP calls)
- `dotenv` (env management)
- `zod` (payload validation)
- `pg` or Supabase client (DB access)
- OpenAI SDK
3. Create folders:
- `src/config`
- `src/routes`
- `src/services`
- `src/repositories`
- `src/types`
- `src/utils`
4. Add scripts:
- `dev`, `build`, `start`, `lint`, `test` (test can be placeholder initially).
5. Create `.env.example` with all required keys.

### 2. Meta API Messaging Logic (Phase 1 first milestone)
1. Configure Meta assets:
- Meta app
- WhatsApp Business Account
- Phone Number ID
- Permanent/long-lived access token
- Webhook verify token
2. Implement webhook endpoints:
- `GET /webhook` for Meta verification challenge.
- `POST /webhook` for incoming messages/events.
3. Validate inbound webhook payload shape (zod schema).
4. Extract normalized inbound message fields:
- `wa_message_id`
- `from_phone`
- `to_phone_id`
- `timestamp`
- `message_type`
- `text_body` (when text)
- raw payload
5. Implement outbound send-message service:
- `POST https://graph.facebook.com/v{version}/{phone-number-id}/messages`
- Send text response to user using bearer token.
6. Add basic reliability:
- Idempotency by `wa_message_id` (ignore duplicate webhook deliveries).
- Structured logging for webhook receive/send success/fail.
- Return `200 OK` quickly to webhook after safe enqueue/persist decision.

### 3. Database Integration (Phase 2)
1. Create Supabase project and obtain:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
2. Create schema:
- `contacts` (id, wa_id/phone, profile_name, created_at, updated_at)
- `conversations` (id, contact_id, status, created_at, updated_at)
- `messages` (id, conversation_id, direction[inbound|outbound], wa_message_id, text, payload_json, llm_metadata_json, created_at)
- `webhook_events` (id, event_key unique, payload_json, received_at) for dedupe/audit
3. Add DB repository layer:
- `upsertContact`
- `getOrCreateOpenConversation`
- `insertInboundMessage`
- `insertOutboundMessage`
- `recordWebhookEventIfNew`
4. Webhook flow with DB:
- Receive payload -> dedupe -> persist inbound message -> trigger LLM pipeline.
5. Add indexes:
- unique on `messages.wa_message_id` (nullable unique where present)
- unique on `webhook_events.event_key`
- index on `messages.conversation_id, created_at`.

### 4. LLM Integration (Phase 3)
1. Implement `LLMService` using OpenAI API.
2. Build prompt assembly from recent conversation history:
- System instruction (assistant role/policy)
- Last N messages from conversation
- Current inbound user message
3. Generate response with timeout + retry strategy.
4. Persist LLM output metadata:
- model
- latency
- token usage
- finish reason
5. Send generated response back to user via Meta send-message API.
6. Persist outbound message record after successful send.
7. On failure:
- Store error state in logs/table
- Optional fallback message to user (safe default text).

### 5. End-to-end Runtime Flow
1. User sends WhatsApp message.
2. Meta sends webhook event to backend.
3. Backend validates + deduplicates event.
4. Backend stores inbound message in Supabase.
5. Backend fetches context and calls OpenAI.
6. Backend stores LLM response.
7. Backend sends response through Meta API.
8. Backend stores outbound message and closes request lifecycle.

### 6. Local and Deployment Setup
1. Local dev:
- Expose local webhook via tunnel (ngrok or Cloudflare Tunnel).
- Register webhook URL in Meta app config.
2. Production deployment target (later finalize):
- Render/Railway/Fly/Cloud Run (single webhook service).
3. Configure secrets in hosting:
- Meta token, verify token, phone number ID, Supabase keys, OpenAI key.
4. Add health endpoint:
- `GET /health` with DB connectivity check (optional lightweight).

## Public Interfaces / APIs
- `GET /webhook`: Meta verification handshake.
- `POST /webhook`: Receives WhatsApp events.
- Internal service interfaces:
- `MetaWhatsAppService.sendText(to, body)`
- `ConversationService.handleInboundMessage(normalizedMessage)`
- `LLMService.generateReply(conversationContext, userMessage)`

## Test Plan
1. Webhook verification test:
- Valid token returns challenge.
- Invalid token returns unauthorized.
2. Webhook inbound parsing tests:
- Text message payload parsed correctly.
- Non-text payload handled gracefully.
3. Idempotency tests:
- Same webhook message delivered twice only persists once.
4. DB integration tests:
- Contact/conversation/message upserts and inserts work.
5. LLM integration tests:
- Successful response path persists and sends outbound message.
- Timeout/error path logs and handles fallback behavior.
6. End-to-end test (sandbox number):
- Send WhatsApp message -> verify stored inbound/outbound + actual reply.

## Assumptions and Defaults
- We start with text-only message handling in v1 (no audio/image processing yet).
- Single-language prompting initially (can be expanded later).
- Single-worker synchronous processing is acceptable for v1; queueing can be added later.
- Supabase Postgres is the source of truth for message history.
- OpenAI provider is used first, but service layer keeps future provider swap possible.
