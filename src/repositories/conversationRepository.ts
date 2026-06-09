import { supabase } from "./db";
import { NormalizedInboundMessage } from "../types";

const TABLES = {
  customers: "BotWpp - customers",
  sessions: "BotWpp - sessions",
  messages: "BotWpp - messages",
  webhookEvents: "BotWpp - webhook_events"
} as const;

const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

const toIsoTimestamp = (timestamp: string): string => {
  if (/^\d+$/.test(timestamp)) {
    return new Date(Number(timestamp) * 1000).toISOString();
  }

  return timestamp;
};

const getOutboundMessageId = (payload: unknown): string | undefined => {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const messages = (payload as { messages?: Array<{ id?: unknown }> }).messages;
  const id = messages?.[0]?.id;

  return typeof id === "string" && id.length > 0 ? id : undefined;
};

export const recordWebhookEventIfNew = async (eventKey: string, payload: unknown): Promise<boolean> => {
  const { error } = await supabase
    .from(TABLES.webhookEvents)
    .insert({ event_key: eventKey, payload_json: payload });

  if (!error) {
    return true;
  }

  if ((error as { code?: string }).code === "23505") {
    return false;
  }

  throw error;
};

export const upsertCustomer = async (phoneNumber: string, whatsappName: string | null): Promise<string> => {
  const { data, error } = await supabase
    .from(TABLES.customers)
    .upsert(
      {
        phone_number: phoneNumber,
        whatsapp_name: whatsappName,
        updated_at: new Date().toISOString()
      },
      { onConflict: "phone_number" }
    )
    .select("phone_number")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to upsert customer");
  }

  return data.phone_number;
};

export const getOrCreateActiveSession = async (
  phoneNumber: string,
  lastUserMessageAt: string
): Promise<string> => {
  const messageAt = toIsoTimestamp(lastUserMessageAt);
  const now = Date.now();

  const { data: existing, error: selectError } = await supabase
    .from(TABLES.sessions)
    .select("session_id, last_user_message_at")
    .eq("phone_number", phoneNumber)
    .eq("status", "active")
    .order("last_user_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing?.session_id) {
    const lastMessageTime = new Date(existing.last_user_message_at as string).getTime();
    const isInsideCustomerServiceWindow = now - lastMessageTime < SESSION_WINDOW_MS;

    if (isInsideCustomerServiceWindow) {
      const { error: updateError } = await supabase
        .from(TABLES.sessions)
        .update({ last_user_message_at: messageAt, updated_at: new Date().toISOString() })
        .eq("session_id", existing.session_id);

      if (updateError) {
        throw updateError;
      }

      return existing.session_id as string;
    }

    const { error: closeError } = await supabase
      .from(TABLES.sessions)
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("session_id", existing.session_id);

    if (closeError) {
      throw closeError;
    }
  }

  const { data: created, error: insertError } = await supabase
    .from(TABLES.sessions)
    .insert({
      phone_number: phoneNumber,
      last_user_message_at: messageAt,
      status: "active"
    })
    .select("session_id")
    .single();

  if (insertError || !created) {
    throw insertError ?? new Error("Unable to create session");
  }

  return created.session_id;
};

export const insertInboundMessage = async (
  sessionId: string,
  normalized: NormalizedInboundMessage
): Promise<void> => {
  const { error } = await supabase.from(TABLES.messages).insert({
    message_id: normalized.waMessageId,
    session_id: sessionId,
    role: "user",
    content: normalized.textBody,
    raw_payload: normalized.rawPayload,
    llm_metadata_json: null,
    created_at: toIsoTimestamp(normalized.timestamp)
  });

  if (error) {
    throw error;
  }
};

export const insertOutboundMessage = async (
  sessionId: string,
  text: string,
  llmMetadata: Record<string, unknown> | null,
  rawPayload: unknown
): Promise<void> => {
  const outboundMessageId = getOutboundMessageId(rawPayload);
  const row = {
    ...(outboundMessageId ? { message_id: outboundMessageId } : {}),
    session_id: sessionId,
    role: "assistant",
    content: text,
    raw_payload: rawPayload,
    llm_metadata_json: llmMetadata
  };

  const { error } = await supabase.from(TABLES.messages).insert(row);

  if (error) {
    throw error;
  }
};
