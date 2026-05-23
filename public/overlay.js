
const params = new URLSearchParams(window.location.search);
const TICKER_CTA = "смотрите прямую трансляцию на Больше! в ВК, ссылка в описании";
const TICKER_SPEEDS = { slow: 26, normal: 36, fast: 52 };
const COUNTRY_CODES = {
  Argentina: "ARG", Australia: "AUS", Austria: "AUT", Belgium: "BEL", Brazil: "BRA", Bulgaria: "BUL", Canada: "CAN", Chile: "CHI", China: "CHN", Croatia: "CRO", Czechia: "CZE", Denmark: "DEN", France: "FRA", Germany: "GER", Greece: "GRE", Hungary: "HUN", Italy: "ITA", Japan: "JPN", Kazakhstan: "KAZ", Netherlands: "NED", Norway: "NOR", Poland: "POL", Portugal: "POR", Romania: "ROU", Russia: "RUS", Serbia: "SRB", Slovakia: "SVK", Slovenia: "SLO", Spain: "ESP", Sweden: "SWE", Switzerland: "SUI", Ukraine: "UKR", USA: "USA", "United States": "USA", "Great Britain": "GBR"
};
const STAT_ROWS = [
  { label: "ЭЙСЫ", sources: [["Service", "Aces"]] },
  { label: "ДВОЙНЫЕ\\nОШИБКИ", sources: [["Service", "Double Faults"]] },
  { label: "% ПЕРВОЙ\\nПОДАЧИ", sources: [["Service", "1st serve percentage"]] },
  { label: "ОЧКИ НА\\nПЕРВОЙ ПОДАЧЕ", sources: [["Service", "1st serve points won"]] },
  { label: "ОЧКИ НА\\nВТОРОЙ ПОДАЧЕ", sources: [["Service", "2nd serve points won"]] },
  { label: "БРЕЙК-ПОИНТЫ", sources: [["Return", "Break Points Converted"], ["Service", "Break Points Saved"]] },
  { label: "РОЗЫГРЫШИ\\nПОД ДАВЛЕНИЕМ", sources: [["Points", "Last 10 balls"], ["Points", "Total Points Won"]] }
];
const config = {
  source: params.get("source") || "/api/match/flashscore?id=${DEFAULT_MATCH_ID}",
  news: params.get("news") || "/api/news/tennis",
  odds: params.get("odds") || "",
  ticker: params.get("ticker") || params.get("tickerSpeed") || "slow",
  poll: Number(params.get("poll") || 3000),
  guides: params.get("guides") === "1"
};
const refs = {
  overlay: document.querySelector("#overlay"),
  statsGrid: document.querySelector("#statsGrid"),
  statHomeCode: document.querySelector("#statHomeCode"),
  statAwayCode: document.querySelector("#statAwayCode"),
  statTime: document.querySelector("#statTime"),
  scoreTournament: document.querySelector("#scoreTournament"),
  scoreClock: document.querySelector("#scoreClock"),
  scoreHome: document.querySelector("#scoreHome"),
  scoreAway: document.querySelector("#scoreAway"),
  homeCountry: document.querySelector("#homeCountry"),
  awayCountry: document.querySelector("#awayCountry"),
  homePhoto: document.querySelector("#homePhoto"),
  awayPhoto: document.querySelector("#awayPhoto"),
  homeScoreName: document.querySelector("#homeScoreName"),
  awayScoreName: document.querySelector("#awayScoreName"),
  homeOdds: document.querySelector("#homeOdds"),
  awayOdds: document.querySelector("#awayOdds"),
  tickerMask: document.querySelector(".ticker-mask"),
  tickerTrack: document.querySelector("#tickerTrack")
};
let lastMatchData = null;
let newsTickerText = "Загружаем новости...";
let tickerMode = "news";
let tickerStarted = false;

