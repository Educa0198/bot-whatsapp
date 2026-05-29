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
    SYSTEM_PROMPT: zod_1.z.string().default("You are a helpful WhatsApp assistant."),
    CONTEXT_MESSAGE_LIMIT: zod_1.z.coerce.number().int().positive().default(10),
    LLM_TIMEOUT_MS: zod_1.z.coerce.number().int().positive().default(20000)
});
exports.env = EnvSchema.parse(process.env);
