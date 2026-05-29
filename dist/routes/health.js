"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const db_1 = require("../repositories/db");
exports.healthRouter = (0, express_1.Router)();
exports.healthRouter.get("/health", async (_req, res) => {
    const { error } = await db_1.supabase.from("contacts").select("id").limit(1);
    if (error) {
        return res.status(500).json({ ok: false, database: "unreachable", error: error.message });
    }
    return res.status(200).json({ ok: true });
});
