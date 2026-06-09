import express from "express";
import { createWebhookRouter } from "./routes/webhook";
import { healthRouter } from "./routes/health";
import { LLMService } from "./services/llmService";
import { MetaWhatsAppService } from "./services/metaWhatsAppService";
import { ConversationService } from "./services/conversationService";
import { RagContextService } from "./services/ragContextService";

export const createApp = () => {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  const llmService = new LLMService();
  const metaService = new MetaWhatsAppService();
  const ragService = new RagContextService();
  const conversationService = new ConversationService(metaService, llmService, ragService);

  app.use(healthRouter);
  app.use(createWebhookRouter(conversationService));

  return app;
};
