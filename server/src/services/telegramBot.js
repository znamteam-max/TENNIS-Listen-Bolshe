// Telegram webhook handling is intentionally proxied to the Cloudflare Worker
// in the MVP mirror. The file exists as the future home for a native Node bot.
export function telegramBotPlaceholder() {
  return { fallbackProxy: true };
}
