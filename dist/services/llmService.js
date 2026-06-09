"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMService = void 0;
const openai_1 = __importDefault(require("openai"));
const env_1 = require("../config/env");
const client = new openai_1.default({
    apiKey: env_1.env.OPENAI_API_KEY,
    timeout: env_1.env.LLM_TIMEOUT_MS,
    maxRetries: 2
});
class LLMService {
    async generateReply(userMessage, ragContext) {
        const start = Date.now();
        const systemContent = ragContext
            ? `${env_1.env.SYSTEM_PROMPT}\n\n[BASE DE CONHECIMENTO]\n${ragContext}\n[FIM DA BASE DE CONHECIMENTO]\n\nUse as informações acima para responder. Seja direto e objetivo. Se a informação não estiver na base de conhecimento, responda com o que sabe sobre os produtos DWEBNET.`
            : env_1.env.SYSTEM_PROMPT;
        const response = await client.chat.completions.create({
            model: env_1.env.OPENAI_MODEL,
            messages: [{ role: "system", content: systemContent }, { role: "user", content: userMessage }]
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
