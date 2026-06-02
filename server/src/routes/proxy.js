import { Router } from "express";

const FALLBACK_GET_PATHS = new Set([
  "/api/news/tennis",
  "/api/live-matches",
  "/api/matches",
  "/api/match/flashscore",
  "/api/odds/debug",
  "/api/odds/probe",
  "/api/odds/winline",
  "/overlay.css",
  "/overlay.js",
  "/news-ticker.css",
  "/news-ticker.js",
  "/news-ticker-bg.png",
  "/news-ticker-bg-small.png",
  "/news-ticker-logo.png",
  "/assets/promo-top-left.jpg",
  "/promo-top-left.jpg"
]);

export function createProxyRouter({ config }) {
  const router = Router();

  // Fallback proxy: these routes are intentionally served by the Cloudflare Worker
  // until the full render/news/Flashscore/Telegram stack is ported to Node.
  router.use(async (req, res, next) => {
    const shouldProxy =
      (req.method === "GET" && FALLBACK_GET_PATHS.has(req.path)) ||
      (req.method === "POST" && req.path === "/telegram/webhook");

    if (!shouldProxy) return next();

    try {
      const response = await proxyToWorker(req, config);
      res.status(response.status);
      copyHeaders(response.headers, res);
      const body = Buffer.from(await response.arrayBuffer());
      res.send(body);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

async function proxyToWorker(req, config) {
  const target = new URL(req.originalUrl, config.workerFallbackBaseUrl);
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (!value || ["host", "connection", "content-length"].includes(name.toLowerCase())) continue;
    headers.set(name, Array.isArray(value) ? value.join(",") : value);
  }

  let body;
  if (!["GET", "HEAD"].includes(req.method)) {
    body = req.is("application/json") ? JSON.stringify(req.body || {}) : undefined;
  }

  return fetch(target, {
    method: req.method,
    headers,
    body,
    redirect: "follow"
  });
}

function copyHeaders(headers, res) {
  for (const [name, value] of headers.entries()) {
    if (["content-encoding", "content-length"].includes(name.toLowerCase())) continue;
    res.setHeader(name, value);
  }
}
