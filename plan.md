# Plan: Integrate RAG Context Into the WhatsApp Bot

## Objective

The WhatsApp bot should consult the RAG knowledge database before sending a message to the LLM. The goal is to make every LLM response more specific to the user's question, grounded in company/product knowledge, and less dependent on generic model knowledge.

Current flow:

```text
WhatsApp webhook -> ConversationService -> LLMService -> Meta WhatsApp reply
```

Target flow:

```text
WhatsApp webhook
  -> ConversationService
  -> RAG context retrieval
  -> Prompt assembly with retrieved context
  -> LLMService
  -> Meta WhatsApp reply
```

## Why We Are Doing This

The current bot sends only the user's WhatsApp message, phone number, profile name, and the global system prompt to the LLM. That works for general answers, but it limits the bot when the user asks about specific services, company details, benefits, policies, pricing logic, or internal knowledge.

By adding RAG before the LLM call, the bot can:

- Retrieve relevant company/product information before generating the answer.
- Reduce hallucinations by grounding the model in real knowledge.
- Customize replies based on the user's actual question.
- Keep the LLM layer focused on conversation and reasoning instead of acting as the database.
- Make the bot architecture easier to expand later for multiple projects, customers, or knowledge sources.

## Current Project Structure

The WhatsApp bot lives in:

```text
/home/eduardo/Desktop/github/dwebnet/whatsappbot
```

Important current files:

```text
src/app.ts
src/services/conversationService.ts
src/services/llmService.ts
src/services/metaWhatsAppService.ts
src/config/env.ts
src/types/index.ts
```

The RAG service lives in:

```text
/home/eduardo/Desktop/github/dwebnet/rag
```

Important RAG files:

```text
src/server.ts
src/types/api.ts
src/types/http.ts
src/retrieval-service/index.ts
src/prompt-context-service/index.ts
```

The RAG service already exposes this endpoint:

```text
POST /api/v1/rag/retrieve
```

So the first integration should consume RAG through HTTP instead of importing files from the sibling project.

## Architectural Decision

Use the RAG project as a standalone service.

The WhatsApp bot should not directly import RAG internals such as the Pinecone repository, embedder, chunker, or vault loader. It should only call the RAG HTTP API.

Why:

- Keeps the bot and RAG projects independently deployable.
- Avoids coupling the WhatsApp runtime to Pinecone/vector logic.
- Allows the same RAG service to be reused by future apps.
- Makes failures easier to isolate.
- Keeps the bot architecture simple: messaging, persistence, prompt building, and LLM response.

## Target Service Responsibilities

### WhatsApp Bot

The bot is responsible for:

- Receiving Meta WhatsApp webhook events.
- Persisting inbound and outbound messages in Supabase.
- Managing active conversation sessions.
- Calling the RAG API for relevant context.
- Building the final LLM prompt.
- Calling OpenAI.
- Sending the final answer through the Meta WhatsApp API.

### RAG Service

The RAG service is responsible for:

- Syncing vault/company knowledge into vector storage.
- Embedding retrieval queries.
- Searching Pinecone.
- Reducing and formatting matches.
- Returning assembled context and citations.

The RAG service should not generate WhatsApp replies. It only retrieves context.

## Step-by-Step Implementation Guide

## Step 1: Add RAG Configuration to the Bot

### What to do

Update `src/config/env.ts` in the WhatsApp bot to support RAG settings:

```bash
RAG_BASE_URL=http://localhost:3100
RAG_API_KEY=your_rag_api_key
RAG_PROJECT=netmaisbeneficios
RAG_TIMEOUT_MS=5000
RAG_TOP_K=4
```

Recommended schema additions:

```ts
RAG_BASE_URL: z.string().url().optional(),
RAG_API_KEY: z.string().optional(),
RAG_PROJECT: z.string().default("netmaisbeneficios"),
RAG_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
RAG_TOP_K: z.coerce.number().int().positive().default(4)
```

### Why

The bot needs to know where the RAG service is running, which project to retrieve knowledge for, how long to wait, and how many chunks to request.

### How it affects the project

This keeps RAG behavior configurable by environment. Local development can use `http://localhost:3100`, while production can point to a deployed RAG service.

## Step 2: Create Bot-Side RAG Types

### What to do

Create:

```text
src/types/rag.ts
```

Suggested types:

```ts
export type RagCitation = {
  filePath: string;
  title: string;
  chunkId: string;
};

export type RagRetrievalResponse = {
  queryUsed: string;
  topK: number;
  assembledContext: string;
  citations: RagCitation[];
  retrievalMeta: Record<string, unknown>;
};

export type WhatsappRagRequest = {
  phoneNumber: string;
  profileName: string | null;
  message: string;
};
```

### Why

The bot should have its own local contract for the part of the RAG response it needs. This avoids importing TypeScript types from the sibling RAG project.

### How it affects the project

This creates a clear boundary between the bot and RAG API. If the RAG service evolves, the bot only needs small updates in one place.

## Step 3: Add a RagContextService

### What to do

Create:

```text
src/services/ragContextService.ts
```

This service should:

