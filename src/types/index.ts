export type NormalizedInboundMessage = {
  waMessageId: string;
  fromPhone: string;
  toPhoneId: string;
  timestamp: string;
  messageType: string;
  textBody: string | null;
  profileName: string | null;
  rawPayload: unknown;
};

export type ConversationMessage = {
  direction: "inbound" | "outbound";
  text: string;
  created_at: string;
};

export type LlmResult = {
  text: string;
  metadata: {
    model: string;
    latencyMs: number;
    finishReason: string | null;
    usage: Record<string, number | null>;
  };
};
