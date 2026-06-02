import { Router } from "express";

export function createHealthRouter({ config }) {
  const router = Router();

  router.get("/api/health", (req, res) => {
    res.json({
      ok: true,
      runtime: "node",
      service: "listen-bolshe-overlay-server",
      buildVersion: "node-mirror-v1",
      time: new Date().toISOString(),
      fallbackBaseUrl: config.workerFallbackBaseUrl
    });
  });

  return router;
}
