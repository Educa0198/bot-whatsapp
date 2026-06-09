"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagContextService = void 0;
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
class RagContextService {
    async retrieveContext(query) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), env_1.env.RAG_TIMEOUT_MS);
        try {
            const response = await fetch(`${env_1.env.RAG_BASE_URL}/api/v2/context/retrieve`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": env_1.env.RAG_API_KEY
                },
                body: JSON.stringify({
                    tenantId: "dwebnet",
                    applicationId: "whatsappbot",
                    query,
                    channel: "whatsapp",
                    audience: "customer",
                    topK: env_1.env.RAG_TOP_K,
                    output: { format: "prompt_context", maxCharacters: 3600, includeCitations: false }
                }),
                signal: controller.signal
            });
            if (!response.ok) {
                logger_1.logger.warn("RAG retrieval returned non-OK status", { status: response.status });
                return "";
            }
            const data = (await response.json());
            logger_1.logger.info("RAG context retrieved", { retrievedCount: data.retrievalMeta?.retrievedCount ?? 0 });
            return data.assembledContext ?? "";
        }
        catch (err) {
            logger_1.logger.warn("RAG retrieval failed — proceeding without context", {
                error: err instanceof Error ? err.message : String(err)
            });
            return "";
        }
        finally {
            clearTimeout(timer);
        }
    }
}
exports.RagContextService = RagContextService;
