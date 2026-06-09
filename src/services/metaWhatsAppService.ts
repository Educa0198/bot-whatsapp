import axios from "axios";
import { env } from "../config/env";

export class MetaWhatsAppService {
  private readonly baseUrl = `https://graph.facebook.com/${env.META_GRAPH_API_VERSION}/${env.META_PHONE_NUMBER_ID}`;

  async sendText(to: string, body: string): Promise<unknown> {
    const response = await axios.post(
      `${this.baseUrl}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body }
      },
      {
        headers: {
          Authorization: `Bearer ${env.META_ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );

    return response.data;
  }
}
