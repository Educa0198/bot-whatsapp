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
  SYSTEM_PROMPT: z.string().default("You are a helpful WhatsApp assistant."),
  CONTEXT_MESSAGE_LIMIT: z.coerce.number().int().positive().default(10),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(20000)
});

export type AppEnv = z.infer<typeof EnvSchema>;
export const env = EnvSchema.parse(process.env);
