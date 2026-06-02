import "dotenv/config";

function asPositiveInt(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.round(numeric);
}

function asBoolean(value, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback;
  const text = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(text)) return true;
  if (["0", "false", "no", "n", "off"].includes(text)) return false;
  return fallback;
}

export function getConfig() {
  const config = {
    workerBaseUrl: String(process.env.WORKER_BASE_URL || "").trim().replace(/\/+$/, ""),
    oddsPushSecret: String(process.env.ODDS_PUSH_SECRET || "").trim(),
    pollIntervalMs: asPositiveInt(process.env.POLL_INTERVAL_MS, 7000),
    headless: asBoolean(process.env.HEADLESS, true),
    pageTimeoutMs: asPositiveInt(process.env.PAGE_TIMEOUT_MS, 45000),
    settleDelayMs: asPositiveInt(process.env.SETTLE_DELAY_MS, 5000),
    servicePort: asPositiveInt(process.env.ODDS_SERVICE_PORT, 3010),
    serviceSecret: String(process.env.ODDS_SERVICE_SECRET || process.env.ODDS_PUSH_SECRET || "").trim(),
    activeFetchTimeoutMs: asPositiveInt(process.env.ACTIVE_FETCH_TIMEOUT_MS, 8000),
    allowFallbackActiveMatches: asBoolean(process.env.ALLOW_FALLBACK_ACTIVE_MATCHES, false)
  };

  const missing = [];
  if (!config.workerBaseUrl) missing.push("WORKER_BASE_URL");
  if (!config.oddsPushSecret) missing.push("ODDS_PUSH_SECRET");
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  return config;
}
