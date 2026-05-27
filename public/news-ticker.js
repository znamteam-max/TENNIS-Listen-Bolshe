const params = new URLSearchParams(window.location.search);
const TICKER_SPEEDS = { slow: 26, normal: 36, fast: 52 };
const TICKER_HEIGHTS = {
  small: { height: 51, fontSize: 32, logoLeft: 16, logoTop: 6, logoWidth: 58, logoHeight: 39, safeLeft: 92, fadeWidth: 64 },
  normal: { height: 102, fontSize: 42, logoLeft: 24, logoTop: 18, logoWidth: 116, logoHeight: 78, safeLeft: 150, fadeWidth: 112 },
  large: { height: 128, fontSize: 52, logoLeft: 30, logoTop: 22, logoWidth: 125, logoHeight: 84, safeLeft: 172, fadeWidth: 132 }
};
const DEFAULT_TICKER_HEIGHT = 102;
const DEFAULT_LOGO_ASPECT = 116 / 78;

const config = {
  news: params.get("news") || "/api/news/tennis",
  ticker: params.get("ticker") || params.get("speed") || "slow",
  height: params.get("height") || params.get("size") || params.get("tickerHeight") || "normal",
  refresh: Number(params.get("refresh") || 60000),
  limit: Math.min(Math.max(Number(params.get("limit") || 15), 1), 15)
};

const refs = {
  mask: document.querySelector(".ticker-mask"),
  track: document.querySelector("#tickerTrack")
};

let activeNewsText = "Загружаем новости...";
let queuedNewsText = "";
let tickerStarted = false;
let fetchInFlight = null;
let switchingCycle = false;

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function tickerSpeed() {
  const configured = TICKER_SPEEDS[config.ticker];
  if (Number.isFinite(configured)) return configured;
  const numeric = Number(config.ticker);
  return Number.isFinite(numeric) && numeric > 0 ? Math.min(Math.max(numeric, 12), 90) : TICKER_SPEEDS.slow;
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
  root.style.setProperty("--ticker-height", size.height + "px");
  root.style.setProperty("--ticker-font-size", size.fontSize + "px");
  root.style.setProperty("--ticker-logo-left", size.logoLeft + "px");
  root.style.setProperty("--ticker-logo-top", size.logoTop + "px");
  root.style.setProperty("--ticker-logo-width", size.logoWidth + "px");
  root.style.setProperty("--ticker-logo-height", size.logoHeight + "px");
  root.style.setProperty("--ticker-safe-left", size.safeLeft + "px");
  root.style.setProperty("--ticker-fade-width", size.fadeWidth + "px");
}

function newsTextFromPayload(payload) {
  const list = Array.isArray(payload) ? payload : payload.items || [];
  return list
    .map((item) => item.title || item)
    .filter(Boolean)
    .slice(0, config.limit)
    .join("   •   ") || "Новости временно недоступны";
}

async function fetchNewsText() {
  const response = await fetch(config.news, { cache: "no-store" });
  if (!response.ok) throw new Error(response.status + " " + response.statusText);
  return newsTextFromPayload(await response.json());
}

function restartTicker() {
  refs.track.style.animation = "none";
  refs.track.textContent = activeNewsText;
  const maskWidth = refs.mask.clientWidth || 1770;
  refs.track.style.setProperty("--ticker-start", maskWidth + "px");
  const distance = maskWidth + (refs.track.scrollWidth || 1200);
  const duration = Math.max(28, Math.round(distance / tickerSpeed()));
  refs.track.style.setProperty("--ticker-duration", duration + "s");
  void refs.track.offsetWidth;
  refs.track.style.animation = "ticker-scroll var(--ticker-duration) linear 1";
}

function startTicker() {
  if (tickerStarted) return;
  tickerStarted = true;
  restartTicker();
}

async function queueNewsRefresh() {
  if (fetchInFlight) return fetchInFlight;
  fetchInFlight = fetchNewsText()
    .then((text) => {
      queuedNewsText = text;
    })
    .catch(() => {
      queuedNewsText = "Новости временно недоступны";
    })
    .finally(() => {
      fetchInFlight = null;
    });
  return fetchInFlight;
}

async function loadInitialNews() {
  try {
    activeNewsText = await fetchNewsText();
  } catch (_error) {
    activeNewsText = "Новости временно недоступны";
  }
  startTicker();
  queueNewsRefresh();
}

async function switchToNextNewsCycle() {
  if (switchingCycle) return;
  switchingCycle = true;

  if (queuedNewsText) {
    activeNewsText = queuedNewsText;
    queuedNewsText = "";
  } else {
    try {
      activeNewsText = await fetchNewsText();
    } catch (_error) {
      activeNewsText = "Новости временно недоступны";
    }
  }

  restartTicker();
  switchingCycle = false;
  queueNewsRefresh();
}

refs.track.addEventListener("animationend", switchToNextNewsCycle);

window.addEventListener("resize", () => {
  if (tickerStarted) restartTicker();
});

applyTickerHeight();
loadInitialNews();
setInterval(queueNewsRefresh, Math.max(config.refresh, 10000));
