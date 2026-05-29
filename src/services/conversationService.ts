import { env } from "../config/env";
import {
  getConversationContext,
  getOrCreateOpenConversation,
  insertInboundMessage,
  insertOutboundMessage,
  recordWebhookEventIfNew,
  upsertContact
} from "../repositories/conversationRepository";
import { NormalizedInboundMessage } from "../types";
import { logger } from "../utils/logger";
import { LLMService } from "./llmService";
import { MetaWhatsAppService } from "./metaWhatsAppService";

export class ConversationService {
  constructor(
    private readonly llmService: LLMService,
    private readonly metaService: MetaWhatsAppService
  ) {}

  async handleInboundMessage(normalized: NormalizedInboundMessage): Promise<void> {
    const isNew = await recordWebhookEventIfNew(normalized.waMessageId, normalized.rawPayload);
    if (!isNew) {
      logger.info("Duplicate webhook event ignored", { waMessageId: normalized.waMessageId });
      return;
    }

    const contactId = await upsertContact(normalized.fromPhone, normalized.profileName);
    const conversationId = await getOrCreateOpenConversation(contactId);
    await insertInboundMessage(conversationId, normalized);

    if (normalized.messageType !== "text" || !normalized.textBody) {
      logger.info("Inbound non-text message skipped", { waMessageId: normalized.waMessageId, type: normalized.messageType });
      return;
    }

    const context = await getConversationContext(conversationId, env.CONTEXT_MESSAGE_LIMIT);
    const llmResult = await this.llmService.generateReply(context, normalized.textBody);

    const sendResult = await this.metaService.sendText(normalized.fromPhone, llmResult.text);
    await insertOutboundMessage(conversationId, llmResult.text, llmResult.metadata, sendResult);

    logger.info("Inbound message processed", {
      waMessageId: normalized.waMessageId,
      conversationId,
      to: normalized.fromPhone
    });
  }
}
