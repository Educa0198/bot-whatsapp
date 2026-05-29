"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationService = void 0;
const env_1 = require("../config/env");
const conversationRepository_1 = require("../repositories/conversationRepository");
const logger_1 = require("../utils/logger");
class ConversationService {
    llmService;
    metaService;
    constructor(llmService, metaService) {
        this.llmService = llmService;
        this.metaService = metaService;
    }
    async handleInboundMessage(normalized) {
        const isNew = await (0, conversationRepository_1.recordWebhookEventIfNew)(normalized.waMessageId, normalized.rawPayload);
        if (!isNew) {
            logger_1.logger.info("Duplicate webhook event ignored", { waMessageId: normalized.waMessageId });
            return;
        }
        const contactId = await (0, conversationRepository_1.upsertContact)(normalized.fromPhone, normalized.profileName);
        const conversationId = await (0, conversationRepository_1.getOrCreateOpenConversation)(contactId);
        await (0, conversationRepository_1.insertInboundMessage)(conversationId, normalized);
        if (normalized.messageType !== "text" || !normalized.textBody) {
            logger_1.logger.info("Inbound non-text message skipped", { waMessageId: normalized.waMessageId, type: normalized.messageType });
            return;
        }
        const context = await (0, conversationRepository_1.getConversationContext)(conversationId, env_1.env.CONTEXT_MESSAGE_LIMIT);
        const llmResult = await this.llmService.generateReply(context, normalized.textBody);
        const sendResult = await this.metaService.sendText(normalized.fromPhone, llmResult.text);
        await (0, conversationRepository_1.insertOutboundMessage)(conversationId, llmResult.text, llmResult.metadata, sendResult);
        logger_1.logger.info("Inbound message processed", {
            waMessageId: normalized.waMessageId,
            conversationId,
            to: normalized.fromPhone
        });
    }
}
exports.ConversationService = ConversationService;
