import { env } from "../config/env";
import { logger } from "../utils/logger";

interface RagRetrieveResponse {
  assembledContext: string;
  retrievalMeta: {
    retrievedCount: number;
  };
}

export class RagContextService {
  async retrieveContext(query: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.RAG_TIMEOUT_MS);

    try {
      const response = await fetch(`${env.RAG_BASE_URL}/api/v2/context/retrieve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.RAG_API_KEY
        },
        body: JSON.stringify({
          tenantId: "dwebnet",
          applicationId: "whatsappbot",
          query,
          channel: "whatsapp",
          audience: "customer",
          topK: env.RAG_TOP_K,
          output: { format: "prompt_context", maxCharacters: 3600, includeCitations: false }
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        logger.warn("RAG retrieval returned non-OK status", { status: response.status });
        return "";
      }

      const data = (await response.json()) as RagRetrieveResponse;
      logger.info("RAG context retrieved", { retrievedCount: data.retrievalMeta?.retrievedCount ?? 0 });
      return data.assembledContext ?? "";
    } catch (err) {
      logger.warn("RAG retrieval failed — proceeding without context", {
        error: err instanceof Error ? err.message : String(err)
      });
      return "";
    } finally {
      clearTimeout(timer);
    }
  }
}
