"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationService = void 0;
const conversationRepository_1 = require("../repositories/conversationRepository");
const logger_1 = require("../utils/logger");
class ConversationService {
    metaService;
    llmService;
    ragService;
    constructor(metaService, llmService, ragService) {
        this.metaService = metaService;
        this.llmService = llmService;
        this.ragService = ragService;
    }
    async handleInboundMessage(normalized) {
        const isNew = await (0, conversationRepository_1.recordWebhookEventIfNew)(normalized.waMessageId, normalized.rawPayload);
        if (!isNew) {
            logger_1.logger.info("Duplicate webhook event ignored", { waMessageId: normalized.waMessageId });
            return;
        }
        await (0, conversationRepository_1.upsertCustomer)(normalized.fromPhone, normalized.profileName);
        const sessionId = await (0, conversationRepository_1.getOrCreateActiveSession)(normalized.fromPhone, normalized.timestamp);
        await (0, conversationRepository_1.insertInboundMessage)(sessionId, normalized);
        if (normalized.messageType !== "text" || !normalized.textBody) {
            logger_1.logger.info("Inbound non-text message persisted but skipped for LLM reply", {
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
        await (0, conversationRepository_1.insertOutboundMessage)(sessionId, llmResult.text, llmResult.metadata, sendResult);
        logger_1.logger.info("LLM WhatsApp reply sent", {
            waMessageId: normalized.waMessageId,
            phoneNumber: normalized.fromPhone,
            model: llmResult.metadata.model,
            latencyMs: llmResult.metadata.latencyMs
        });
        console.log(`LLM reply sent: "${llmResult.text}"`);
    }
}
exports.ConversationService = ConversationService;
