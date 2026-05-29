import { supabase } from "./db";
import { ConversationMessage, NormalizedInboundMessage } from "../types";

export const recordWebhookEventIfNew = async (eventKey: string, payload: unknown): Promise<boolean> => {
  const { error } = await supabase.from("webhook_events").insert({ event_key: eventKey, payload_json: payload });

  if (!error) {
    return true;
  }

  if ((error as { code?: string }).code === "23505") {
    return false;
  }

  throw error;
};

export const upsertContact = async (waId: string, profileName: string | null): Promise<string> => {
  const { data, error } = await supabase
    .from("contacts")
    .upsert({ wa_id: waId, profile_name: profileName }, { onConflict: "wa_id" })
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to upsert contact");
  }

  return data.id;
};

export const getOrCreateOpenConversation = async (contactId: string): Promise<string> => {
  const { data: existing, error: selectError } = await supabase
    .from("conversations")
    .select("id")
    .eq("contact_id", contactId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing?.id) {
    return existing.id;
  }

  const { data: created, error: insertError } = await supabase
    .from("conversations")
    .insert({ contact_id: contactId, status: "open" })
    .select("id")
    .single();

  if (insertError || !created) {
    throw insertError ?? new Error("Unable to create conversation");
  }

  return created.id;
};

export const insertInboundMessage = async (
  conversationId: string,
  normalized: NormalizedInboundMessage
): Promise<void> => {
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    direction: "inbound",
    wa_message_id: normalized.waMessageId,
    text: normalized.textBody,
    payload_json: normalized.rawPayload,
    llm_metadata_json: null
  });

  if (error) {
    throw error;
  }
};

export const insertOutboundMessage = async (
  conversationId: string,
  text: string,
  llmMetadata: Record<string, unknown> | null,
  rawPayload: unknown
): Promise<void> => {
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    direction: "outbound",
    wa_message_id: null,
    text,
    payload_json: rawPayload,
    llm_metadata_json: llmMetadata
  });

  if (error) {
    throw error;
  }
};

export const getConversationContext = async (
  conversationId: string,
  limit: number
): Promise<ConversationMessage[]> => {
  const { data, error } = await supabase
    .from("messages")
    .select("direction, text, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  const messages = (data ?? [])
    .filter((row) => typeof row.text === "string" && row.text.length > 0)
    .map((row) => ({
      direction: row.direction as "inbound" | "outbound",
      text: row.text as string,
      created_at: row.created_at as string
    }));

  return messages.reverse();
};
