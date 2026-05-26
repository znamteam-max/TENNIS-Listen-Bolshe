const params = new URLSearchParams(window.location.search);
const TICKER_SPEEDS = { slow: 26, normal: 36, fast: 52 };

const config = {
  news: params.get("news") || "/api/news/tennis",
  ticker: params.get("ticker") || params.get("speed") || "slow",
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

function tickerSpeed() {
  const configured = TICKER_SPEEDS[config.ticker];
  if (Number.isFinite(configured)) return configured;
  const numeric = Number(config.ticker);
  return Number.isFinite(numeric) && numeric > 0 ? Math.min(Math.max(numeric, 12), 90) : TICKER_SPEEDS.slow;
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

loadInitialNews();
setInterval(queueNewsRefresh, Math.max(config.refresh, 10000));