function asText(value, fallback) {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function fetchJson(url) {
  return fetch(url, { cache: "no-store" }).then(function(response) {
    if (!response.ok) throw new Error(response.status + " " + response.statusText);
    return response.json();
  });
}

function statHtml() {
  return STAT_ROWS.map(function(row) {
    return '<div class="stat-row-template"><div class="stat-cell" data-stat-home="' + row.label.replace(/\\n/g, " ") + '"></div><div class="stat-label">' + row.label.replace(/\\n/g, "<br>") + '</div><div class="stat-cell" data-stat-away="' + row.label.replace(/\\n/g, " ") + '"></div></div>';
  }).join("");
}

function codeFromName(name) {
  const cleaned = String(name || "").replace(/\\([^)]*\\)/g, "").trim();
  const last = cleaned.split(/\\s+/).filter(Boolean).pop() || cleaned;
  return last.slice(0, 3).toUpperCase();
}

function countryCode(country) {
  return COUNTRY_CODES[country] || String(country || "---").slice(0, 3).toUpperCase();
}

function surname(name) {
  const parts = String(name || "").trim().split(/\\s+/).filter(Boolean);
  return (parts.pop() || name || "ИГРОК").toUpperCase();
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-zа-яё0-9]+/gi, " ").trim();
}

function findStat(stats, sources) {
  for (const source of sources) {
    const wantedSection = normalize(source[0]);
    const wantedLabel = normalize(source[1]);
    const section = (stats || []).find(function(item) { return normalize(item.section) === wantedSection; });
    const row = section?.rows?.find(function(item) { return normalize(item.label) === wantedLabel; });
    if (row) return row;
  }
  return { home: "", away: "" };
}

function fillStats(stats) {
  STAT_ROWS.forEach(function(row, index) {
    const stat = findStat(stats, row.sources);
    const host = refs.statsGrid.children[index];
    if (!host) return;
    host.children[0].textContent = asText(stat.home, "");
    host.children[2].textContent = asText(stat.away, "");
  });
}

function formatTournament(match) {
  const raw = String(match?.tournament || match?.stage || "Live tennis");
  const afterColon = raw.includes(":") ? raw.split(":").slice(1).join(":") : raw;
  const city = afterColon.split("(")[0].split("-")[0].replace(/,/g, "").trim() || "ТЕННИС";
  const gender = /WTA|WOMEN|ЖЕН/i.test(raw) ? "ЖЕНЩИНЫ" : "МУЖЧИНЫ";
  const stageRaw = afterColon.split("-").pop()?.trim() || match?.stage || "";
  const stage = translateStage(stageRaw);
  return (city + " | " + gender + (stage ? " " + stage : "")).toUpperCase();
}

function translateStage(stage) {
  const value = String(stage || "").toLowerCase();
  if (value.includes("final")) return "ФИНАЛ";
  if (value.includes("semi")) return "ПОЛУФИНАЛ";
  if (value.includes("quarter")) return "ЧЕТВЕРТЬФИНАЛ";
  if (value.includes("round") || value.includes("1/")) return "ПЕРВЫЙ КРУГ";
  return String(stage || "").replace(/set \\d+/i, "").trim().toUpperCase();
}

function renderSets(data) {
  const sets = data.score?.sets || [];
  for (let i = 0; i < 5; i++) {
    const set = sets[i] || {};
    const home = document.querySelector("#homeSet" + (i + 1));
    const away = document.querySelector("#awaySet" + (i + 1));
    home.textContent = asText(set.homeGames, "");
    away.textContent = asText(set.awayGames, "");
    const tieBreak = Boolean(set.tieBreak) || (String(set.homeGames) === "6" && String(set.awayGames) === "6");
    home.classList.toggle("tie-break", tieBreak);
    away.classList.toggle("tie-break", tieBreak);
  }
}

function renderPlayer(side, player) {
  const home = side === "home";
  const row = home ? refs.scoreHome : refs.scoreAway;
  const photo = home ? refs.homePhoto : refs.awayPhoto;
  const country = home ? refs.homeCountry : refs.awayCountry;
  const scoreName = home ? refs.homeScoreName : refs.awayScoreName;
  country.textContent = countryCode(player.country);
  scoreName.textContent = surname(player.name || player.shortName);
  photo.src = player.image || "";
  photo.alt = player.name || "";
  row.classList.toggle("serving", Boolean(player.isServing));
}

