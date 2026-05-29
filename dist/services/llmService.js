"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMService = void 0;
const openai_1 = __importDefault(require("openai"));
const env_1 = require("../config/env");
const client = new openai_1.default({ apiKey: env_1.env.OPENAI_API_KEY });
class LLMService {
    async generateReply(conversationContext, userMessage) {
        const start = Date.now();
        const contextMessages = conversationContext.map((msg) => ({
            role: msg.direction === "inbound" ? "user" : "assistant",
            content: msg.text
        }));
        const response = await client.chat.completions.create({
            model: env_1.env.OPENAI_MODEL,
            messages: [
                { role: "system", content: env_1.env.SYSTEM_PROMPT },
                ...contextMessages,
                { role: "user", content: userMessage }
            ]
        }, {
            timeout: env_1.env.LLM_TIMEOUT_MS,
            maxRetries: 2
        });
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
exports.LLMService = LLMService;