- Receive the WhatsApp message.
- Convert it into the current RAG API request shape.
- Call `POST /api/v1/rag/retrieve`.
- Return assembled context and citations.
- Handle errors gracefully.

Suggested request mapping:

```ts
{
  project: env.RAG_PROJECT,
  theme: "Mensagem de WhatsApp do cliente",
  concern: `Responder a pergunta do usuário: ${message}`,
  stakeholders: ["cliente whatsapp"],
  knowledgeSources: ["product", "company", "project", "catalog"],
  platform: "whatsapp",
  topK: env.RAG_TOP_K
}
```

### Why

The current RAG API expects `theme`, `concern`, `stakeholders`, `knowledgeSources`, and `platform`. A bot-specific adapter lets the WhatsApp bot use the existing RAG API without forcing an immediate rewrite of the RAG service.

### How it affects the project

All RAG HTTP logic stays isolated in one service. `ConversationService` remains readable and does not need to know about HTTP headers, endpoint paths, or RAG request formatting.

## Step 4: Make RAG Failure Non-Fatal

### What to do

Inside `RagContextService`, if RAG is unavailable, times out, or returns an invalid response, return an empty context object instead of throwing into the whole conversation flow.

Suggested fallback shape:

```ts
{
  assembledContext: "",
  citations: [],
  retrievalMeta: {
    unavailable: true,
    reason: "timeout"
  }
}
```

### Why

WhatsApp users expect quick replies. If RAG is temporarily down, the bot should still answer with the base system prompt instead of failing completely.

### How it affects the project

This improves reliability. The project gains RAG benefits when available, but the bot does not become dependent on RAG for every single response.

## Step 5: Add a PromptBuilder

### What to do

Create:

```text
src/services/promptBuilder.ts
```

This service should build the final message sent to the LLM.

Suggested structure:

```text
Contexto recuperado da base de conhecimento:
<assembledContext or "Nenhum contexto relevante encontrado.">

Dados do cliente:
Numero de quem enviou: <phone>
Nome do usuário: <name>

Mensagem do usuário:
<message>

Instruções:
- Use o contexto recuperado quando ele for relevante.
- Se o contexto não responder a pergunta, não invente detalhes.
- Responda de forma natural, curta e adequada para WhatsApp.
- Se faltar informação, faça uma pergunta objetiva para continuar o atendimento.
```

### Why

Prompt assembly should not live inside `ConversationService`. A dedicated builder makes the prompt easier to test, improve, and change later.

### How it affects the project

The LLM receives a better-structured prompt. This should make answers more accurate, concise, and specific to NetMaisBeneficios knowledge.

## Step 6: Update LLMService to Accept Enriched Prompts

### What to do

Keep `LLMService` focused on calling OpenAI.

The current method:

```ts
generateReply(userMessage: string)
```

Can continue receiving a single enriched prompt string, or be renamed later to:

```ts
generateReply(prompt: string)
```

Do not put RAG logic inside `LLMService`.

### Why

The LLM service should only know how to call the model. RAG retrieval and prompt construction are separate responsibilities.

### How it affects the project

This keeps the code modular. Future changes like adding conversation history, tool calls, or a different LLM provider will be easier.

## Step 7: Update ConversationService Flow

### What to do

Update `src/services/conversationService.ts` so the flow becomes:

```ts
await insertInboundMessage(sessionId, normalized);

const ragContext = await this.ragContextService.retrieveForWhatsapp({
  phoneNumber: normalized.fromPhone,
  profileName: normalized.profileName,
  message: normalized.textBody
});

const prompt = this.promptBuilder.buildWhatsappPrompt({
  phoneNumber: normalized.fromPhone,
  profileName: normalized.profileName,
  message: normalized.textBody,
  ragContext
});

const llmResult = await this.llmService.generateReply(prompt);
const sendResult = await this.metaService.sendText(normalized.fromPhone, llmResult.text);
```

Constructor should receive:

```ts
constructor(
  private readonly metaService: MetaWhatsAppService,
  private readonly llmService: LLMService,
  private readonly ragContextService: RagContextService,
  private readonly promptBuilder: PromptBuilder
) {}
```

### Why

`ConversationService` is the orchestration layer. It is the right place to say: persist message, retrieve context, build prompt, call LLM, send answer.

### How it affects the project

The bot gains RAG-enhanced responses while keeping each service focused on one responsibility.

## Step 8: Wire Services in app.ts

### What to do

Update `src/app.ts`:

```ts
const llmService = new LLMService();
const metaService = new MetaWhatsAppService();
const ragContextService = new RagContextService();
const promptBuilder = new PromptBuilder();

const conversationService = new ConversationService(
  metaService,
  llmService,
  ragContextService,
  promptBuilder
);
```

### Why

`app.ts` is already the dependency wiring point for the bot.

### How it affects the project

No route logic needs to change. The webhook route still calls `conversationService.handleInboundMessage(...)`.

## Step 9: Store RAG Metadata With Outbound Messages

### What to do

When inserting the outbound message, include RAG metadata inside the existing `llm_metadata_json` or add a dedicated metadata object.

