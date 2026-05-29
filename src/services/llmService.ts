import OpenAI from "openai";
import { env } from "../config/env";
import { ConversationMessage, LlmResult } from "../types";

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export class LLMService {
  async generateReply(conversationContext: ConversationMessage[], userMessage: string): Promise<LlmResult> {
    const start = Date.now();

    const contextMessages = conversationContext.map((msg) => ({
      role: msg.direction === "inbound" ? "user" : "assistant",
      content: msg.text
    })) as Array<{ role: "user" | "assistant"; content: string }>;

    const response = await client.chat.completions.create(
      {
        model: env.OPENAI_MODEL,
        messages: [
          { role: "system", content: env.SYSTEM_PROMPT },
          ...contextMessages,
          { role: "user", content: userMessage }
        ]
      },
      {
        timeout: env.LLM_TIMEOUT_MS,
        maxRetries: 2
      }
    );

    const text = response.choices[0]?.message?.content?.trim() || "I could not generate a response right now.";

    return {
      text,
      metadata: {
        model: response.model,
        latencyMs: Date.now() - start,
        finishReason: response.choices[0]?.finish_reason ?? null,
        usage: {
          prompt_tokens: response.usage?.prompt_tokens ?? null,
          completion_tokens: response.usage?.completion_tokens ?? null,
          total_tokens: response.usage?.total_tokens ?? null
        }
      }
    };
  }
}
