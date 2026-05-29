"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConversationContext = exports.insertOutboundMessage = exports.insertInboundMessage = exports.getOrCreateOpenConversation = exports.upsertContact = exports.recordWebhookEventIfNew = void 0;
const db_1 = require("./db");
const recordWebhookEventIfNew = async (eventKey, payload) => {
    const { error } = await db_1.supabase.from("webhook_events").insert({ event_key: eventKey, payload_json: payload });
    if (!error) {
        return true;
    }
    if (error.code === "23505") {
        return false;
    }
    throw error;
};
exports.recordWebhookEventIfNew = recordWebhookEventIfNew;
const upsertContact = async (waId, profileName) => {
    const { data, error } = await db_1.supabase
        .from("contacts")
        .upsert({ wa_id: waId, profile_name: profileName }, { onConflict: "wa_id" })
        .select("id")
        .single();
    if (error || !data) {
        throw error ?? new Error("Unable to upsert contact");
    }
    return data.id;
};
exports.upsertContact = upsertContact;
const getOrCreateOpenConversation = async (contactId) => {
    const { data: existing, error: selectError } = await db_1.supabase
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
    const { data: created, error: insertError } = await db_1.supabase
        .from("conversations")
        .insert({ contact_id: contactId, status: "open" })
        .select("id")
        .single();
    if (insertError || !created) {
        throw insertError ?? new Error("Unable to create conversation");
    }
    return created.id;
};
exports.getOrCreateOpenConversation = getOrCreateOpenConversation;
const insertInboundMessage = async (conversationId, normalized) => {
    const { error } = await db_1.supabase.from("messages").insert({
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
exports.insertInboundMessage = insertInboundMessage;
const insertOutboundMessage = async (conversationId, text, llmMetadata, rawPayload) => {
    const { error } = await db_1.supabase.from("messages").insert({
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
exports.insertOutboundMessage = insertOutboundMessage;
const getConversationContext = async (conversationId, limit) => {
    const { data, error } = await db_1.supabase
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
        direction: row.direction,
        text: row.text,
        created_at: row.created_at
    }));
    return messages.reverse();
};
exports.getConversationContext = getConversationContext;
