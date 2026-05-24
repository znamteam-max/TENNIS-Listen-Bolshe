const params = new URLSearchParams(window.location.search);
const DEFAULT_CTA = "смотрите прямую трансляцию на Больше! в ВК, ссылка в описании";
const TICKER_SPEEDS = { slow: 26, normal: 36, fast: 52 };

const config = {
  news: params.get("news") || "/api/news/tennis",
  ticker: params.get("ticker") || params.get("speed") || "slow",
  refresh: Number(params.get("refresh") || 60000),
  cta: params.get("cta") || DEFAULT_CTA
};

const refs = {
  mask: document.querySelector(".ticker-mask"),
  track: document.querySelector("#tickerTrack")
};

let newsTickerText = "Загружаем новости...";
let tickerMode = "news";
let tickerStarted = false;

function tickerSpeed() {
  const configured = TICKER_SPEEDS[config.ticker];
  if (Number.isFinite(configured)) return configured;
  const numeric = Number(config.ticker);
  return Number.isFinite(numeric) && numeric > 0 ? Math.min(Math.max(numeric, 12), 90) : TICKER_SPEEDS.slow;
}

function tickerText() {
  return tickerMode === "cta" ? config.cta : newsTickerText;
}

function restartTicker() {
  refs.track.style.animation = "none";
  refs.track.textContent = tickerText();
  const maskWidth = refs.mask.clientWidth || 1808;
  refs.track.style.setProperty("--ticker-start", maskWidth + "px");
  const distance = maskWidth + (refs.track.scrollWidth || 1200);
  const duration = Math.max(28, Math.round(distance / tickerSpeed()));
  refs.track.style.setProperty("--ticker-duration", duration + "s");
  void refs.track.offsetWidth;
  refs.track.style.animation = "ticker-scroll var(--ticker-duration) linear 1";
}

function ensureTickerStarted() {
  if (tickerStarted) return;
  tickerStarted = true;
  tickerMode = "news";
  restartTicker();
}

function renderNews(payload) {
  const list = Array.isArray(payload) ? payload : payload.items || [];
  newsTickerText = list.map((item) => item.title || item).filter(Boolean).join("   •   ") || "Новости временно недоступны";
  if (tickerMode === "news") restartTicker();
  ensureTickerStarted();
}

async function refreshNews() {
  try {
    const response = await fetch(config.news, { cache: "no-store" });
    if (!response.ok) throw new Error(response.status + " " + response.statusText);
    renderNews(await response.json());
  } catch (_error) {
    newsTickerText = "Новости временно недоступны";
    if (tickerMode === "news") restartTicker();
    ensureTickerStarted();
  }
}

refs.track.addEventListener("animationend", () => {
  tickerMode = tickerMode === "news" ? "cta" : "news";
  restartTicker();
});

window.addEventListener("resize", () => {
  if (tickerStarted) restartTicker();
});

refreshNews();
setInterval(refreshNews, Math.max(config.refresh, 10000));
