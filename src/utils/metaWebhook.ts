import { z } from "zod";
import { NormalizedInboundMessage } from "../types";

const MetaWebhookSchema = z.object({
  object: z.string(),
  entry: z.array(
    z.object({
      changes: z.array(
        z.object({
          value: z.object({
            metadata: z
              .object({
                phone_number_id: z.string().optional()
              })
              .optional(),
            contacts: z
              .array(
                z.object({
                  profile: z.object({ name: z.string().optional() }).optional(),
                  wa_id: z.string().optional()
                })
              )
              .optional(),
            messages: z
              .array(
                z.object({
                  id: z.string(),
                  from: z.string(),
                  timestamp: z.string(),
                  type: z.string(),
                  text: z.object({ body: z.string() }).optional()
                })
              )
              .optional()
          })
        })
      )
    })
  )
});

export const parseInboundMessages = (payload: unknown): NormalizedInboundMessage[] => {
  const parsed = MetaWebhookSchema.safeParse(payload);
  if (!parsed.success) {
    return [];
  }

  const result: NormalizedInboundMessage[] = [];

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
