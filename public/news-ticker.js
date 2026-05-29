const params = new URLSearchParams(window.location.search);

const TICKER_SPEEDS = { slow: 60, normal: 100, fast: 130 };
const TICKER_HEIGHTS = {
  small: { height: 51, fontSize: 32, logoLeft: 16, logoTop: 6, logoWidth: 58, logoHeight: 39, safeLeft: 92, fadeWidth: 64 },
  normal: { height: 102, fontSize: 42, logoLeft: 24, logoTop: 18, logoWidth: 116, logoHeight: 78, safeLeft: 150, fadeWidth: 112 },
  large: { height: 128, fontSize: 52, logoLeft: 30, logoTop: 22, logoWidth: 125, logoHeight: 84, safeLeft: 172, fadeWidth: 132 }
};
const DEFAULT_TICKER_HEIGHT = 102;
const DEFAULT_LOGO_ASPECT = 116 / 78;
const TICKER_CTA_HOLD_MS = 60000;
const TICKER_SEPARATOR = "   ✦   ";

const config = {
  news: params.get("news") || "/api/news/tennis",
  ticker: params.get("ticker") || params.get("speed") || "100",
  height: params.get("height") || params.get("size") || params.get("tickerHeight") || "normal",
  refresh: Number(params.get("refresh") || 60000),
  limit: Math.min(Math.max(Number(params.get("limit") || 15), 1), 15)
};

const refs = {
  mask: document.querySelector(".ticker-mask"),
  track: document.querySelector("#tickerTrack"),
  cta: document.querySelector("#tickerCta")
};

let activeTickerText = "Загружаем новости...";
let queuedTickerText = "";
let tickerStarted = false;
let ctaTimer = null;
let fetchInFlight = null;

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function tickerSpeed() {
  const configured = TICKER_SPEEDS[config.ticker];
  if (Number.isFinite(configured)) return configured;
  const numeric = Number(config.ticker);
  return Number.isFinite(numeric) && numeric > 0 ? Math.min(Math.max(numeric, 12), 220) : 100;
}

function tickerHeightConfig() {
  const configured = TICKER_HEIGHTS[config.height];
  if (configured) return configured;

  const numeric = Number(config.height);
  if (!Number.isFinite(numeric) || numeric <= 0) return TICKER_HEIGHTS.normal;

  const height = clampNumber(Math.round(numeric), 40, 160);
  const scale = height / DEFAULT_TICKER_HEIGHT;
  const logoLeft = clampNumber(Math.round(24 * Math.min(scale, 1)), 10, 30);
  const logoHeight = clampNumber(Math.round(78 * scale), 26, height - 8);
  const logoWidth = Math.round(logoHeight * DEFAULT_LOGO_ASPECT);
  return {
    height,
    fontSize: clampNumber(Math.round(42 * Math.pow(scale, 0.4)), 28, 62),
    logoLeft,
    logoTop: Math.max(4, Math.round((height - logoHeight) / 2)),
    logoWidth,
    logoHeight,
    safeLeft: logoLeft + logoWidth + clampNumber(Math.round(18 * scale), 16, 28),
    fadeWidth: clampNumber(Math.round(112 * scale), 48, 140)
  };
}

function applyTickerHeight() {
  const size = tickerHeightConfig();
  const root = document.documentElement;
  root.style.setProperty("--ticker-height", `${size.height}px`);
  root.style.setProperty("--ticker-font-size", `${size.fontSize}px`);
  root.style.setProperty("--ticker-logo-left", `${size.logoLeft}px`);
  root.style.setProperty("--ticker-logo-top", `${size.logoTop}px`);
  root.style.setProperty("--ticker-logo-width", `${size.logoWidth}px`);
  root.style.setProperty("--ticker-logo-height", `${size.logoHeight}px`);
  root.style.setProperty("--ticker-safe-left", `${size.safeLeft}px`);
  root.style.setProperty("--ticker-fade-width", `${size.fadeWidth}px`);
  root.style.setProperty("--ticker-cta-size", `${clampNumber(Math.round(size.fontSize * 1.25), 30, 64)}px`);
  root.style.setProperty("--ticker-arrow-size", `${clampNumber(Math.round(size.fontSize * 1.5), 36, 84)}px`);
}

function newsItemsFromPayload(payload) {
  const list = Array.isArray(payload) ? payload : payload.items || [];
  const items = list
    .map((item) => item.title || item)
    .filter(Boolean)
    .slice(0, config.limit);
  return items.length ? items : ["Новости временно недоступны"];
}

async function fetchNewsItems() {
  const response = await fetch(config.news, { cache: "no-store" });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return newsItemsFromPayload(await response.json());
}

function hideCta() {
  refs.cta.hidden = true;
}

function showCta() {
  refs.track.style.animation = "none";
  refs.track.textContent = "";
  refs.cta.hidden = false;
}

function restartTicker(text) {
  hideCta();
  refs.track.style.animation = "none";
  refs.track.textContent = text;
  const maskWidth = refs.mask.clientWidth || 1770;
  refs.track.style.setProperty("--ticker-start", `${maskWidth}px`);
  const distance = maskWidth + (refs.track.scrollWidth || 1200);
  const duration = Math.max(12, Math.round(distance / tickerSpeed()));
  refs.track.style.setProperty("--ticker-duration", `${duration}s`);
  void refs.track.offsetWidth;
  refs.track.style.animation = "ticker-scroll var(--ticker-duration) linear 1";
}

function tickerTextFromItems(items) {
  const text = items.map((item) => String(item || "").trim()).filter(Boolean).join(TICKER_SEPARATOR);
  return text || "Новости временно недоступны";
}

function startNewsCycle() {
  restartTicker(activeTickerText || "Новости временно недоступны");
}

function ensureTickerStarted() {
  if (tickerStarted) return;
  tickerStarted = true;
  startNewsCycle();
}

function queueNews(items) {
  queuedTickerText = tickerTextFromItems(items);
  if (!tickerStarted) {
    activeTickerText = queuedTickerText || "Новости временно недоступны";
    queuedTickerText = "";
    ensureTickerStarted();
  }
}

async function queueNewsRefresh() {
  if (fetchInFlight) return fetchInFlight;
  fetchInFlight = fetchNewsItems()
    .then((items) => {
      queueNews(items);
    })
    .catch(() => {
      queueNews(["Новости временно недоступны"]);
    })
    .finally(() => {
      fetchInFlight = null;
    });
  return fetchInFlight;
}

function switchCycleAfterCta() {
  ctaTimer = null;
  if (queuedTickerText) {
    activeTickerText = queuedTickerText;
    queuedTickerText = "";
  }
  startNewsCycle();
  queueNewsRefresh();
}

function holdCta() {
  showCta();
  if (ctaTimer) clearTimeout(ctaTimer);
  ctaTimer = setTimeout(switchCycleAfterCta, TICKER_CTA_HOLD_MS);
}

function handleTickerEnd() {
  if (ctaTimer) return;
  holdCta();
}

refs.track.addEventListener("animationend", handleTickerEnd);

window.addEventListener("resize", () => {
  if (!tickerStarted) return;
  if (ctaTimer) return;
  restartTicker(activeTickerText || "Новости временно недоступны");
});

applyTickerHeight();
queueNewsRefresh();
setInterval(queueNewsRefresh, Math.max(config.refresh, 10000));
