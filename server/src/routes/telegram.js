import { Router } from "express";

export function createTelegramRouter({ config }) {
  const router = Router();

  router.get("/telegram/health", (req, res) => {
    res.json({
      ok: true,
      runtime: "node",
      buildVersion: "node-mirror-v1",
      botConfigured: Boolean(config.telegramBotToken),
      webhookPath: "/telegram/webhook",
      fallbackProxy: true
    });
  });

  return router;
}
