const params = new URLSearchParams(window.location.search);

const TICKER_SPEEDS = { slow: 60, normal: 100, fast: 130 };
const TICKER_CTA_HOLD_MS = 60000;
const COUNTRY_CODES = {
  Argentina: "ARG",
  Australia: "AUS",
  Austria: "AUT",
  Belgium: "BEL",
  Brazil: "BRA",
  Bulgaria: "BUL",
  Canada: "CAN",
  Chile: "CHI",
  China: "CHN",
  Croatia: "CRO",
  Czechia: "CZE",
  Denmark: "DEN",
  France: "FRA",
  Germany: "GER",
  Greece: "GRE",
  Hungary: "HUN",
  Italy: "ITA",
  Japan: "JPN",
  Kazakhstan: "KAZ",
  Netherlands: "NED",
  Norway: "NOR",
  Poland: "POL",
  Portugal: "POR",
  Romania: "ROU",
  Russia: "RUS",
  Serbia: "SRB",
  Slovakia: "SVK",
  Slovenia: "SLO",
  Spain: "ESP",
  Sweden: "SWE",
  Switzerland: "SUI",
  Ukraine: "UKR",
  USA: "USA",
  "United States": "USA",
  "Great Britain": "GBR",
  World: "---"
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
  source: params.get("source") || "/api/match/flashscore?id=Sril3X2m",
  news: params.get("news") || "/api/news/tennis",
  odds: params.get("odds") || "",
  winline: params.get("winline") || "",
  ticker: params.get("ticker") || params.get("tickerSpeed") || "100",
  poll: Number(params.get("poll") || 3000),
  guides: params.get("guides") === "1",
  stage: params.get("stage") || "",
  homeName: params.get("homeName") || "",
  awayName: params.get("awayName") || "",
  homeCode: params.get("homeCode") || "",
  awayCode: params.get("awayCode") || ""
};

const refs = {
  overlay: document.querySelector("#overlay"),
  statsGrid: document.querySelector("#statsGrid"),
  statHomeCode: document.querySelector("#statHomeCode"),
  statAwayCode: document.querySelector("#statAwayCode"),
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
  homeLiveGames: document.querySelector("#homeLiveGames"),
  awayLiveGames: document.querySelector("#awayLiveGames"),
  homeLivePoints: document.querySelector("#homeLivePoints"),
  awayLivePoints: document.querySelector("#awayLivePoints"),
  homeOdds: document.querySelector("#homeOdds"),
  awayOdds: document.querySelector("#awayOdds"),
  tickerMask: document.querySelector(".ticker-mask"),
  tickerTrack: document.querySelector("#tickerTrack"),
  tickerCta: document.querySelector("#tickerCta")
};

let lastMatchData = null;
let activeNewsItems = ["Загружаем новости..."];
let queuedNewsItems = [];
let tickerStarted = false;
let tickerIndex = 0;
let ctaTimer = null;
let newsFetchInFlight = null;

function asText(value, fallback) {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function fetchJson(url) {
  return fetch(url, { cache: "no-store" }).then((response) => {
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  });
}

function statHtml() {
  return STAT_ROWS.map((row) => (
    `<div class="stat-row-template"><div class="stat-cell" data-stat-home="${row.label.replace(/\\n/g, " ")}"></div><div class="stat-label">${row.label.replace(/\\n/g, "<br>")}</div><div class="stat-cell" data-stat-away="${row.label.replace(/\\n/g, " ")}"></div></div>`
  )).join("");
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-zа-яё0-9]+/gi, " ").trim();
}

function normalizeRu(value) {
  return String(value || "").toLowerCase().replace(/ё/g, "е");
}

function hasCyrillic(value) {
  return /[а-яё]/i.test(String(value || ""));
}

function transliterateWord(word) {
  const source = normalizeRu(word);
  if (!source) return "";

  const digraphs = [
    ["shch", "щ"],
    ["sch", "щ"],
    ["yo", "ё"],
    ["yu", "ю"],
    ["ya", "я"],
    ["ye", "е"],
    ["zh", "ж"],
    ["kh", "х"],
    ["ts", "ц"],
    ["ch", "ч"],
    ["sh", "ш"],
    ["ph", "ф"],
    ["th", "т"]
  ];
  const letters = {
    a: "а",
    b: "б",
    c: "к",
    d: "д",
    e: "е",
    f: "ф",
    g: "г",
    h: "х",
    i: "и",
    j: "дж",
    k: "к",
    l: "л",
    m: "м",
    n: "н",
    o: "о",
    p: "п",
    q: "к",
    r: "р",
    s: "с",
    t: "т",
    u: "у",
    v: "в",
    w: "в",
    x: "кс",
    y: "й",
    z: "з",
    "'": "",
    "’": ""
  };

  let result = source;
  for (const [from, to] of digraphs) {
    result = result.split(from).join(to);
  }

  let out = "";
  for (const char of result) {
    out += letters[char] !== undefined ? letters[char] : char;
  }
  return out.replace(/[^а-яё-]/gi, "");
}

