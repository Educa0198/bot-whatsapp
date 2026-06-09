# WhatsApp Bot

Meta WhatsApp webhook backend that stores conversations in Supabase, sends inbound text messages to OpenAI with a custom system prompt, and forwards the generated reply back to the sender.

## Environment

Create a `.env` file with:

```bash
PORT=3000
META_GRAPH_API_VERSION=v20.0
META_PHONE_NUMBER_ID=your_meta_phone_number_id
META_ACCESS_TOKEN=your_meta_access_token
META_VERIFY_TOKEN=your_webhook_verify_token
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
SYSTEM_PROMPT="You are a helpful WhatsApp assistant for Dwebnet. Answer clearly and briefly."
LLM_TIMEOUT_MS=20000
```

`SYSTEM_PROMPT` is the custom prompt sent to OpenAI before the latest WhatsApp message. The latest message also includes the sender's WhatsApp phone number.

## Commands

```bash
npm install
npm run dev
npm run build
```

Expose the local server to Meta with your preferred tunnel and configure the webhook URL as:

```text
https://your-public-url/webhook
```
