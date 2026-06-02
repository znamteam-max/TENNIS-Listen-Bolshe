import cors from "cors";
import express from "express";
import { getConfig } from "./config.js";
import { createHealthRouter } from "./routes/health.js";
import { createOddsRouter } from "./routes/odds.js";
import { createOverlayRouter } from "./routes/overlay.js";
import { createTickerRouter } from "./routes/ticker.js";
import { createTelegramRouter } from "./routes/telegram.js";
import { createProxyRouter } from "./routes/proxy.js";
import { createJsonStateStore } from "./services/stateStore.js";
import { createOddsStore } from "./services/oddsStore.js";

const config = getConfig();
const app = express();
const stateStore = createJsonStateStore(config);
const oddsStore = createOddsStore(stateStore, config);
const context = { config, stateStore, oddsStore };

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use(createHealthRouter(context));
app.use(createOddsRouter(context));
app.use(createOverlayRouter(context));
app.use(createTickerRouter(context));
app.use(createTelegramRouter(context));
app.use(createProxyRouter(context));

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    runtime: "node",
    buildVersion: "node-mirror-v1",
    error: "not found",
    path: req.path
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.status || 500;
  res.status(status).json({
    ok: false,
    runtime: "node",
    buildVersion: "node-mirror-v1",
    error: error.message || String(error)
  });
});

app.listen(config.port, () => {
  console.log(`[overlay-server] listening on ${config.publicBaseUrl || `http://localhost:${config.port}`}`);
  console.log(`[overlay-server] fallback proxy target: ${config.workerFallbackBaseUrl}`);
});
