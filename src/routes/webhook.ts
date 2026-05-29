import { Request, Response, Router } from "express";
import { env } from "../config/env";
import { ConversationService } from "../services/conversationService";
import { parseInboundMessages } from "../utils/metaWebhook";
import { logger } from "../utils/logger";

export const createWebhookRouter = (conversationService: ConversationService): Router => {
  const router = Router();

  router.get("/webhook", (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const verifyToken = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && verifyToken === env.META_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }

    return res.status(403).json({ error: "Invalid verify token" });
  });

  router.post("/webhook", async (req: Request, res: Response) => {
    const payload = req.body;
    const messages = parseInboundMessages(payload);

    res.status(200).json({ received: true });

    if (messages.length === 0) {
      logger.info("Webhook received with no inbound messages");
      return;
    }

    for (const message of messages) {
      try {
        await conversationService.handleInboundMessage(message);
      } catch (error) {
        logger.error("Failed to process inbound message", {
          waMessageId: message.waMessageId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  });

  return router;
};
