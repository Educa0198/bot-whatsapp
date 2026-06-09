import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(3000),
  META_GRAPH_API_VERSION: z.string().default("v20.0"),
  META_PHONE_NUMBER_ID: z.string().min(1),
  META_ACCESS_TOKEN: z.string().min(1),
  META_VERIFY_TOKEN: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  SYSTEM_PROMPT: z.string().default("Você é um chatbot para o whatsapp, que responde pela empresa NetMaisBeneficios. A empresa possui diversas soluções e benefícios. os mais comuns sendo VtInteligente, Tele medicina, Nr1, gestão de Frota, tele psicologia."),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
  RAG_BASE_URL: z.string().url().default("http://localhost:3100"),
  RAG_API_KEY: z.string().min(1),
  RAG_TOP_K: z.coerce.number().int().positive().default(4),
  RAG_TIMEOUT_MS: z.coerce.number().int().positive().default(5000)
});

export type AppEnv = z.infer<typeof EnvSchema>;
export const env = EnvSchema.parse(process.env);