function renderMatch(data) {
  lastMatchData = data;
  const home = data.players?.find(function(player) { return player.side === "home"; }) || data.players?.[0] || {};
  const away = data.players?.find(function(player) { return player.side === "away"; }) || data.players?.[1] || {};
  refs.statHomeCode.textContent = codeFromName(home.name || home.shortName);
  refs.statAwayCode.textContent = codeFromName(away.name || away.shortName);
  refs.scoreTournament.textContent = formatTournament(data.match);
  const duration = data.match?.duration || "";
  refs.scoreClock.textContent = data.match?.status === "live" && duration ? duration : "СКОРО";
  refs.statTime.textContent = duration ? "ВРЕМЯ МАТЧА " + duration : "ВРЕМЯ МАТЧА --:--";
  renderPlayer("home", home);
  renderPlayer("away", away);
  renderSets(data);
  fillStats(data.statistics || []);
}

function tickerSpeed() {
  const configured = TICKER_SPEEDS[config.ticker];
  if (Number.isFinite(configured)) return configured;
  const numeric = Number(config.ticker);
  return Number.isFinite(numeric) && numeric > 0 ? Math.min(Math.max(numeric, 12), 90) : TICKER_SPEEDS.slow;
}

function tickerText() {
  return tickerMode === "cta" ? TICKER_CTA : newsTickerText;
}

function restartTicker() {
  refs.tickerTrack.style.animation = "none";
  refs.tickerTrack.textContent = tickerText();
  const maskWidth = refs.tickerMask.clientWidth || 1808;
  refs.tickerTrack.style.setProperty("--ticker-start", maskWidth + "px");
  const distance = maskWidth + (refs.tickerTrack.scrollWidth || 1200);
  const duration = Math.max(26, Math.round(distance / tickerSpeed()));
  refs.tickerTrack.style.setProperty("--ticker-duration", duration + "s");
  void refs.tickerTrack.offsetWidth;
  refs.tickerTrack.style.animation = "ticker var(--ticker-duration) linear 1";
}

function ensureTickerStarted() {
  if (tickerStarted) return;
  tickerStarted = true;
  tickerMode = "news";
  restartTicker();
}

function renderNews(payload) {
  const list = Array.isArray(payload) ? payload : payload.items || [];
  newsTickerText = list.map(function(item) { return item.title || item; }).filter(Boolean).join("   •   ") || "Новости временно недоступны";
  if (tickerMode === "news") restartTicker();
  ensureTickerStarted();
}

function oddsUrl() {
  if (config.odds) return config.odds;
  const home = lastMatchData?.players?.find(function(player) { return player.side === "home"; })?.name || "";
  const away = lastMatchData?.players?.find(function(player) { return player.side === "away"; })?.name || "";
  return "/api/odds/winline?home=" + encodeURIComponent(home) + "&away=" + encodeURIComponent(away);
}

function renderOdds(payload) {
  refs.homeOdds.textContent = payload?.odds?.home || "--";
  refs.awayOdds.textContent = payload?.odds?.away || "--";
}

async function refreshMatch() {
  try {
    renderMatch(await fetchJson(config.source));
  } catch (error) {
    refs.statTime.textContent = "ОШИБКА ДАННЫХ";
  }
}

async function refreshNews() {
  try {
    renderNews(await fetchJson(config.news));
  } catch (_error) {
    newsTickerText = "Новости временно недоступны";
    if (tickerMode === "news") restartTicker();
    ensureTickerStarted();
  }
}

async function refreshOdds() {
  try {
    renderOdds(await fetchJson(oddsUrl()));
  } catch (_error) {
    renderOdds({ odds: { home: null, away: null } });
  }
}

refs.statsGrid.innerHTML = statHtml();
refs.overlay.classList.toggle("guides", config.guides);
refs.tickerTrack.addEventListener("animationend", function() {
  tickerMode = tickerMode === "news" ? "cta" : "news";
  restartTicker();
});
window.addEventListener("resize", function() {
  if (tickerStarted) restartTicker();
});

refreshMatch().then(refreshOdds);
refreshNews();
setInterval(refreshMatch, Math.max(config.poll, 1000));
setInterval(refreshNews, 60000);
setInterval(refreshOdds, 60000);
