"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.logger = {
    info: (message, context) => {
        console.log(JSON.stringify({ level: "info", message, ...context, timestamp: new Date().toISOString() }));
    },
    warn: (message, context) => {
        console.warn(JSON.stringify({ level: "warn", message, ...context, timestamp: new Date().toISOString() }));
    },
    error: (message, context) => {
        console.error(JSON.stringify({ level: "error", message, ...context, timestamp: new Date().toISOString() }));
    }
};
