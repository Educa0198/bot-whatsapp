"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseInboundMessages = void 0;
const zod_1 = require("zod");
const MetaWebhookSchema = zod_1.z.object({
    object: zod_1.z.string(),
    entry: zod_1.z.array(zod_1.z.object({
        changes: zod_1.z.array(zod_1.z.object({
            value: zod_1.z.object({
                metadata: zod_1.z
                    .object({
                    phone_number_id: zod_1.z.string().optional()
                })
                    .optional(),
                contacts: zod_1.z
                    .array(zod_1.z.object({
                    profile: zod_1.z.object({ name: zod_1.z.string().optional() }).optional(),
                    wa_id: zod_1.z.string().optional()
                }))
                    .optional(),
                messages: zod_1.z
                    .array(zod_1.z.object({
                    id: zod_1.z.string(),
                    from: zod_1.z.string(),
                    timestamp: zod_1.z.string(),
                    type: zod_1.z.string(),
                    text: zod_1.z.object({ body: zod_1.z.string() }).optional()
                }))
                    .optional()
            })
        }))
    }))
});
const parseInboundMessages = (payload) => {
    const parsed = MetaWebhookSchema.safeParse(payload);
    if (!parsed.success) {
        return [];
    }
    const result = [];
    for (const entry of parsed.data.entry) {
        for (const change of entry.changes) {
            const value = change.value;
            const toPhoneId = value.metadata?.phone_number_id ?? "";
            const contact = value.contacts?.[0];
            for (const message of value.messages ?? []) {
                result.push({
                    waMessageId: message.id,
                    fromPhone: message.from,
                    toPhoneId,
                    timestamp: message.timestamp,
                    messageType: message.type,
                    textBody: message.text?.body ?? null,
                    profileName: contact?.profile?.name ?? null,
                    rawPayload: payload
                });
            }
        }
    }
    return result;
};
exports.parseInboundMessages = parseInboundMessages;