function russianParts(name) {
  const cleaned = String(name || "").replace(/\([^)]*\)/g, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: "", last: "ИГРОК" };
  if (parts.length === 1) return { first: "", last: parts[0] };
  return { first: parts.slice(0, -1).join(" "), last: parts.length ? parts[parts.length - 1] : "" };
}

function firstInitial(firstName) {
  const chunks = String(firstName || "").split("-").filter(Boolean);
  if (!chunks.length) return "";
  return chunks.map((chunk) => chunk[0]).filter(Boolean).join("-");
}

function toRussianDisplayName(name, fallback = "ИГРОК") {
  const { first, last } = russianParts(name);
  const firstRu = hasCyrillic(first) ? first : transliterateWord(first);
  const lastRu = hasCyrillic(last) ? last : transliterateWord(last);
  const lastText = (lastRu || fallback).toUpperCase();
  const initials = firstInitial(firstRu).toUpperCase();
  return initials ? `${initials}. ${lastText}` : lastText;
}

function toRussianCode(name, fallback = "---") {
  const { last } = russianParts(name);
  const lastRu = hasCyrillic(last) ? last : transliterateWord(last);
  const letters = (lastRu || "").replace(/[^а-яё]/gi, "").toUpperCase();
  return letters ? letters.slice(0, 3).padEnd(3, letters.charAt(letters.length - 1) || " ") : fallback;
}

function countryCode(country) {
  return COUNTRY_CODES[country] || String(country || "---").slice(0, 3).toUpperCase();
}

function findStat(stats, sources) {
  for (const source of sources) {
    const wantedSection = normalize(source[0]);
    const wantedLabel = normalize(source[1]);
    const section = (stats || []).find((item) => normalize(item.section) === wantedSection);
    const rows = section && Array.isArray(section.rows) ? section.rows : [];
    const row = rows.find((item) => normalize(item.label) === wantedLabel);
    if (row) return row;
  }
  return { home: "", away: "" };
}

function fillStats(stats) {
  STAT_ROWS.forEach((row, index) => {
    const stat = findStat(stats, row.sources);
    const host = refs.statsGrid.children[index];
    if (!host) return;
    host.children[0].textContent = asText(stat.home, "");
    host.children[2].textContent = asText(stat.away, "");
  });
}

function cleanTournamentName(raw) {
  const value = String(raw || "Tennis");
  const afterColon = value.includes(":") ? value.split(":").slice(1).join(":") : value;
  const beforeStage = afterColon.split(" - ")[0] || afterColon;
  return beforeStage.split("(")[0].split(",")[0].trim() || "TENNIS";
}

function translateStage(stage) {
  const value = normalizeRu(stage);
  if (!value) return "";
  if (/1\/64|128|1st round|first round|1 round/i.test(value)) return "ПЕРВЫЙ КРУГ";
  if (/1\/32|64|2nd round|second round|2 round/i.test(value)) return "ВТОРОЙ КРУГ";
  if (/1\/16|32|3rd round|third round|3 round/i.test(value)) return "ТРЕТИЙ КРУГ";
  if (/1\/8|16|4th round|fourth round|4 round/i.test(value)) return "1/8 ФИНАЛА";
  if (value.includes("quarter")) return "1/4 ФИНАЛА";
  if (value.includes("semi")) return "ПОЛУФИНАЛ";
  if (value.includes("final")) return "ФИНАЛ";
  return String(stage || "").replace(/set \d+/i, "").replace(/\s+/g, " ").trim().toUpperCase();
}

function extractStage(match) {
  const rawTournament = String((match && match.tournament) || "");
  const tournamentParts = rawTournament.split(" - ");
  const fromTournament = rawTournament.includes(" - ")
    ? tournamentParts[tournamentParts.length - 1]
    : "";
  const fallback = (match && match.stage) || "";
  return translateStage(fromTournament || fallback);
}

