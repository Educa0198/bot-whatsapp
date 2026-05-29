"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const webhook_1 = require("./routes/webhook");
const health_1 = require("./routes/health");
const llmService_1 = require("./services/llmService");
const metaWhatsAppService_1 = require("./services/metaWhatsAppService");
const conversationService_1 = require("./services/conversationService");
const createApp = () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json({ limit: "1mb" }));
    const llmService = new llmService_1.LLMService();
    const metaService = new metaWhatsAppService_1.MetaWhatsAppService();
    const conversationService = new conversationService_1.ConversationService(llmService, metaService);
    app.use(health_1.healthRouter);
    app.use((0, webhook_1.createWebhookRouter)(conversationService));
    return app;
};
exports.createApp = createApp;
