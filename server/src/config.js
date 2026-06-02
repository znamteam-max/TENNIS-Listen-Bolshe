import "dotenv/config";
import path from "node:path";

function cleanUrl(value, fallback) {
  const raw = String(value || fallback || "").trim();
  return raw.replace(/\/+$/, "");
}

function asPort(value, fallback = 3000) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.round(numeric);
}

export function getConfig() {
  const cwd = process.cwd();
  const stateFile = String(process.env.STATE_FILE || "./data/state.json").trim();

  return {
    port: asPort(process.env.PORT, 3000),
    publicBaseUrl: cleanUrl(process.env.PUBLIC_BASE_URL, "http://localhost:3000"),
    workerFallbackBaseUrl: cleanUrl(
      process.env.WORKER_FALLBACK_BASE_URL,
      "https://tennis-listen-bolshe-overlay.znamteam-903.workers.dev"
    ),
    telegramBotToken: String(process.env.TELEGRAM_BOT_TOKEN || "").trim(),
    telegramChatId: String(process.env.TELEGRAM_CHAT_ID || "").trim(),
    telegramThreadId: String(process.env.TELEGRAM_THREAD_ID || "").trim(),
    telegramWebhookSecret: String(process.env.TELEGRAM_WEBHOOK_SECRET || "").trim(),
    oddsPushSecret: String(process.env.ODDS_PUSH_SECRET || "").trim(),
    oddsServiceSecret: String(process.env.ODDS_SERVICE_SECRET || process.env.ODDS_PUSH_SECRET || "").trim(),
    stateStore: String(process.env.STATE_STORE || "json").trim().toLowerCase(),
    stateFile: path.isAbsolute(stateFile) ? stateFile : path.join(cwd, stateFile)
  };
}