Suggested metadata shape:

```ts
{
  ...llmResult.metadata,
  rag: {
    used: Boolean(ragContext.assembledContext),
    citations: ragContext.citations,
    queryUsed: ragContext.queryUsed,
    retrievalMeta: ragContext.retrievalMeta
  }
}
```

### Why

When debugging a reply, you need to know whether RAG was used and which sources influenced the answer.

### How it affects the project

This improves observability and makes future quality evaluation much easier.

## Step 10: Update README and .env.example

### What to do

Update `.env.example` and `README.md` with:

```bash
RAG_BASE_URL=http://localhost:3100
RAG_API_KEY=your_rag_api_key
RAG_PROJECT=netmaisbeneficios
RAG_TIMEOUT_MS=5000
RAG_TOP_K=4
```

Also document that the RAG service must be running separately:

```bash
cd ~/Desktop/github/dwebnet/rag
npm run dev:api
```

### Why

The integration has two services. Developers need clear instructions to start both pieces locally.

### How it affects the project

This reduces setup confusion and makes the bot easier to run consistently.

## Step 11: Test the Integration Locally

### What to do

Start the RAG service:

```bash
cd ~/Desktop/github/dwebnet/rag
npm run dev:api
```

Start the WhatsApp bot:

```bash
cd ~/Desktop/github/dwebnet/whatsappbot
npm run dev
```

Test the RAG endpoint directly:

```bash
curl -X POST http://localhost:3100/api/v1/rag/retrieve \
  -H "content-type: application/json" \
  -H "x-api-key: your_rag_api_key" \
  -d '{
    "project": "netmaisbeneficios",
    "theme": "Mensagem de WhatsApp do cliente",
    "concern": "Responder a pergunta do usuário: quais benefícios vocês oferecem?",
    "stakeholders": ["cliente whatsapp"],
    "knowledgeSources": ["product", "company", "project", "catalog"],
    "platform": "whatsapp",
    "topK": 4
  }'
```

Then send a real WhatsApp test message and verify:

- Inbound message is stored.
- RAG retrieval is called.
- LLM prompt includes retrieved context.
- Reply is sent through Meta.
- Outbound message metadata includes RAG information.

### Why

Testing RAG separately first makes it easier to tell whether an issue is in retrieval, prompt assembly, LLM generation, or WhatsApp delivery.

### How it affects the project

This gives a clear local validation path before deploying anything.

## Step 12: Add Basic Tests

### What to do

Add focused tests for:

- `PromptBuilder` with context.
- `PromptBuilder` without context.
- `RagContextService` request mapping.
- `RagContextService` fallback behavior on timeout/error.
- `ConversationService` orchestration with mocked RAG and LLM services.

### Why

Most bugs in RAG chat systems happen in the glue layer: malformed requests, bad prompts, missing fallback logic, or incorrect metadata handling.

### How it affects the project

Small tests here create confidence without needing full end-to-end WhatsApp tests for every change.

## Recommended First Implementation Order

1. Add env config for RAG.
2. Add `src/types/rag.ts`.
3. Add `RagContextService`.
4. Add `PromptBuilder`.
5. Inject both into `ConversationService`.
6. Store RAG metadata with outbound messages.
7. Update `.env.example` and `README.md`.
8. Run `npm run build`.
9. Run both services locally and test a real message.

## Future Improvement: Add a Chat-Native RAG Endpoint

The current RAG endpoint works, but its request shape is designed around content generation:

```text
theme
concern
stakeholders
knowledgeSources
platform
```

For WhatsApp, a cleaner endpoint would be:

```text
POST /api/v1/rag/chat-context
```

Suggested request:

```json
{
  "project": "netmaisbeneficios",
  "query": "quanto custa telemedicina?",
  "customer": {
    "phone": "5511999999999",
    "name": "Maria"
  },
  "channel": "whatsapp",
  "topK": 4
}
```

Suggested response:

```json
{
  "queryUsed": "quanto custa telemedicina?",
  "assembledContext": "string",
  "citations": [],
  "retrievalMeta": {}
}
```

Why this matters:

- It makes the RAG API more natural for chatbots.
- It avoids artificial mapping from a chat question into `theme` and `concern`.
- It gives future assistants a stable retrieval contract.

This is not required for the first integration. The first version can use the existing `/api/v1/rag/retrieve` endpoint.

## Reliability Rules

- RAG timeout should be shorter than the LLM timeout.
- RAG failure should not block the bot from replying.
- The prompt must clearly tell the LLM not to invent details when context is missing.
- Citations should be stored internally for debugging, not necessarily shown to the WhatsApp user.
- The bot should log whether RAG was used for each outbound answer.
- RAG should be called only for text messages in the first version.

## Success Criteria

The integration is working when:

- A WhatsApp text message triggers a RAG retrieval before the LLM call.
- The final LLM prompt contains retrieved context when relevant context exists.
- The bot still replies if RAG is unavailable.
- Outbound message metadata records RAG usage and citations.
- The response is more specific to NetMaisBeneficios products/services than the current generic prompt-only behavior.

