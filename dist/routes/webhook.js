"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWebhookRouter = void 0;
const express_1 = require("express");
const env_1 = require("../config/env");
const metaWebhook_1 = require("../utils/metaWebhook");
const logger_1 = require("../utils/logger");
const createWebhookRouter = (conversationService) => {
    const router = (0, express_1.Router)();
    router.get("/webhook", (req, res) => {
        const mode = req.query["hub.mode"];
        const verifyToken = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];
        if (mode === "subscribe" && verifyToken === env_1.env.META_VERIFY_TOKEN) {
            return res.status(200).send(challenge);
        }
        return res.status(403).json({ error: "Invalid verify token" });
    });
    router.post("/webhook", async (req, res) => {
        const payload = req.body;
        const messages = (0, metaWebhook_1.parseInboundMessages)(payload);
        res.status(200).json({ received: true });
        if (messages.length === 0) {
            logger_1.logger.info("Webhook received with no inbound messages");
            return;
        }
        for (const message of messages) {
            try {
                await conversationService.handleInboundMessage(message);
            }
            catch (error) {
                logger_1.logger.error("Failed to process inbound message", {
                    waMessageId: message.waMessageId,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    });
    return router;
};
exports.createWebhookRouter = createWebhookRouter;