function formatTournament(match) {
  const tournament = cleanTournamentName(match && match.tournament);
  const gender = /WTA|WOMEN|ЖЕН/i.test(String((match && match.tournament) || "")) ? "ЖЕНЩИНЫ" : "МУЖЧИНЫ";
  const stage = (config.stage || extractStage(match) || "МАТЧ").toUpperCase();
  return `${tournament.toUpperCase()} | ${gender} | ${stage}`;
}

function setWinner(set) {
  if (set && (set.winner === "home" || set.winner === "away")) return set.winner;
  const home = Number(set && set.homeGames);
  const away = Number(set && set.awayGames);
  if (!Number.isFinite(home) || !Number.isFinite(away) || home === away) return "";
  return home > away ? "home" : "away";
}

function renderSets(data) {
  const sets = (data && data.score && Array.isArray(data.score.sets)) ? data.score.sets : [];
  for (let i = 0; i < 5; i += 1) {
    const set = sets[i] || {};
    const home = document.querySelector(`#homeSet${i + 1}`);
    const away = document.querySelector(`#awaySet${i + 1}`);
    home.textContent = asText(set.homeGames, "");
    away.textContent = asText(set.awayGames, "");

    home.classList.remove("tie-break", "winner");
    away.classList.remove("tie-break", "winner");

    const tieBreak = Boolean(set.tieBreak) || (String(set.homeGames) === "6" && String(set.awayGames) === "6");
    if (tieBreak) {
      home.classList.add("tie-break");
      away.classList.add("tie-break");
      continue;
    }

    const winner = setWinner(set);
    if (winner === "home") home.classList.add("winner");
    if (winner === "away") away.classList.add("winner");
  }
}

function formatPoint(value) {
  const point = String(value || "").trim().toUpperCase();
  return point || "-";
}

function renderPlayer(side, player) {
  const isHome = side === "home";
  const row = isHome ? refs.scoreHome : refs.scoreAway;
  const photo = isHome ? refs.homePhoto : refs.awayPhoto;
  const country = isHome ? refs.homeCountry : refs.awayCountry;
  const scoreName = isHome ? refs.homeScoreName : refs.awayScoreName;
  const forcedName = isHome ? config.homeName : config.awayName;

  country.textContent = countryCode(player.country);
  scoreName.textContent = toRussianDisplayName(forcedName || player.name || player.shortName);
  photo.src = player.image || "";
  photo.alt = player.name || "";
  row.classList.toggle("serving", Boolean(player.isServing));
}

function renderMatch(data) {
  lastMatchData = data;
  const players = data && Array.isArray(data.players) ? data.players : [];
  const home = players.find((player) => player.side === "home") || players[0] || {};
  const away = players.find((player) => player.side === "away") || players[1] || {};

  refs.statHomeCode.textContent = (config.homeCode || toRussianCode(config.homeName || home.name || home.shortName)).toUpperCase();
  refs.statAwayCode.textContent = (config.awayCode || toRussianCode(config.awayName || away.name || away.shortName)).toUpperCase();
  refs.scoreTournament.textContent = formatTournament(data.match);

  const match = data && data.match ? data.match : {};
  const duration = match.duration || "";
  refs.scoreClock.textContent = match.status === "live" && duration
    ? `ВРЕМЯ МАТЧА | ${duration}`
    : "СКОРО";

  const score = data && data.score ? data.score : {};
  const games = score.games || {};
  const current = score.current || {};
  refs.homeLiveGames.textContent = asText(games.home, "-");
  refs.awayLiveGames.textContent = asText(games.away, "-");
  refs.homeLivePoints.textContent = formatPoint(current.home);
  refs.awayLivePoints.textContent = formatPoint(current.away);

  renderPlayer("home", home);
  renderPlayer("away", away);
  renderSets(data);
  fillStats((data && data.statistics) || []);
}

function tickerSpeed() {
  const configured = TICKER_SPEEDS[config.ticker];
  if (Number.isFinite(configured)) return configured;
  const numeric = Number(config.ticker);
  return Number.isFinite(numeric) && numeric > 0 ? Math.min(Math.max(numeric, 12), 220) : 100;
}

function showTickerCta() {
  refs.tickerTrack.style.animation = "none";
  refs.tickerTrack.textContent = "";
  refs.tickerCta.hidden = false;
}

function hideTickerCta() {
  refs.tickerCta.hidden = true;
}

