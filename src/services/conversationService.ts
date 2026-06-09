import {
  getOrCreateActiveSession,
  insertInboundMessage,
  insertOutboundMessage,
  recordWebhookEventIfNew,
  upsertCustomer
} from "../repositories/conversationRepository";
import { NormalizedInboundMessage } from "../types";
import { logger } from "../utils/logger";
import { LLMService } from "./llmService";
import { MetaWhatsAppService } from "./metaWhatsAppService";
import { RagContextService } from "./ragContextService";

export class ConversationService {
  constructor(
    private readonly metaService: MetaWhatsAppService,
    private readonly llmService: LLMService,
    private readonly ragService: RagContextService
  ) {}

  async handleInboundMessage(normalized: NormalizedInboundMessage): Promise<void> {
    const isNew = await recordWebhookEventIfNew(normalized.waMessageId, normalized.rawPayload);

    if (!isNew) {
      logger.info("Duplicate webhook event ignored", { waMessageId: normalized.waMessageId });
      return;
    }

    await upsertCustomer(normalized.fromPhone, normalized.profileName);

    const sessionId = await getOrCreateActiveSession(normalized.fromPhone, normalized.timestamp);
    await insertInboundMessage(sessionId, normalized);

    if (normalized.messageType !== "text" || !normalized.textBody) {
      logger.info("Inbound non-text message persisted but skipped for LLM reply", {
        waMessageId: normalized.waMessageId,
        type: normalized.messageType
      });
      return;
    }

    console.log("\n=========================================");
    console.log(`NEW WHATSAPP MESSAGE: ${normalized.profileName ?? "Unknown"} (${normalized.fromPhone})`);
    console.log(`> ${normalized.textBody}`);
    console.log("=========================================");

    const userMessage = [
      `Numero de quem enviou: ${normalized.fromPhone}`,
      `Nome do usuário: ${normalized.profileName ?? "Unknown"}`,
      `Mensagem: ${normalized.textBody}`
    ].join("\n");

    const ragContext = await this.ragService.retrieveContext(normalized.textBody);
    const llmResult = await this.llmService.generateReply(userMessage, ragContext);
    const sendResult = await this.metaService.sendText(normalized.fromPhone, llmResult.text);

    await insertOutboundMessage(sessionId, llmResult.text, llmResult.metadata, sendResult);

    logger.info("LLM WhatsApp reply sent", {
      waMessageId: normalized.waMessageId,
      phoneNumber: normalized.fromPhone,
      model: llmResult.metadata.model,
      latencyMs: llmResult.metadata.latencyMs
    });

    console.log(`LLM reply sent: "${llmResult.text}"`);
  }
}
