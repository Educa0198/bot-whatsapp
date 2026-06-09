import { Router } from "express";
import { supabase } from "../repositories/db";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  const { error } = await supabase.from("BotWpp - customers").select("phone_number").limit(1);

  if (error) {
    return res.status(500).json({ ok: false, database: "unreachable", error: error.message });
  }

  return res.status(200).json({ ok: true });
});