function restartTicker(text) {
  hideTickerCta();
  refs.tickerTrack.style.animation = "none";
  refs.tickerTrack.textContent = text;
  const maskWidth = refs.tickerMask.clientWidth || 1770;
  refs.tickerTrack.style.setProperty("--ticker-start", `${maskWidth}px`);
  const distance = maskWidth + (refs.tickerTrack.scrollWidth || 1200);
  const duration = Math.max(12, Math.round(distance / tickerSpeed()));
  refs.tickerTrack.style.setProperty("--ticker-duration", `${duration}s`);
  void refs.tickerTrack.offsetWidth;
  refs.tickerTrack.style.animation = "ticker-scroll var(--ticker-duration) linear 1";
}

function tickerItemsFromPayload(payload) {
  const list = Array.isArray(payload) ? payload : payload.items || [];
  const items = list.map((item) => (typeof item === "string" ? item : item.title)).filter(Boolean).slice(0, 15);
  return items.length ? items : ["Новости временно недоступны"];
}

function beginNewsCycle() {
  tickerIndex = 0;
  restartTicker(activeNewsItems[tickerIndex] || "Новости временно недоступны");
}

function ensureTickerStarted() {
  if (tickerStarted) return;
  tickerStarted = true;
  beginNewsCycle();
}

function queueNews(items) {
  queuedNewsItems = items.slice();
  if (!tickerStarted) {
    activeNewsItems = queuedNewsItems.length ? queuedNewsItems.slice() : ["Новости временно недоступны"];
    queuedNewsItems = [];
    ensureTickerStarted();
  }
}

async function queueNewsRefresh() {
  if (newsFetchInFlight) return newsFetchInFlight;
  newsFetchInFlight = fetchJson(config.news)
    .then((payload) => {
      queueNews(tickerItemsFromPayload(payload));
    })
    .catch(() => {
      queueNews(["Новости временно недоступны"]);
    })
    .finally(() => {
      newsFetchInFlight = null;
    });
  return newsFetchInFlight;
}

async function switchCycleAfterCta() {
  if (queuedNewsItems.length) {
    activeNewsItems = queuedNewsItems.slice();
    queuedNewsItems = [];
  }
  beginNewsCycle();
  queueNewsRefresh();
}

function holdCta() {
  showTickerCta();
  if (ctaTimer) clearTimeout(ctaTimer);
  ctaTimer = setTimeout(() => {
    ctaTimer = null;
    switchCycleAfterCta();
  }, TICKER_CTA_HOLD_MS);
}

function handleTickerEnd() {
  if (ctaTimer) return;
  if (tickerIndex < activeNewsItems.length - 1) {
    tickerIndex += 1;
    restartTicker(activeNewsItems[tickerIndex] || "Новости временно недоступны");
    return;
  }
  holdCta();
}

function oddsUrl() {
  if (config.odds) return config.odds;
  const players = lastMatchData && Array.isArray(lastMatchData.players) ? lastMatchData.players : [];
  const homePlayer = players.find((player) => player.side === "home") || {};
  const awayPlayer = players.find((player) => player.side === "away") || {};
  const home = homePlayer.name || "";
  const away = awayPlayer.name || "";
  const url = new URL("/api/odds/winline", window.location.origin);
  url.searchParams.set("home", home);
  url.searchParams.set("away", away);
  if (config.winline) url.searchParams.set("matchUrl", config.winline);
  if (lastMatchData && lastMatchData.source && lastMatchData.source.eventId) {
    url.searchParams.set("eventId", lastMatchData.source.eventId);
  }
  return `${url.pathname}${url.search}`;
}

function renderOdds(payload) {
  const odds = payload && payload.odds ? payload.odds : {};
  refs.homeOdds.textContent = odds.home || "--";
  refs.awayOdds.textContent = odds.away || "--";
}

async function refreshMatch() {
  try {
    renderMatch(await fetchJson(config.source));
  } catch (_error) {
    refs.scoreClock.textContent = "ОШИБКА ДАННЫХ";
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
refs.tickerTrack.addEventListener("animationend", handleTickerEnd);
window.addEventListener("resize", () => {
  if (!tickerStarted) return;
  if (ctaTimer) return;
  restartTicker(activeNewsItems[tickerIndex] || "Новости временно недоступны");
});

refreshMatch().then(refreshOdds);
queueNewsRefresh();
setInterval(refreshMatch, Math.max(config.poll, 1000));
setInterval(queueNewsRefresh, 60000);
setInterval(refreshOdds, 60000);
