"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const EnvSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.string().default("development"),
    PORT: zod_1.z.coerce.number().default(3000),
    META_GRAPH_API_VERSION: zod_1.z.string().default("v20.0"),
    META_PHONE_NUMBER_ID: zod_1.z.string().min(1),
    META_ACCESS_TOKEN: zod_1.z.string().min(1),
    META_VERIFY_TOKEN: zod_1.z.string().min(1),
    SUPABASE_URL: zod_1.z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().min(1),
    OPENAI_API_KEY: zod_1.z.string().min(1),
    OPENAI_MODEL: zod_1.z.string().default("gpt-4.1-mini"),
    SYSTEM_PROMPT: zod_1.z.string().default("Você é um chatbot para o whatsapp, que responde pela empresa NetMaisBeneficios. A empresa possui diversas soluções e benefícios. os mais comuns sendo VtInteligente, Tele medicina, Nr1, gestão de Frota, tele psicologia."),
    LLM_TIMEOUT_MS: zod_1.z.coerce.number().int().positive().default(20000),
    RAG_BASE_URL: zod_1.z.string().url().default("http://localhost:3100"),
    RAG_API_KEY: zod_1.z.string().min(1),
    RAG_TOP_K: zod_1.z.coerce.number().int().positive().default(4),
    RAG_TIMEOUT_MS: zod_1.z.coerce.number().int().positive().default(5000)
});
exports.env = EnvSchema.parse(process.env);
