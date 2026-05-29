"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaWhatsAppService = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
class MetaWhatsAppService {
    baseUrl = `https://graph.facebook.com/${env_1.env.META_GRAPH_API_VERSION}/${env_1.env.META_PHONE_NUMBER_ID}`;
    async sendText(to, body) {
        const response = await axios_1.default.post(`${this.baseUrl}/messages`, {
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: { body }
        }, {
            headers: {
                Authorization: `Bearer ${env_1.env.META_ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            },
            timeout: 15000
        });
        return response.data;
    }
}
exports.MetaWhatsAppService = MetaWhatsAppService;
