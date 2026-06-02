const PROJECT_ID = "2";
const FEED_SIGN = "SW9D1eZo";
const DEFAULT_BASE = "https://www.flashscore.com";
const DEFAULT_LANG = "ru";
const SPORTS_TENNIS_NEWS_URL = "https://www.sports.ru/tennis/news/top/";
const DEFAULT_MATCH_ID = "Sril3X2m";
const DEFAULT_MATCH_URL =
  "https://www.flashscore.com/match/tennis/jasika-omar-lOWZLw6o/stewart-hamish-0j2A0w2n/?mid=Sril3X2m";
const BUILD_VERSION = "winline-sidecar-unified-v1-2026-06-01";
const TELEGRAM_WEBHOOK_PATH = "/telegram/webhook";
const NEWS_TICKER_PATH = "/news-ticker.html";
const NEWS_TICKER_FLEX_PATH = "/news-ticker-flex.html";
const STATIC_ASSET_BASE_URL = "https://raw.githubusercontent.com/znamteam-max/TENNIS-Listen-Bolshe/main/cloudflare/overlay-worker/public";
const NEWS_TICKER_BG_URL = `${STATIC_ASSET_BASE_URL}/news-ticker-bg.png`;
const NEWS_TICKER_BG_SMALL_URL = `${STATIC_ASSET_BASE_URL}/news-ticker-bg-small.png`;
const NEWS_TICKER_LOGO_URL = `${STATIC_ASSET_BASE_URL}/news-ticker-logo.png`;
const PROMO_TOP_LEFT_JPG_URL = `${STATIC_ASSET_BASE_URL}/promo-top-left.jpg`;
const NEWS_LIMIT = 15;
const NEWS_CANDIDATE_LIMIT = 60;
const NEWS_SOURCE_PAGES = 2;
const UPCOMING_MATCH_WINDOW_SECONDS = 3 * 60 * 60;
const UPCOMING_MATCH_LOOKBACK_SECONDS = 15 * 60;
const BOT_DISPLAY_TZ = "Europe/Moscow";
const NEWS_CTA = "СМОТРИ ПРЯМУЮ ТРАНСЛЯЦИЮ МАТЧА ПО ССЫЛКЕ";
const NEWS_SAFE_HARD_PATTERNS = [
  { reason: "ukraine", pattern: /украин|україн|ukrain/i },
  { reason: "belarus", pattern: /беларус|белорус|belarus/i },
  { reason: "sanctions", pattern: /санкц|отстран|бан\b|забан|исключен|исключили/i },
  { reason: "politics", pattern: /политик|политичес|запад|мок\b|ioc\b|минспорт|дегтяр|(^|[^а-яa-z])путин([^а-яa-z]|$)/i },
  { reason: "symbols", pattern: /флаг|гимн|нейтральн/i },
  { reason: "war", pattern: /войн|бомбард|перестрел|обстрел/i },
  { reason: "ukraine-handshake", pattern: /олейников[а-я\s-]+путинцев|путинцев[а-я\s-]+олейников/i },
  { reason: "nationality-conflict", pattern: /национальн|религи|цвет кожи|нацист|рукопожат|санкт[\s-]*петербург/i },
  { reason: "lgbt", pattern: /лгбт|lgbt|трансгендер|гендер/i }
];
const NEWS_COUNTRY_CONTEXT_PATTERN = /росси|russia|беларус|белорус|belarus/i;
const NEWS_POLITICAL_CONTEXT_PATTERN = /санкц|отстран|допуск|нейтральн|флаг|гимн|мок\b|ioc\b|запад|политик|министр|минспорт|дегтяр|путин|войн|бомбард|перестрел|национальн|религи|гражданств|уимблдон|wimbledon/i;

const PROGRAM_LABELS = {
  obs: "OBS",
  streamlabs: "Streamlabs",
  vmix: "vMix"
};

const TICKER_SPEEDS = {
  slow: { label: "Медленно", pixelsPerSecond: 60 },
  normal: { label: "Средне", pixelsPerSecond: 100 },
  fast: { label: "Быстрее", pixelsPerSecond: 130 }
};

const TICKER_SIZES = {
  normal: { label: "Нормальный", param: "normal" },
  small: { label: "Маленький", param: "small" }
};

const STAGES = {
  "1": "Scheduled",
  "2": "Live",
  "3": "Finished",
  "17": "Set 1",
  "18": "Set 2",
  "19": "Set 3",
  "20": "Set 4",
  "21": "Set 5",
  "42": "Awaiting updates",
  "45": "To finish"
};

const overlayCustomBySession = new Map();
const pendingEditByReply = new Map();
const flowMessageByChat = new Map();
const oddsStateByMatchId = new Map();
const oddsActiveByMatchIdFallback = new Map();
const oddsRefreshByMatchId = new Map();
const pendingWinlineCandidatesByToken = new Map();
const ODDS_KV_PREFIX = "odds-state:";
const ODDS_ACTIVE_KV_KEY = "odds:active";

const BOT_MODES = new Set(["stats", "ticker"]);
const STATS_DELAY_STEP_SECONDS = 5;
const STATS_DELAY_MAX_SECONDS = 300;
const WINLINE_POLL_INTERVAL_MS_DEFAULT = 7000;
const WINLINE_STALE_AFTER_MS_DEFAULT = 60000;
const WINLINE_REQUEST_TIMEOUT_MS_DEFAULT = 8000;
const WINLINE_AUTODISCOVER_CONFIDENCE = 0.92;
const WINLINE_KNOWN_BAD_ODDS = { player1: 16.23, player2: 91.93 };
const WINLINE_MARKET_POSITIVE_PATTERNS = [
  "\u0438\u0441\u0445\u043e\u0434 12 \u043c\u0430\u0442\u0447",
  "\u0438\u0441\u0445\u043e\u0434 12",
  "\u0438\u0441\u0445\u043e\u0434 \u043c\u0430\u0442\u0447\u0430",
  "\u0438\u0441\u0445\u043e\u0434",
  "\u043f\u043e\u0431\u0435\u0434\u0438\u0442\u0435\u043b\u044c \u043c\u0430\u0442\u0447\u0430",
  "\u043f\u043e\u0431\u0435\u0434\u0438\u0442\u0435\u043b\u044c",
  "\u043f\u043e\u0431\u0435\u0434\u0430 \u0432 \u043c\u0430\u0442\u0447\u0435",
  "\u043e\u0441\u043d\u043e\u0432\u043d\u043e\u0439 \u0438\u0441\u0445\u043e\u0434",
  "1x2",
  "match winner",
  "winner"
];
const WINLINE_MARKET_BANNED_PATTERNS = [
  "\u0441\u0435\u0442",
  "\u0433\u0435\u0439\u043c",
  "\u043e\u0447\u043a\u043e",
  "\u0442\u0430\u0439",
  "\u0442\u0430\u0439 \u0431\u0440\u0435\u0439\u043a",
  "\u0444\u043e\u0440\u0430",
  "\u0442\u043e\u0442\u0430\u043b",
  "\u0442\u043e\u0447\u043d\u044b\u0439",
  "\u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0439",
  "\u0431\u0440\u0435\u0439\u043a",
  "set",
  "game",
  "point",
  "tie break",
  "handicap",
  "total",
  "next",
  "break"
];
const WINLINE_OUTCOME_HOME_MARKERS = ["1", "p1", "home", "first", "team1", "player1", "\u043f1", "\u043f\u0435\u0440\u0432\u044b\u0439"];
const WINLINE_OUTCOME_AWAY_MARKERS = ["2", "p2", "away", "second", "team2", "player2", "\u043f2", "\u0432\u0442\u043e\u0440\u043e\u0439"];

function modeLabel(mode) {
  if (mode === "ticker") return "Бегущая строка";
  return "Статистика матча";
}

function tickerSizeKey(value) {
  return TICKER_SIZES[value] ? value : "normal";
}

function statsDelaySeconds(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const rounded = Math.round(numeric);
  if (rounded <= 0) return 0;
  return Math.min(rounded, STATS_DELAY_MAX_SECONDS);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/overlay.html") return html(OVERLAY_HTML);
    if (url.pathname === NEWS_TICKER_PATH || url.pathname === "/ticker.html") return html(NEWS_TICKER_HTML);
    if (url.pathname === NEWS_TICKER_FLEX_PATH) return html(NEWS_TICKER_FLEX_HTML);
    if (url.pathname === "/overlay.css") return text(overlayCss(), "text/css; charset=utf-8");
    if (url.pathname === "/overlay.js") return text(OVERLAY_JS, "text/javascript; charset=utf-8");
    if (url.pathname === "/news-ticker.css") return text(newsTickerCss(), "text/css; charset=utf-8");
    if (url.pathname === "/news-ticker.js") return text(NEWS_TICKER_JS, "text/javascript; charset=utf-8");
    if (url.pathname === "/news-ticker-bg.png") return assetRedirect(NEWS_TICKER_BG_URL);
    if (url.pathname === "/news-ticker-bg-small.png") return assetRedirect(NEWS_TICKER_BG_SMALL_URL);
    if (url.pathname === "/news-ticker-logo.png") return assetRedirect(NEWS_TICKER_LOGO_URL);
    if (url.pathname === "/assets/promo-top-left.jpg" || url.pathname === "/promo-top-left.jpg") return assetRedirect(PROMO_TOP_LEFT_JPG_URL);
    if (url.pathname === "/api/health") return json({ ok: true, service: "tennis-listen-bolshe-overlay", buildVersion: BUILD_VERSION });
    if (url.pathname === "/api/news/tennis") {
      try {
        return json(await sportsTennisNews(env), 200, { "cache-control": "public, max-age=120" });
      } catch (error) {
        return json(fallbackNews(error), 200, { "cache-control": "public, max-age=30" });
      }
    }
    if (url.pathname === "/api/odds/current" && request.method === "GET") {
      try {
        return json(await currentOdds(url, env), 200, { "cache-control": "no-store" });
      } catch (error) {
        return json({
          ok: false,
          error: error?.message || String(error),
          matchId: String(url.searchParams.get("matchId") || "").trim() || null
        }, 500, { "cache-control": "no-store" });
      }
    }
    if (url.pathname === "/api/odds/debug" && request.method === "GET") {
      try {
        return json(await oddsDebug(url, env), 200, { "cache-control": "no-store" });
      } catch (error) {
        return json({ ok: false, error: error?.message || String(error) }, 400, { "cache-control": "no-store" });
      }
    }
    if (url.pathname === "/api/odds/probe" && request.method === "GET") {
      try {
        return json(await oddsProbe(url), 200, { "cache-control": "no-store" });
      } catch (error) {
        return json({ ok: false, error: error?.message || String(error) }, 400, { "cache-control": "no-store" });
      }
    }
    if (url.pathname === "/api/odds/manual" && request.method === "POST") {
      try {
        return json(await setManualOddsFromApi(request, env), 200, { "cache-control": "no-store" });
      } catch (error) {
        return json({ ok: false, error: error?.message || String(error) }, 400, { "cache-control": "no-store" });
      }
    }
    if (url.pathname === "/api/odds/winline/link" && request.method === "POST") {
      try {
        return json(await linkWinlineOddsFromApi(request, env), 200, { "cache-control": "no-store" });
      } catch (error) {
        return json({ ok: false, error: error?.message || String(error) }, 400, { "cache-control": "no-store" });
      }
    }
    if (url.pathname === "/api/odds/winline/disable" && request.method === "POST") {
      try {
        return json(await disableWinlineOddsFromApi(request, env), 200, { "cache-control": "no-store" });
      } catch (error) {
        return json({ ok: false, error: error?.message || String(error) }, 400, { "cache-control": "no-store" });
      }
    }
    if (url.pathname === "/api/odds/reset" && request.method === "POST") {
      try {
        return json(await resetOddsFromApi(request, env), 200, { "cache-control": "no-store" });
      } catch (error) {
        return json({ ok: false, error: error?.message || String(error) }, 400, { "cache-control": "no-store" });
      }
    }
    if (url.pathname === "/api/odds/push" && request.method === "POST") {
      try {
        return json(await pushOddsFromSidecar(request, env), 200, { "cache-control": "no-store" });
      } catch (error) {
        const message = error?.message || String(error);
        const status = message === "forbidden" ? 401 : 403;
        return json({ ok: false, error: message }, status, { "cache-control": "no-store" });
      }
    }
    if (url.pathname === "/api/odds/active" && request.method === "GET") {
      try {
        return json(await getActiveOddsFromApi(request, env), 200, { "cache-control": "no-store" });
      } catch (error) {
        const message = error?.message || String(error);
        const status = message === "forbidden" ? 401 : 403;
        return json({ ok: false, error: message }, status, { "cache-control": "no-store" });
      }
    }
    if (url.pathname === "/api/odds/winline") {
      try {
        return json(await winlineOdds(url, env), 200, { "cache-control": "public, max-age=60" });
      } catch (error) {
        return json({ ok: false, provider: "winline", error: error?.message || String(error), odds: { home: null, away: null } }, 200, { "cache-control": "public, max-age=30" });
      }
    }
    if (url.pathname === "/api/matches") return json(matches(url.origin));
    if (url.pathname === "/api/live-matches") {
      try {
        return json({ ok: true, items: await liveMatches(env) }, 200, { "cache-control": "public, max-age=5" });
      } catch (error) {
        return json({ ok: false, error: error?.message || String(error) }, 502);
      }
    }
    if (url.pathname === "/telegram/health") {
      return json({
        ok: true,
        botConfigured: Boolean(env.TELEGRAM_BOT_TOKEN),
        webhookPath: TELEGRAM_WEBHOOK_PATH
      });
    }
    if (url.pathname === TELEGRAM_WEBHOOK_PATH && request.method === "POST") {
      return telegramWebhook(request, env, url.origin);
    }
    if (url.pathname === "/api/match/flashscore") {
      try {
        return json(await flashscoreMatch(url, env), 200, { "cache-control": "public, max-age=2" });
      } catch (error) {
        return json({ ok: false, error: error?.message || String(error) }, 502);
      }
    }

    return json({
      ok: true,
      service: "tennis-listen-bolshe-overlay",
      routes: [
        "/overlay.html",
        NEWS_TICKER_PATH,
        NEWS_TICKER_FLEX_PATH,
        "/api/health",
        "/api/matches",
        "/api/live-matches",
        "/api/news/tennis",
        "/api/odds/current?matchId=<flashscoreId>",
        "/api/odds/debug?matchId=<flashscoreId>",
        "/api/odds/probe?winlineUrl=<winlineUrl>",
        "/api/odds/manual",
        "/api/odds/winline/link",
        "/api/odds/winline/disable",
        "/api/odds/reset",
        "/api/odds/push",
        "/api/odds/winline",
        "/api/match/flashscore?id=Sril3X2m",
        TELEGRAM_WEBHOOK_PATH
      ]
    });
  }
};

function matches(origin) {
  return [
    {
      id: `flashscore-${DEFAULT_MATCH_ID}`,
      title: "Omar Jasika - Hamish Stewart",
      description: "Flashscore live, Challenger Bengaluru 2",
      provider: "flashscore",
      source: `${origin}/api/match/flashscore?id=${DEFAULT_MATCH_ID}`,
      news: `${origin}/api/news/tennis`
    }
  ];
}

function fallbackNews(error) {
  return {
    ok: false,
    source: "fallback",
    error: error?.message || String(error || ""),
    items: [
      { title: "Sports.ru: новости тенниса временно недоступны" },
      { title: "Tennis live overlay: счет обновляется автоматически" },
      { title: "OBS / Streamlabs / vMix: Browser Source 1920x1080" },
      { title: "Тикер обновится автоматически после восстановления источника" }
    ]
  };
}

async function winlineOdds(url, env) {
  const home = url.searchParams.get("home") || "";
  const away = url.searchParams.get("away") || "";
  const manualHome = url.searchParams.get("homeOdd");
  const manualAway = url.searchParams.get("awayOdd");
  const eventId = url.searchParams.get("eventId") || "";
  const matchUrl = url.searchParams.get("matchUrl") || "";

  if (url.searchParams.has("homeOdd") || url.searchParams.has("awayOdd")) {
    return {
      ok: true,
      provider: "winline",
      source: "query",
      updatedAt: new Date().toISOString(),
      odds: { home: cleanOdd(manualHome), away: cleanOdd(manualAway) }
    };
  }

  const sourceUrl = String(env.WINLINE_ODDS_URL || "").trim();
  if (sourceUrl) {
    const response = await fetch(sourceUrl, {
      headers: {
        accept: "application/json,text/plain,*/*",
        "user-agent": "Mozilla/5.0 (compatible; tennis-listen-bolshe-overlay/1.0)"
      },
      cf: { cacheTtl: 60, cacheEverything: true }
    });
    if (!response.ok) throw new Error(`Winline odds ${response.status}`);

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("json") ? await response.json() : await response.text();
    const parsed = extractWinlineOdds(payload, home, away);
    const sanitized = sanitizeOddsForDisplay(
      { player1: parsed.home, player2: parsed.away },
      { source: "winline", mode: "url" }
    );
    return {
      ok: true,
      provider: "winline",
      source: sourceUrl,
      updatedAt: new Date().toISOString(),
      odds: {
        home: sanitized.odds.player1,
        away: sanitized.odds.player2
      },
      invalid: !sanitized.valid,
      invalidReason: sanitized.reason,
      parser: parsed.parserResult || createOddsParserResult(),
      players: { home, away, eventId }
    };
  }

  const auto = await tryAutoWinlineOdds({ home, away, eventId, matchUrl });
  if (auto.home || auto.away) {
    const sanitized = sanitizeOddsForDisplay(
      { player1: auto.home, player2: auto.away },
      { source: "winline", mode: "url" }
    );
    return {
      ok: true,
      provider: "winline",
      source: auto.source,
      updatedAt: new Date().toISOString(),
      odds: {
        home: sanitized.odds.player1,
        away: sanitized.odds.player2
      },
      invalid: !sanitized.valid,
      invalidReason: sanitized.reason,
      players: { home, away, eventId }
    };
  }

  return {
    ok: true,
    provider: "winline",
    source: "not-configured",
    updatedAt: new Date().toISOString(),
    odds: { home: null, away: null },
    players: { home, away, eventId }
  };
}

async function tryAutoWinlineOdds({ home, away, eventId, matchUrl }) {
  const candidates = [];
  if (matchUrl) candidates.push(matchUrl);
  if (eventId) candidates.push(`https://winline.ru/stavki/sport/tennis/atp/rolan_garros/${eventId}`);

  for (const target of candidates) {
    try {
      const fetched = await fetchOddsByWinlineUrl({
        winlineUrl: target,
        player1Name: home,
        player2Name: away,
        timeoutMs: WINLINE_REQUEST_TIMEOUT_MS_DEFAULT
      });
      if (fetched?.ok && (fetched.odds?.player1 || fetched.odds?.player2)) {
        return {
          home: fetched.odds.player1 ?? null,
          away: fetched.odds.player2 ?? null,
          source: target
        };
      }
    } catch (_error) {
      // ignore candidate and continue
    }
  }

  return { home: null, away: null, source: "auto" };
}

function createOddsParserResult(overrides = {}) {
  return {
    marketFound: false,
    selectedMarketTitle: null,
    selectedOdds: null,
    selectedBy: null,
    foundMarkets: [],
    foundOutcomePairs: [],
    rejectedMarkets: [],
    rejectReasons: [],
    ...overrides
  };
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[.,:;()[\]{}"'`!?@#$%^&*_+=<>\\/|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesPattern(textValue, patterns) {
  if (!textValue) return false;
  for (const pattern of patterns || []) {
    if (pattern && textValue.includes(pattern)) return true;
  }
  return false;
}

function hasBannedMarketPattern(normalizedTitle) {
  return includesPattern(normalizedTitle, WINLINE_MARKET_BANNED_PATTERNS);
}

function hasPositiveMarketPattern(normalizedTitle) {
  return includesPattern(normalizedTitle, WINLINE_MARKET_POSITIVE_PATTERNS);
}

function marketTitleFromNode(node) {
  if (!node || typeof node !== "object") return "";
  return [
    node.name,
    node.title,
    node.marketName,
    node.groupName,
    node.caption,
    node.label,
    node.betName,
    node.betType,
    node.market,
    node.eventName
  ].filter(Boolean).join(" ").trim();
}

function isMatchWinnerMarket(market) {
  const title = normalizeText(marketTitleFromNode(market));
  if (!title) return false;
  if (hasBannedMarketPattern(title)) return false;
  return hasPositiveMarketPattern(title);
}

function readMarketPair(node) {
  if (!node || typeof node !== "object") return { home: null, away: null };
  const pairKeys = [
    ["homeOdd", "awayOdd"],
    ["homeOdds", "awayOdds"],
    ["home", "away"],
    ["player1", "player2"],
    ["p1", "p2"],
    ["k1", "k2"],
    ["odd1", "odd2"],
    ["win1", "win2"],
    ["first", "second"],
    ["coef1", "coef2"],
    ["coefficient1", "coefficient2"]
  ];
  for (const [homeKey, awayKey] of pairKeys) {
    const home = cleanOdd(node?.[homeKey]);
    const away = cleanOdd(node?.[awayKey]);
    if (home || away) return { home, away };
  }
  return { home: null, away: null };
}

function readOutcomeOdd(node) {
  if (node === null || node === undefined) return null;
  if (typeof node !== "object") return cleanOdd(node);
  const keys = [
    "odd",
    "odds",
    "value",
    "price",
    "coef",
    "coefficient",
    "k",
    "quote",
    "factor",
    "currentOdd",
    "currentPrice"
  ];
  for (const key of keys) {
    const parsed = cleanOdd(node?.[key]);
    if (parsed) return parsed;
  }
  return null;
}

function extractOutcomeLabel(node) {
  return normalizeText([
    node?.side,
    node?.team,
    node?.participant,
    node?.competitor,
    node?.outcome,
    node?.result,
    node?.code,
    node?.id,
    node?.num,
    node?.index,
    node?.order,
    node?.name,
    node?.title,
    node?.label
  ].filter((value) => value !== undefined && value !== null).join(" "));
}

function tokenizeNormalizedText(value) {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  return normalized.split(" ").filter(Boolean);
}

function containsMarkerToken(labelValue, markers) {
  const tokens = tokenizeNormalizedText(labelValue);
  if (!tokens.length) return false;
  return tokens.some((token) => markers.includes(token));
}

function outcomeSide(node, context = {}) {
  const marker = extractOutcomeLabel(node);
  if (!marker) return null;
  if (containsMarkerToken(marker, WINLINE_OUTCOME_HOME_MARKERS)) return "home";
  if (containsMarkerToken(marker, WINLINE_OUTCOME_AWAY_MARKERS)) return "away";

  const homeToken = context.homeToken || "";
  const awayToken = context.awayToken || "";
  const normalizedMarker = normalizeName(marker);
  if (homeToken && normalizedMarker.includes(homeToken)) return "home";
  if (awayToken && normalizedMarker.includes(awayToken)) return "away";
  return null;
}

function collectOutcomeNodes(node) {
  if (!node || typeof node !== "object") return [];
  const containers = [
    node.outcomes,
    node.outcome,
    node.selections,
    node.selection,
    node.items,
    node.bets,
    node.bet,
    node.values,
    node.lines,
    node.runners,
    node.variants,
    node.options,
    node.coefficients,
    node.coefs
  ];
  const out = [];
  for (const container of containers) {
    if (!container) continue;
    if (Array.isArray(container)) {
      out.push(...container);
    } else if (typeof container === "object") {
      out.push(...Object.values(container));
    }
  }
  return out;
}

function extractMarketOddsFromNode(node, context = {}, options = {}) {
  const direct = readMarketPair(node);
  let home = direct.home;
  let away = direct.away;
  const unknown = [];
  const diagnostics = {
    totalOutcomes: 0,
    labels: [],
    directPair: Boolean(direct.home || direct.away),
    hasHomeMarkers: false,
    hasAwayMarkers: false,
    hasNamedSides: false,
    unknownOddsCount: 0,
    home: null,
    away: null
  };

  const outcomes = collectOutcomeNodes(node);
  diagnostics.totalOutcomes = outcomes.length;
  for (const item of outcomes) {
    const label = extractOutcomeLabel(item);
    if (label) {
      if (!diagnostics.labels.includes(label) && diagnostics.labels.length < 12) diagnostics.labels.push(label);
      if (containsMarkerToken(label, WINLINE_OUTCOME_HOME_MARKERS)) diagnostics.hasHomeMarkers = true;
      if (containsMarkerToken(label, WINLINE_OUTCOME_AWAY_MARKERS)) diagnostics.hasAwayMarkers = true;
    }
    const odd = readOutcomeOdd(item);
    if (!odd) continue;
    const side = outcomeSide(item, context);
    if (side === "home" && !home) {
      home = odd;
    } else if (side === "away" && !away) {
      away = odd;
    } else {
      unknown.push(odd);
      diagnostics.unknownOddsCount += 1;
    }
    if (side && (context.homeToken || context.awayToken) && label) {
      diagnostics.hasNamedSides = true;
    }
  }

  if (!home && unknown.length) home = unknown.shift();
  if (!away && unknown.length) away = unknown.shift();
  diagnostics.home = cleanOdd(home);
  diagnostics.away = cleanOdd(away);
  if (options.withDiagnostics) {
    return { home: diagnostics.home, away: diagnostics.away, diagnostics };
  }
  return { home: diagnostics.home, away: diagnostics.away };
}

function extractMatchWinnerOddsFromPayload(payload, home, away) {
  const parserResult = createOddsParserResult();
  if (!payload || typeof payload !== "object") return { home: null, away: null, parserResult };

  const homeToken = normalizeName(home || "").split(" ").filter(Boolean).at(-1) || "";
  const awayToken = normalizeName(away || "").split(" ").filter(Boolean).at(-1) || "";
  const foundMarkets = [];
  const foundOutcomePairs = [];
  const rejectedMarkets = [];
  const rejectReasons = [];

  const stack = [payload];
  const visited = new Set();
  while (stack.length) {
    const item = stack.pop();
    if (!item || typeof item !== "object") continue;
    if (visited.has(item)) continue;
    visited.add(item);

    if (Array.isArray(item)) {
      for (const child of item) stack.push(child);
      continue;
    }

    const title = marketTitleFromNode(item);
    if (title && foundMarkets.length < 40 && !foundMarkets.includes(title)) foundMarkets.push(title);

    const normalizedTitle = normalizeText(title);
    const bannedByTitle = normalizedTitle ? hasBannedMarketPattern(normalizedTitle) : false;
    const positiveByTitle = normalizedTitle ? hasPositiveMarketPattern(normalizedTitle) : false;
    const odds = extractMarketOddsFromNode(item, { homeToken, awayToken }, { withDiagnostics: true });
    const player1 = cleanOdd(odds.home);
    const player2 = cleanOdd(odds.away);
    const hasPair = Boolean(player1 && player2);
    const hasOutcomeSignals = odds.diagnostics.totalOutcomes >= 2
      && (odds.diagnostics.hasHomeMarkers || odds.diagnostics.hasAwayMarkers || odds.diagnostics.hasNamedSides);
    const acceptedByTitle = positiveByTitle && !bannedByTitle;
    const acceptedByOutcomes = !positiveByTitle && !bannedByTitle && hasOutcomeSignals;
    const accepted = acceptedByTitle || acceptedByOutcomes;

    if (hasPair && foundOutcomePairs.length < 30) {
      foundOutcomePairs.push({
        title: title || null,
        normalizedTitle: normalizedTitle || null,
        player1,
        player2,
        via: acceptedByTitle ? "title" : (acceptedByOutcomes ? "outcomes" : "unknown"),
        outcomeCount: odds.diagnostics.totalOutcomes,
        labels: odds.diagnostics.labels
      });
    }

    if (accepted && !parserResult.marketFound) {
      parserResult.marketFound = true;
      parserResult.selectedBy = acceptedByTitle ? "title" : "outcomes";
      parserResult.selectedMarketTitle = title || null;
      parserResult.selectedOdds = { player1, player2 };
    }

    if (accepted && hasPair) {
      parserResult.marketFound = true;
      parserResult.selectedBy = acceptedByTitle ? "title" : "outcomes";
      parserResult.selectedMarketTitle = title || null;
      parserResult.selectedOdds = { player1, player2 };
      parserResult.foundMarkets = foundMarkets;
      parserResult.foundOutcomePairs = foundOutcomePairs;
      parserResult.rejectedMarkets = rejectedMarkets;
      parserResult.rejectReasons = rejectReasons;
      return { home: player1, away: player2, parserResult };
    }

    if (accepted && !hasPair && rejectedMarkets.length < 30) {
      const reason = "candidate-without-odds-pair";
      rejectedMarkets.push({
        title: title || null,
        normalizedTitle: normalizedTitle || null,
        reason,
        outcomeCount: odds.diagnostics.totalOutcomes,
        labels: odds.diagnostics.labels
      });
      if (!rejectReasons.includes(reason)) rejectReasons.push(reason);
    } else if (bannedByTitle && (positiveByTitle || hasPair || hasOutcomeSignals) && rejectedMarkets.length < 30) {
      const reason = "title-has-banned-pattern";
      rejectedMarkets.push({
        title: title || null,
        normalizedTitle: normalizedTitle || null,
        reason,
        outcomeCount: odds.diagnostics.totalOutcomes,
        labels: odds.diagnostics.labels
      });
      if (!rejectReasons.includes(reason)) rejectReasons.push(reason);
    } else if (!accepted && hasPair && rejectedMarkets.length < 30) {
      const reason = "odds-pair-found-but-market-not-accepted";
      rejectedMarkets.push({
        title: title || null,
        normalizedTitle: normalizedTitle || null,
        reason,
        outcomeCount: odds.diagnostics.totalOutcomes,
        labels: odds.diagnostics.labels
      });
      if (!rejectReasons.includes(reason)) rejectReasons.push(reason);
    } else if (!accepted && hasOutcomeSignals && rejectedMarkets.length < 30) {
      const reason = "outcomes-signal-without-accepted-market";
      rejectedMarkets.push({
        title: title || null,
        normalizedTitle: normalizedTitle || null,
        reason,
        outcomeCount: odds.diagnostics.totalOutcomes,
        labels: odds.diagnostics.labels
      });
      if (!rejectReasons.includes(reason)) rejectReasons.push(reason);
    }

    if (isMatchWinnerMarket(item) && !accepted) {
      const reason = "match-winner-title-hit-but-market-rejected";
      if (!rejectReasons.includes(reason)) rejectReasons.push(reason);
      if (rejectedMarkets.length < 30) {
        rejectedMarkets.push({
          title: title || null,
          normalizedTitle: normalizedTitle || null,
          reason,
          outcomeCount: odds.diagnostics.totalOutcomes,
          labels: odds.diagnostics.labels
        });
      }
    }

    for (const value of Object.values(item)) {
      if (value && typeof value === "object") stack.push(value);
    }
  }

  parserResult.foundMarkets = foundMarkets;
  parserResult.foundOutcomePairs = foundOutcomePairs;
  parserResult.rejectedMarkets = rejectedMarkets;
  parserResult.rejectReasons = rejectReasons;
  return { home: null, away: null, parserResult };
}

function extractBalancedJson(source, startIndex) {
  const text = String(source || "");
  let start = -1;
  for (let i = startIndex; i < text.length; i += 1) {
    const char = text[i];
    if (char === "{" || char === "[") {
      start = i;
      break;
    }
  }
  if (start < 0) return null;

  const openChar = text[start];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let quoteChar = "";
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quoteChar) {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quoteChar = char;
      continue;
    }
    if (char === openChar) depth += 1;
    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

function parseEmbeddedJsonPayloads(htmlValue) {
  const payloads = [];
  const textValue = String(htmlValue || "");
  const scriptPattern = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  const markers = [/__NEXT_DATA__\s*=\s*/gi, /__INITIAL_STATE__\s*=\s*/gi, /__PRELOADED_STATE__\s*=\s*/gi, /__NUXT__\s*=\s*/gi];
  let scriptMatch;

  while ((scriptMatch = scriptPattern.exec(textValue))) {
    const body = String(scriptMatch[1] || "").trim();
    if (!body) continue;

    const bodyStartsWithJson = (body.startsWith("{") && body.endsWith("}")) || (body.startsWith("[") && body.endsWith("]"));
    if (bodyStartsWithJson) {
      try {
        payloads.push(JSON.parse(body));
      } catch (_error) {
        // continue searching
      }
    }

    for (const marker of markers) {
      marker.lastIndex = 0;
      let markerMatch;
      while ((markerMatch = marker.exec(body))) {
        const candidate = extractBalancedJson(body, marker.lastIndex);
        if (!candidate) continue;
        try {
          payloads.push(JSON.parse(candidate));
        } catch (_error) {
          // continue searching
        }
      }
    }
  }

  return payloads;
}

function extractOddsFromHtml(htmlValue, home, away) {
  const payloads = parseEmbeddedJsonPayloads(htmlValue);
  let fallback = createOddsParserResult();
  for (const payload of payloads) {
    const parsed = extractWinlineOdds(payload, home, away);
    fallback = pickBetterParserResult(fallback, parsed?.parserResult);
    if (parsed.home || parsed.away) return parsed;
  }
  return { home: null, away: null, parserResult: fallback };
}

function extractWinlineOdds(payload, home, away) {
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        return extractWinlineOdds(JSON.parse(trimmed), home, away);
      } catch (_error) {
        return { home: null, away: null, parserResult: createOddsParserResult() };
      }
    }
    return { home: null, away: null, parserResult: createOddsParserResult() };
  }

  const directPayload = payload?.odds || payload?.winline || payload;
  return extractMatchWinnerOddsFromPayload(directPayload, home, away);
}

function parserResultScore(result) {
  if (!result || typeof result !== "object") return 0;
  let score = 0;
  if (result.marketFound) score += 50;
  if (result.selectedOdds?.player1 && result.selectedOdds?.player2) score += 60;
  score += Math.min(20, Number(result.foundMarkets?.length || 0));
  score += Math.min(20, Number(result.foundOutcomePairs?.length || 0));
  return score;
}

function pickBetterParserResult(current, candidate) {
  if (!candidate) return current || createOddsParserResult();
  if (!current) return candidate;
  return parserResultScore(candidate) >= parserResultScore(current) ? candidate : current;
}

function extractHtmlTitle(htmlValue) {
  const match = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(String(htmlValue || ""));
  if (!match) return null;
  return String(match[1] || "").replace(/\s+/g, " ").trim() || null;
}

function collectScriptDiagnostics(htmlValue) {
  const htmlText = String(htmlValue || "");
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  const srcPattern = /\bsrc\s*=\s*["']([^"']+)["']/i;
  const typePattern = /\btype\s*=\s*["']([^"']+)["']/i;
  const scripts = [];
  let match;
  while ((match = scriptPattern.exec(htmlText))) {
    const attrs = String(match[1] || "");
    const body = String(match[2] || "");
    const srcMatch = srcPattern.exec(attrs);
    const typeMatch = typePattern.exec(attrs);
    const src = srcMatch ? srcMatch[1] : null;
    const type = typeMatch ? typeMatch[1].toLowerCase() : null;
    scripts.push({
      kind: src ? "external" : "inline",
      src,
      type,
      length: body.length,
      hasJsonMarker: /__NEXT_DATA__|__INITIAL_STATE__|__PRELOADED_STATE__|__NUXT__/i.test(body),
      startsLikeJson: /^\s*[\[{]/.test(body)
    });
  }
  return {
    total: scripts.length,
    inline: scripts.filter((item) => item.kind === "inline").length,
    external: scripts.filter((item) => item.kind === "external").length,
    externalSrcSample: scripts.filter((item) => item.src).map((item) => item.src).slice(0, 20),
    inlineJsonLikeCount: scripts.filter((item) => item.kind === "inline" && (item.startsLikeJson || item.hasJsonMarker)).length,
    blocks: scripts.slice(0, 30)
  };
}

function cleanOdd(value) {
  const textValue = String(value ?? "").replace(",", ".").trim();
  if (!/^\d+(\.\d+)?$/.test(textValue)) return null;
  return Number(textValue).toFixed(2);
}

function normalizeName(value) {
  return String(value || "").toLowerCase().replace(/[^a-zа-яё0-9]+/gi, " ").trim();
}

function oddsToNumber(value) {
  const textValue = String(value ?? "").replace(",", ".").trim();
  if (!textValue) return null;
  const numeric = Number(textValue);
  if (!Number.isFinite(numeric)) return null;
  return numeric;
}

function oddsToDisplay(value) {
  const numeric = oddsToNumber(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric.toFixed(2);
}

function isKnownBadOddsPair(odds) {
  const a = oddsToNumber(odds?.player1);
  const b = oddsToNumber(odds?.player2);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - WINLINE_KNOWN_BAD_ODDS.player1) < 0.001 && Math.abs(b - WINLINE_KNOWN_BAD_ODDS.player2) < 0.001;
}

function isValidMatchWinnerOddsPair(odds) {
  const a = oddsToNumber(odds?.player1);
  const b = oddsToNumber(odds?.player2);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  if (a <= 1 || b <= 1) return false;
  if (a > 50 || b > 50) return false;
  const impliedSum = (1 / a) + (1 / b);
  if (impliedSum < 0.85 || impliedSum > 1.35) return false;
  return true;
}

function sanitizeOddsForDisplay(rawOdds, meta = {}) {
  const a = oddsToDisplay(rawOdds?.player1);
  const b = oddsToDisplay(rawOdds?.player2);
  const isManual = meta.mode === "manual" || meta.source === "manual";

  if (isManual) {
    if (!a && !b) {
      return {
        odds: { player1: null, player2: null },
        valid: false,
        reason: "missing-or-not-finite"
      };
    }
    return {
      odds: { player1: a || null, player2: b || null },
      valid: true,
      reason: null
    };
  }

  if (!a || !b) {
    return {
      odds: { player1: null, player2: null },
      valid: false,
      reason: "missing-or-not-finite"
    };
  }

  if (isKnownBadOddsPair({ player1: a, player2: b })) {
    return {
      odds: { player1: null, player2: null },
      valid: false,
      reason: "known-placeholder-odds"
    };
  }
  if (!isValidMatchWinnerOddsPair({ player1: a, player2: b })) {
    return {
      odds: { player1: null, player2: null },
      valid: false,
      reason: "invalid-match-winner-odds"
    };
  }

  return {
    odds: { player1: a, player2: b },
    valid: true,
    reason: null
  };
}

function oddsConfig(env) {
  const oddsServiceBaseUrlRaw = String(env?.ODDS_SERVICE_BASE_URL || "").trim();
  const oddsServiceBaseUrl = oddsServiceBaseUrlRaw.replace(/\/+$/, "");
  return {
    enabled: String(env?.WINLINE_ODDS_ENABLED || "true").toLowerCase() !== "false",
    pollIntervalMs: clampNumber(env?.WINLINE_POLL_INTERVAL_MS, WINLINE_POLL_INTERVAL_MS_DEFAULT, 2000, 60000),
    staleAfterMs: clampNumber(env?.WINLINE_STALE_AFTER_MS, WINLINE_STALE_AFTER_MS_DEFAULT, 5000, 15 * 60 * 1000),
    requestTimeoutMs: clampNumber(env?.WINLINE_REQUEST_TIMEOUT_MS, WINLINE_REQUEST_TIMEOUT_MS_DEFAULT, 1000, 30000),
    oddsServiceBaseUrl,
    oddsServiceSecret: String(env?.ODDS_SERVICE_SECRET || env?.ODDS_PUSH_SECRET || "").trim()
  };
}

function oddsSharedSecret(env) {
  return String(env?.ODDS_PUSH_SECRET || env?.ODDS_SERVICE_SECRET || "").trim();
}

function clampNumber(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(Math.max(Math.round(numeric), min), max);
}

function timeoutSignal(timeoutMs) {
  if (typeof AbortSignal === "undefined" || typeof AbortSignal.timeout !== "function") return undefined;
  return AbortSignal.timeout(timeoutMs);
}

function oddsMatchKey(raw) {
  const matchId = String(raw || "").trim();
  if (!matchId) throw new Error("matchId is required");
  return matchId.slice(0, 120);
}

function baseOddsState(matchId) {
  return {
    matchId,
    source: "winline",
    mode: "off",
    autoUpdate: false,
    winlineUrl: "",
    winlineEventId: "",
    player1Name: "",
    player2Name: "",
    marketTitle: "",
    odds: { player1: null, player2: null },
    updatedAt: null,
    lastSuccessAt: null,
    lastError: null,
    lastParserResult: null,
    stale: true,
    lastPolledAt: 0
  };
}

function getOddsState(matchIdRaw) {
  const matchId = oddsMatchKey(matchIdRaw);
  const existing = oddsStateByMatchId.get(matchId);
  if (existing) return existing;
  const created = baseOddsState(matchId);
  oddsStateByMatchId.set(matchId, created);
  return created;
}

function setOddsState(matchIdRaw, patch = {}) {
  const matchId = oddsMatchKey(matchIdRaw);
  const current = getOddsState(matchId);
  const next = {
    ...current,
    ...patch,
    odds: {
      ...(current.odds || {}),
      ...((patch && patch.odds) || {})
    }
  };
  oddsStateByMatchId.set(matchId, next);
  return next;
}

function oddsKvBinding(env) {
  return env && env.ODDS_KV && typeof env.ODDS_KV.get === "function" ? env.ODDS_KV : null;
}

function oddsStorageKey(matchIdRaw) {
  const matchId = oddsMatchKey(matchIdRaw);
  return `${ODDS_KV_PREFIX}${matchId}`;
}

function normalizeOddsStateSnapshot(stateRaw, matchIdRaw) {
  const matchId = oddsMatchKey(matchIdRaw);
  const base = baseOddsState(matchId);
  if (!stateRaw || typeof stateRaw !== "object") return base;
  return {
    ...base,
    ...stateRaw,
    matchId,
    autoUpdate: Boolean(stateRaw.autoUpdate),
    lastPolledAt: Number.isFinite(Number(stateRaw.lastPolledAt)) ? Number(stateRaw.lastPolledAt) : 0,
    odds: {
      ...base.odds,
      ...((stateRaw.odds && typeof stateRaw.odds === "object") ? stateRaw.odds : {})
    }
  };
}

async function getOddsStatePersistent(env, matchIdRaw) {
  const matchId = oddsMatchKey(matchIdRaw);
  const kv = oddsKvBinding(env);
  if (!kv) return getOddsState(matchId);

  const key = oddsStorageKey(matchId);
  try {
    const stored = await kv.get(key, "json");
    if (stored && typeof stored === "object") {
      const normalized = normalizeOddsStateSnapshot(stored, matchId);
      oddsStateByMatchId.set(matchId, normalized);
      return normalized;
    }
  } catch (_error) {
    // fall back to in-memory state
  }
  return getOddsState(matchId);
}

async function setOddsStatePersistent(env, matchIdRaw, patch = {}) {
  const matchId = oddsMatchKey(matchIdRaw);
  const current = await getOddsStatePersistent(env, matchId);
  const next = {
    ...current,
    ...patch,
    odds: {
      ...(current.odds || {}),
      ...((patch && patch.odds) || {})
    }
  };
  oddsStateByMatchId.set(matchId, next);

  const kv = oddsKvBinding(env);
  if (kv) {
    try {
      await kv.put(oddsStorageKey(matchId), JSON.stringify(next));
    } catch (_error) {
      // in-memory state still has the latest snapshot
    }
  }
  return next;
}

async function deleteOddsStatePersistent(env, matchIdRaw) {
  const matchId = oddsMatchKey(matchIdRaw);
  oddsStateByMatchId.delete(matchId);
  const kv = oddsKvBinding(env);
  if (!kv) return;
  try {
    await kv.delete(oddsStorageKey(matchId));
  } catch (_error) {
    // ignore KV delete errors
  }
}

function normalizeActiveOddsEntry(rawEntry = {}, matchIdRaw = "") {
  const fallbackMatchId = matchIdRaw ? oddsMatchKey(matchIdRaw) : "";
  const rawMatchId = String(rawEntry.matchId || fallbackMatchId || "").trim();
  if (!rawMatchId) return null;
  const matchId = oddsMatchKey(rawMatchId);
  const createdAt = String(rawEntry.createdAt || "").trim() || new Date().toISOString();
  const updatedAt = String(rawEntry.updatedAt || "").trim() || createdAt;
  const winlineUrl = String(rawEntry.winlineUrl || "").trim();
  return {
    matchId,
    winlineUrl,
    player1Name: normalizeFreeText(rawEntry.player1Name || ""),
    player2Name: normalizeFreeText(rawEntry.player2Name || ""),
    source: normalizeFreeText(rawEntry.source || "winline") || "winline",
    mode: normalizeFreeText(rawEntry.mode || "sidecar_pending") || "sidecar_pending",
    autoUpdate: rawEntry.autoUpdate !== false,
    createdAt,
    updatedAt
  };
}

async function getActiveOddsMap(env) {
  const kv = oddsKvBinding(env);
  if (!kv) {
    const inMemory = {};
    for (const [matchId, entry] of oddsActiveByMatchIdFallback.entries()) {
      const normalized = normalizeActiveOddsEntry(entry, matchId);
      if (normalized) inMemory[normalized.matchId] = normalized;
    }
    return inMemory;
  }

  try {
    const stored = await kv.get(ODDS_ACTIVE_KV_KEY, "json");
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};
    const normalizedMap = {};
    for (const [matchId, entry] of Object.entries(stored)) {
      const normalized = normalizeActiveOddsEntry(entry, matchId);
      if (normalized) normalizedMap[normalized.matchId] = normalized;
    }
    return normalizedMap;
  } catch (_error) {
    return {};
  }
}

async function putActiveOddsMap(env, mapValue) {
  const normalizedMap = {};
  for (const [matchId, entry] of Object.entries(mapValue || {})) {
    const normalized = normalizeActiveOddsEntry(entry, matchId);
    if (normalized) normalizedMap[normalized.matchId] = normalized;
  }

  const kv = oddsKvBinding(env);
  if (!kv) {
    oddsActiveByMatchIdFallback.clear();
    for (const entry of Object.values(normalizedMap)) {
      oddsActiveByMatchIdFallback.set(entry.matchId, entry);
    }
    return normalizedMap;
  }

  try {
    await kv.put(ODDS_ACTIVE_KV_KEY, JSON.stringify(normalizedMap));
  } catch (_error) {
    // ignore kv write errors
  }
  return normalizedMap;
}

async function upsertActiveOddsMatch(env, rawEntry) {
  const entry = normalizeActiveOddsEntry(rawEntry, rawEntry?.matchId || "");
  if (!entry) return null;
  const mapValue = await getActiveOddsMap(env);
  const current = mapValue[entry.matchId];
  const next = {
    ...current,
    ...entry,
    createdAt: current?.createdAt || entry.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  mapValue[next.matchId] = next;
  await putActiveOddsMap(env, mapValue);
  return next;
}

async function removeActiveOddsMatch(env, matchIdRaw) {
  const matchId = oddsMatchKey(matchIdRaw);
  const mapValue = await getActiveOddsMap(env);
  delete mapValue[matchId];
  await putActiveOddsMap(env, mapValue);
}

async function listActiveOddsMatches(env) {
  const mapValue = await getActiveOddsMap(env);
  return Object.values(mapValue)
    .filter((item) => item && item.matchId && item.winlineUrl)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

function parseOddValue(value) {
  const cleaned = cleanOdd(value);
  return cleaned === null ? null : cleaned;
}

function staleOdds(state, env) {
  if (!state?.lastSuccessAt) return true;
  const last = Date.parse(state.lastSuccessAt);
  if (!Number.isFinite(last) || last <= 0) return true;
  return Date.now() - last > oddsConfig(env).staleAfterMs;
}

function oddsPayload(state, env) {
  const sanitized = sanitizeOddsForDisplay(
    {
      player1: state?.odds?.player1 ?? null,
      player2: state?.odds?.player2 ?? null
    },
    {
      source: state?.source || "winline",
      mode: state?.mode || "off"
    }
  );
  const home = sanitized.odds.player1 ?? null;
  const away = sanitized.odds.player2 ?? null;
  const stale = staleOdds(state, env);
  return {
    ok: true,
    buildVersion: BUILD_VERSION,
    matchId: state?.matchId || null,
    source: state?.source || "winline",
    mode: state?.mode || "off",
    autoUpdate: Boolean(state?.autoUpdate),
    odds: {
      player1: home,
      player2: away,
      home,
      away
    },
    updatedAt: state?.updatedAt || null,
    lastSuccessAt: state?.lastSuccessAt || null,
    lastError: state?.lastError || null,
    invalid: !sanitized.valid,
    invalidReason: sanitized.reason,
    stale
  };
}

function normalizeWinlineUrl(raw) {
  const textValue = String(raw || "").trim();
  if (!textValue) throw new Error("winlineUrl is required");
  let parsed;
  try {
    parsed = new URL(textValue);
  } catch (_error) {
    throw new Error("Некорректная ссылка Winline");
  }
  const host = parsed.hostname.toLowerCase();
  if (!(host === "winline.ru" || host.endsWith(".winline.ru"))) {
    throw new Error("Ссылка должна вести на winline.ru");
  }
  if (!/^https?:$/i.test(parsed.protocol)) {
    throw new Error("Поддерживаются только http/https ссылки");
  }
  parsed.hash = "";
  return parsed.toString();
}

function winlineFetchInit(timeoutMs = WINLINE_REQUEST_TIMEOUT_MS_DEFAULT) {
  const requestInit = {
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8",
      "user-agent": "Mozilla/5.0 (compatible; tennis-listen-bolshe-overlay/1.0)"
    },
    cf: { cacheTtl: 5, cacheEverything: false }
  };
  const signal = timeoutSignal(timeoutMs);
  if (signal) requestInit.signal = signal;
  return requestInit;
}

async function fetchOddsByWinlineUrl({ winlineUrl, player1Name = "", player2Name = "", timeoutMs = WINLINE_REQUEST_TIMEOUT_MS_DEFAULT }) {
  const requestInit = winlineFetchInit(timeoutMs);
  const response = await fetch(winlineUrl, requestInit);
  if (!response.ok) {
    return { ok: false, error: `Winline ${response.status}`, lastParserResult: createOddsParserResult() };
  }
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  let parsedOdds = { home: null, away: null, parserResult: createOddsParserResult() };
  if (contentType.includes("json")) {
    const payload = await response.json();
    parsedOdds = extractWinlineOdds(payload, player1Name, player2Name);
  } else {
    const htmlValue = await response.text();
    parsedOdds = extractOddsFromHtml(htmlValue, player1Name, player2Name);
  }
  const parserResult = parsedOdds?.parserResult || createOddsParserResult();
  const player1 = parseOddValue(parsedOdds.home);
  const player2 = parseOddValue(parsedOdds.away);
  const sanitized = sanitizeOddsForDisplay(
    { player1, player2 },
    { source: "winline", mode: "url" }
  );
  if (!sanitized.valid) {
    return {
      ok: false,
      error: parserResult.marketFound ? "Invalid match winner odds" : "Match winner market not found",
      invalid: true,
      invalidReason: sanitized.reason,
      odds: { player1: null, player2: null },
      lastParserResult: parserResult
    };
  }
  return {
    ok: true,
    source: winlineUrl,
    updatedAt: new Date().toISOString(),
    odds: sanitized.odds,
    lastParserResult: parserResult
  };
}

function payloadKind(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function sampleOddsLikeNumbers(textValue, limit = 30) {
  const text = String(textValue || "");
  const pattern = /\b\d{1,2}\.\d{2}\b/g;
  const out = [];
  let match;
  while ((match = pattern.exec(text)) && out.length < limit) {
    const value = match[0];
    if (!out.includes(value)) out.push(value);
  }
  return out;
}

function containsPlayerToken(textValue, playerName) {
  const token = normalizeName(playerName || "").split(" ").filter(Boolean).at(-1) || "";
  if (!token) return null;
  return normalizeName(textValue || "").includes(token);
}

function buildProbeLikelyReason(report) {
  if (!report) return "probe-empty";
  if (report.fetchStatus >= 400) return "winline-http-error";
  if (report.fetchStatus === 200 && report.contentType?.includes("text/html")) {
    const hasPayloads = Number(report?.embeddedJson?.count || 0) > 0;
    const hasMarkets = Number(report?.marketTitles?.length || 0) > 0;
    const hasSelectedOdds = Boolean(report?.selectedOdds?.player1 && report?.selectedOdds?.player2);
    if (!hasPayloads && !hasMarkets) return "winline-data-loaded-client-side-or-blocked";
    if (hasPayloads && hasMarkets && !hasSelectedOdds) return "market-found-but-not-extracted";
    if (hasPayloads && !hasMarkets) return "embedded-json-without-markets";
  }
  if (report.fetchStatus === 200 && report.contentType?.includes("json")) {
    if (!report.marketTitles?.length) return "json-without-market-candidates";
    if (report.marketTitles?.length && !(report.selectedOdds?.player1 && report.selectedOdds?.player2)) return "market-found-but-odds-pair-missing";
  }
  return "insufficient-data";
}

async function oddsProbe(url) {
  const rawWinlineUrl = String(url.searchParams.get("winlineUrl") || url.searchParams.get("url") || "").trim();
  const winlineUrl = normalizeWinlineUrl(rawWinlineUrl);
  const player1Name = normalizeFreeText(url.searchParams.get("home") || url.searchParams.get("player1") || "");
  const player2Name = normalizeFreeText(url.searchParams.get("away") || url.searchParams.get("player2") || "");
  const timeoutMs = clampNumber(url.searchParams.get("timeoutMs"), WINLINE_REQUEST_TIMEOUT_MS_DEFAULT, 1000, 45000);

  const report = {
    ok: true,
    buildVersion: BUILD_VERSION,
    winlineUrl,
    player1Name: player1Name || null,
    player2Name: player2Name || null,
    fetchStatus: null,
    contentType: null,
    htmlLength: 0,
    pageTitle: null,
    containsPlayer1: false,
    containsPlayer2: false,
    containsOddsLikeNumbers: false,
    oddsLikeSamples: [],
    scriptBlocks: null,
    embeddedJson: { count: 0, kinds: [] },
    marketTitles: [],
    outcomePairs: [],
    selectedMarket: null,
    selectedBy: null,
    selectedOdds: null,
    rejectReasons: [],
    rejectedMarkets: [],
    likelyReason: null,
    recommendation: null
  };

  let response;
  try {
    response = await fetch(winlineUrl, winlineFetchInit(timeoutMs));
  } catch (error) {
    report.ok = false;
    report.rejectReasons = [error?.message || String(error)];
    report.likelyReason = "winline-fetch-failed";
    report.recommendation = "use-node-playwright-odds-service";
    return report;
  }
  report.fetchStatus = Number(response.status || 0);
  report.contentType = String(response.headers.get("content-type") || "").toLowerCase();

  let parserResult = createOddsParserResult();
  if (report.contentType.includes("json")) {
    const rawBody = await response.text();
    report.htmlLength = rawBody.length;
    report.containsOddsLikeNumbers = sampleOddsLikeNumbers(rawBody, 25).length > 0;
    report.oddsLikeSamples = sampleOddsLikeNumbers(rawBody, 25);
    try {
      const payload = JSON.parse(rawBody);
      report.embeddedJson = { count: 1, kinds: [payloadKind(payload)] };
      const parsed = extractWinlineOdds(payload, player1Name, player2Name);
      parserResult = pickBetterParserResult(parserResult, parsed.parserResult);
    } catch (_error) {
      parserResult.rejectReasons = [...(parserResult.rejectReasons || []), "json-parse-failed"];
    }
  } else {
    const htmlValue = await response.text();
    report.htmlLength = htmlValue.length;
    report.pageTitle = extractHtmlTitle(htmlValue);
    report.containsPlayer1 = Boolean(containsPlayerToken(htmlValue, player1Name));
    report.containsPlayer2 = Boolean(containsPlayerToken(htmlValue, player2Name));
    report.oddsLikeSamples = sampleOddsLikeNumbers(htmlValue, 30);
    report.containsOddsLikeNumbers = report.oddsLikeSamples.length > 0;
    report.scriptBlocks = collectScriptDiagnostics(htmlValue);
    const payloads = parseEmbeddedJsonPayloads(htmlValue);
    report.embeddedJson = {
      count: payloads.length,
      kinds: payloads.slice(0, 20).map((item) => payloadKind(item))
    };
    for (const payload of payloads) {
      const parsed = extractWinlineOdds(payload, player1Name, player2Name);
      parserResult = pickBetterParserResult(parserResult, parsed.parserResult);
      if (parsed.home && parsed.away) break;
    }
  }

  report.marketTitles = (parserResult.foundMarkets || []).slice(0, 80);
  report.outcomePairs = (parserResult.foundOutcomePairs || []).slice(0, 40);
  report.selectedMarket = parserResult.selectedMarketTitle || null;
  report.selectedBy = parserResult.selectedBy || null;
  report.selectedOdds = parserResult.selectedOdds || null;
  report.rejectReasons = parserResult.rejectReasons || [];
  report.rejectedMarkets = (parserResult.rejectedMarkets || []).slice(0, 40);

  report.likelyReason = buildProbeLikelyReason(report);
  if (report.likelyReason === "winline-data-loaded-client-side-or-blocked") {
    report.recommendation = "use-node-playwright-odds-service";
  } else if (report.likelyReason === "market-found-but-not-extracted" || report.likelyReason === "market-found-but-odds-pair-missing") {
    report.recommendation = "adjust-market-outcome-mapping";
  } else if (report.likelyReason === "winline-http-error") {
    report.recommendation = "check-winline-availability-and-headers";
  } else {
    report.recommendation = "review-reject-reasons-and-market-samples";
  }

  return report;
}

async function requestOddsServiceJson(env, endpointPath, payload) {
  const config = oddsConfig(env);
  if (!config.oddsServiceBaseUrl) {
    return {
      ok: false,
      configured: false,
      error: "odds-service-not-configured"
    };
  }

  const endpoint = `${config.oddsServiceBaseUrl}${endpointPath}`;
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-odds-secret": config.oddsServiceSecret
      },
      body: JSON.stringify(payload || {}),
      signal: timeoutSignal(7000)
    });
  } catch (error) {
    return {
      ok: false,
      configured: true,
      endpoint,
      error: error?.message || String(error)
    };
  }

  const rawText = await response.text();
  let jsonBody = null;
  try {
    jsonBody = rawText ? JSON.parse(rawText) : null;
  } catch (_error) {
    jsonBody = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      configured: true,
      endpoint,
      status: response.status,
      error: jsonBody?.error || rawText || `HTTP ${response.status}`,
      body: jsonBody
    };
  }

  return {
    ok: true,
    configured: true,
    endpoint,
    status: response.status,
    body: jsonBody || {}
  };
}

async function getSidecarConnectionStatus(env) {
  const config = oddsConfig(env);
  if (!config.oddsServiceBaseUrl) {
    return {
      ok: false,
      configured: false,
      status: "not_configured",
      message: "odds-service не подключён"
    };
  }

  const endpoint = `${config.oddsServiceBaseUrl}/health`;
  const headers = {};
  if (config.oddsServiceSecret) headers["x-odds-secret"] = config.oddsServiceSecret;
  let response;
  try {
    response = await fetch(endpoint, {
      method: "GET",
      headers,
      signal: timeoutSignal(5000)
    });
  } catch (error) {
    return {
      ok: false,
      configured: true,
      status: "unavailable",
      endpoint,
      message: "odds-service недоступен",
      error: error?.message || String(error)
    };
  }

  const rawText = await response.text();
  let body = null;
  try {
    body = rawText ? JSON.parse(rawText) : null;
  } catch (_error) {
    body = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      configured: true,
      status: "unavailable",
      endpoint,
      httpStatus: response.status,
      message: "odds-service недоступен",
      error: body?.error || rawText || `HTTP ${response.status}`,
      body
    };
  }

  return {
    ok: true,
    configured: true,
    status: "ok",
    endpoint,
    httpStatus: response.status,
    message: "odds-service подключён",
    body: body || {}
  };
}

async function discoverWinlineMatches(env, payload) {
  return requestOddsServiceJson(env, "/discover", payload);
}

async function discoverWinlineCandidateViaSidecar(match, env) {
  const requestPayload = {
    matchId: match.id,
    player1Name: match.home?.name || "",
    player2Name: match.away?.name || "",
    tournamentName: match.tournament || "",
    isLive: match.status === "live"
  };
  return discoverWinlineMatches(env, requestPayload);
}

async function requestSidecarRefresh(envOrMatch, matchIdOrEnv) {
  let env = envOrMatch;
  let matchId = matchIdOrEnv;
  if (envOrMatch && typeof envOrMatch === "object" && envOrMatch.id && matchIdOrEnv && typeof matchIdOrEnv === "object") {
    env = matchIdOrEnv;
    matchId = envOrMatch.id;
  }
  const requestPayload = { matchId: oddsMatchKey(matchId) };
  return requestOddsServiceJson(env, "/refresh", requestPayload);
}

async function refreshWinlineOddsState(matchIdRaw, env, options = {}) {
  const matchId = oddsMatchKey(matchIdRaw);
  const force = Boolean(options.force);
  const state = await getOddsStatePersistent(env, matchId);
  if (!state.autoUpdate || !state.winlineUrl || !oddsConfig(env).enabled) {
    return state;
  }

  const conf = oddsConfig(env);
  const now = Date.now();
  if (!force && now - Number(state.lastPolledAt || 0) < conf.pollIntervalMs) {
    return state;
  }
  if (oddsRefreshByMatchId.has(matchId)) {
    return oddsRefreshByMatchId.get(matchId);
  }

  const task = (async () => {
    const startedAt = Date.now();
    await setOddsStatePersistent(env, matchId, { lastPolledAt: startedAt });
    const before = await getOddsStatePersistent(env, matchId);
    const fetched = await fetchOddsByWinlineUrl({
      winlineUrl: before.winlineUrl,
      player1Name: before.player1Name,
      player2Name: before.player2Name,
      timeoutMs: conf.requestTimeoutMs
    });
    if (fetched.ok) {
      return setOddsStatePersistent(env, matchId, {
        source: "winline",
        mode: before.mode === "discovered" ? "discovered" : "url",
        autoUpdate: true,
        odds: fetched.odds,
        updatedAt: fetched.updatedAt,
        lastSuccessAt: fetched.updatedAt,
        lastError: null,
        lastParserResult: fetched.lastParserResult || before.lastParserResult || null,
        stale: false
      });
    }

    const current = await getOddsStatePersistent(env, matchId);
    const stale = true;
    return setOddsStatePersistent(env, matchId, {
      odds: { player1: null, player2: null },
      updatedAt: new Date().toISOString(),
      lastError: fetched.error || "Winline unavailable",
      lastParserResult: fetched.lastParserResult || current.lastParserResult || null,
      stale
    });
  })()
    .catch(async (error) => {
      const current = await getOddsStatePersistent(env, matchId);
      const stale = true;
      return setOddsStatePersistent(env, matchId, {
        odds: { player1: null, player2: null },
        updatedAt: new Date().toISOString(),
        lastError: error?.message || String(error),
        lastParserResult: current.lastParserResult || null,
        stale
      });
    })
    .finally(() => {
      oddsRefreshByMatchId.delete(matchId);
    });

  oddsRefreshByMatchId.set(matchId, task);
  return task;
}

async function currentOdds(url, env) {
  const rawMatchId = String(url.searchParams.get("matchId") || url.searchParams.get("eventId") || "").trim();
  const player1Name = normalizeFreeText(url.searchParams.get("home") || url.searchParams.get("player1") || "");
  const player2Name = normalizeFreeText(url.searchParams.get("away") || url.searchParams.get("player2") || "");
  const winlineUrl = String(url.searchParams.get("winlineUrl") || url.searchParams.get("matchUrl") || "").trim();
  const manual1 = parseOddValue(url.searchParams.get("homeOdd") || url.searchParams.get("player1Odd"));
  const manual2 = parseOddValue(url.searchParams.get("awayOdd") || url.searchParams.get("player2Odd"));
  if (!rawMatchId) {
    const source = manual1 || manual2 ? "manual" : "winline";
    const mode = manual1 || manual2 ? "manual" : "off";
    const sanitized = sanitizeOddsForDisplay(
      { player1: manual1, player2: manual2 },
      { source, mode }
    );
    const player1 = sanitized.odds.player1;
    const player2 = sanitized.odds.player2;
    return {
      ok: true,
      buildVersion: BUILD_VERSION,
      matchId: null,
      source,
      mode,
      autoUpdate: false,
      odds: {
        player1,
        player2,
        home: player1,
        away: player2
      },
      updatedAt: manual1 || manual2 ? new Date().toISOString() : null,
      lastSuccessAt: manual1 || manual2 ? new Date().toISOString() : null,
      lastError: null,
      invalid: !sanitized.valid,
      invalidReason: sanitized.reason,
      stale: true
    };
  }

  const matchId = oddsMatchKey(rawMatchId);
  let state = await getOddsStatePersistent(env, matchId);

  if (player1Name || player2Name || winlineUrl) {
    state = await setOddsStatePersistent(env, matchId, {
      player1Name: player1Name || state.player1Name,
      player2Name: player2Name || state.player2Name,
      winlineUrl: winlineUrl || state.winlineUrl
    });
  }

  if (manual1 || manual2) {
    state = await setManualOddsState(env, matchId, manual1, manual2, {
      player1Name: player1Name || state.player1Name || "",
      player2Name: player2Name || state.player2Name || "",
      winlineUrl: winlineUrl || state.winlineUrl || ""
    });
  }

  return oddsPayload(state, env);
}

async function readRequestJson(request) {
  let payload = null;
  try {
    payload = await request.json();
  } catch (_error) {
    throw new Error("Invalid JSON body");
  }
  if (!payload || typeof payload !== "object") throw new Error("JSON body is required");
  return payload;
}

async function setManualOddsState(env, matchIdRaw, player1Value, player2Value, options = {}) {
  const matchId = oddsMatchKey(matchIdRaw);
  const current = await getOddsStatePersistent(env, matchId);
  const player1 = parseOddValue(player1Value);
  const player2 = parseOddValue(player2Value);
  if (!player1 && !player2) throw new Error("At least one odd is required");
  const timestamp = String(options.updatedAt || "").trim() || new Date().toISOString();
  const state = await setOddsStatePersistent(env, matchId, {
    source: "manual",
    mode: "manual",
    autoUpdate: false,
    player1Name: normalizeFreeText(options.player1Name || current.player1Name || ""),
    player2Name: normalizeFreeText(options.player2Name || current.player2Name || ""),
    winlineUrl: String(options.winlineUrl || current.winlineUrl || "").trim(),
    odds: {
      player1: player1 || current.odds.player1 || null,
      player2: player2 || current.odds.player2 || null
    },
    updatedAt: timestamp,
    lastSuccessAt: timestamp,
    lastError: null,
    stale: false
  });
  await removeActiveOddsMatch(env, matchId);
  return state;
}

async function setManualOddsFromApi(request, env) {
  const payload = await readRequestJson(request);
  const matchId = oddsMatchKey(payload.matchId);
  const state = await setManualOddsState(
    env,
    matchId,
    payload.player1 ?? payload.home ?? payload.homeOdd,
    payload.player2 ?? payload.away ?? payload.awayOdd,
    {
      player1Name: payload.player1Name,
      player2Name: payload.player2Name,
      winlineUrl: payload.winlineUrl,
      updatedAt: payload.updatedAt
    }
  );
  return oddsPayload(state, null);
}

async function setWinlineLinkedState(matchIdRaw, winlineUrlRaw, env, context = {}) {
  const matchId = oddsMatchKey(matchIdRaw);
  const winlineUrl = normalizeWinlineUrl(winlineUrlRaw);
  const current = await getOddsStatePersistent(env, matchId);
  const timestamp = new Date().toISOString();
  const state = await setOddsStatePersistent(env, matchId, {
    source: "winline",
    mode: "sidecar_pending",
    autoUpdate: true,
    winlineUrl,
    winlineEventId: normalizeFreeText(context.winlineEventId || current.winlineEventId || ""),
    player1Name: normalizeFreeText(context.player1Name || current.player1Name || ""),
    player2Name: normalizeFreeText(context.player2Name || current.player2Name || ""),
    odds: { player1: null, player2: null },
    updatedAt: timestamp,
    lastError: "Waiting for sidecar",
    stale: true
  });
  await upsertActiveOddsMatch(env, {
    matchId,
    winlineUrl,
    player1Name: state.player1Name || "",
    player2Name: state.player2Name || "",
    source: "winline",
    mode: "sidecar_pending",
    autoUpdate: true
  });
  return state;
}

async function linkWinlineOdds(matchIdRaw, winlineUrlRaw, env, context = {}) {
  const state = await setWinlineLinkedState(matchIdRaw, winlineUrlRaw, env, context);
  return oddsPayload(state, env);
}

async function linkWinlineOddsFromApi(request, env) {
  const payload = await readRequestJson(request);
  const matchId = oddsMatchKey(payload.matchId);
  return linkWinlineOdds(matchId, payload.winlineUrl, env, {
    mode: "url",
    winlineEventId: payload.winlineEventId,
    player1Name: payload.player1Name,
    player2Name: payload.player2Name
  });
}

async function disableWinlineOddsFromApi(request, env) {
  const payload = await readRequestJson(request);
  const matchId = oddsMatchKey(payload.matchId);
  const current = await getOddsStatePersistent(env, matchId);
  const state = await setOddsStatePersistent(env, matchId, {
    source: current.source || "manual",
    mode: "off",
    autoUpdate: false,
    updatedAt: new Date().toISOString(),
    lastError: null
  });
  await removeActiveOddsMatch(env, matchId);
  return oddsPayload(state, null);
}

async function resetOddsFromApi(request, env) {
  const payload = await readRequestJson(request);
  const matchId = oddsMatchKey(payload.matchId);
  const current = await getOddsStatePersistent(env, matchId);
  const updatedAt = new Date().toISOString();
  const keepAuto = Boolean(current.winlineUrl) && Boolean(current.autoUpdate);
  const nextMode = keepAuto ? "sidecar_pending" : "off";
  const state = await setOddsStatePersistent(env, matchId, {
    source: keepAuto ? "winline" : (current.source || "winline"),
    mode: nextMode,
    autoUpdate: keepAuto,
    odds: { player1: null, player2: null },
    updatedAt,
    lastError: keepAuto ? "Waiting for sidecar" : null,
    stale: true
  });
  if (keepAuto && current.winlineUrl) {
    await upsertActiveOddsMatch(env, {
      matchId,
      winlineUrl: current.winlineUrl,
      player1Name: current.player1Name || "",
      player2Name: current.player2Name || "",
      source: "winline",
      mode: "sidecar_pending",
      autoUpdate: true
    });
  } else {
    await removeActiveOddsMatch(env, matchId);
  }
  return oddsPayload(state, env);
}

async function oddsDebug(url, env) {
  const matchId = oddsMatchKey(url.searchParams.get("matchId") || url.searchParams.get("eventId") || "");
  let state = await getOddsStatePersistent(env, matchId);
  if (state.autoUpdate && state.winlineUrl && String(url.searchParams.get("refresh") || "0") === "1") {
    state = await refreshWinlineOddsState(matchId, env, { force: true });
  }
  const rawStateOdds = {
    player1: state?.odds?.player1 ?? null,
    player2: state?.odds?.player2 ?? null
  };
  const sanitized = sanitizeOddsForDisplay(rawStateOdds, {
    source: state?.source || "winline",
    mode: state?.mode || "off"
  });
  return {
    ok: true,
    buildVersion: BUILD_VERSION,
    matchId,
    source: state?.source || "winline",
    mode: state?.mode || "off",
    autoUpdate: Boolean(state?.autoUpdate),
    winlineUrl: state?.winlineUrl || null,
    marketTitle: state?.marketTitle || null,
    rawStateOdds,
    sanitizedOdds: sanitized.odds,
    invalid: !sanitized.valid,
    invalidReason: sanitized.reason,
    lastParserResult: state?.lastParserResult || createOddsParserResult(),
    lastError: state?.lastError || null,
    updatedAt: state?.updatedAt || null,
    lastSuccessAt: state?.lastSuccessAt || null
  };
}

async function getActiveOddsFromApi(request, env) {
  const expectedSecret = oddsSharedSecret(env);
  if (!expectedSecret) throw new Error("odds-push-secret-not-configured");
  const headerSecret = String(request.headers.get("x-odds-secret") || "").trim();
  if (!headerSecret || headerSecret !== expectedSecret) throw new Error("forbidden");
  const matches = await listActiveOddsMatches(env);
  return {
    ok: true,
    buildVersion: BUILD_VERSION,
    count: matches.length,
    matches
  };
}

async function pushOddsFromSidecar(request, env) {
  const expectedSecret = oddsSharedSecret(env);
  if (!expectedSecret) throw new Error("odds-push-secret-not-configured");
  const headerSecret = String(request.headers.get("x-odds-secret") || "").trim();
  if (!headerSecret || headerSecret !== expectedSecret) throw new Error("forbidden");

  const payload = await readRequestJson(request);
  const matchId = oddsMatchKey(payload.matchId);
  const player1 = parseOddValue(payload.player1 ?? payload.home ?? payload.homeOdd);
  const player2 = parseOddValue(payload.player2 ?? payload.away ?? payload.awayOdd);
  const current = await getOddsStatePersistent(env, matchId);

  if (current.mode === "manual" || current.autoUpdate === false) {
    return {
      ...oddsPayload(current, env),
      ignored: true,
      ignoredReason: current.mode === "manual" ? "manual-mode" : "auto-update-disabled"
    };
  }

  const timestamp = String(payload.updatedAt || "").trim() || new Date().toISOString();
  const source = normalizeFreeText(payload.source || current.source || "winline-playwright");
  const marketTitle = normalizeFreeText(payload.marketTitle || "");
  const payloadError = normalizeFreeText(payload.error || "");
  const incomingWinlineUrlRaw = String(payload.winlineUrl || "").trim();
  let incomingWinlineUrl = "";
  if (incomingWinlineUrlRaw) {
    try {
      incomingWinlineUrl = normalizeWinlineUrl(incomingWinlineUrlRaw);
    } catch (_error) {
      incomingWinlineUrl = "";
    }
  }

  const sidecarSource = source.toLowerCase().includes("playwright") || source.toLowerCase().includes("sidecar");
  const mode = current.mode === "manual"
    ? "manual"
    : (sidecarSource ? "sidecar" : (current.mode === "off" ? "sidecar" : current.mode || "sidecar"));
  const autoUpdate = current.mode === "manual" ? false : current.autoUpdate !== false;
  const isNullPush = player1 === null && player2 === null;
  const sanitized = sanitizeOddsForDisplay({ player1, player2 }, { source, mode });

  const hasValidPair = Boolean(sanitized.valid && sanitized.odds.player1 && sanitized.odds.player2);
  const nextOdds = hasValidPair
    ? {
        player1: sanitized.odds.player1,
        player2: sanitized.odds.player2
      }
    : { player1: null, player2: null };
  const nextLastSuccessAt = hasValidPair ? timestamp : current.lastSuccessAt;
  const nextLastError = hasValidPair
    ? null
    : (
      payloadError
      || (isNullPush ? "Waiting for sidecar odds" : `Odds rejected: ${sanitized.reason || "invalid"}`)
    );

  const state = await setOddsStatePersistent(env, matchId, {
    source,
    mode,
    autoUpdate,
    odds: nextOdds,
    updatedAt: timestamp,
    lastSuccessAt: nextLastSuccessAt,
    lastError: nextLastError,
    winlineUrl: current.winlineUrl || incomingWinlineUrl || "",
    marketTitle: marketTitle || current.marketTitle || "",
    stale: !hasValidPair
  });
  if (state.autoUpdate && state.winlineUrl) {
    await upsertActiveOddsMatch(env, {
      matchId,
      winlineUrl: state.winlineUrl,
      player1Name: state.player1Name || "",
      player2Name: state.player2Name || "",
      source: state.source || "winline",
      mode: state.mode || "sidecar",
      autoUpdate: true
    });
  }
  return oddsPayload(state, env);
}

function oddsSourceModeLabel(oddsState, manualHomeValue, manualAwayValue) {
  if (oddsState) {
    const mode = String(oddsState.mode || "off").trim().toLowerCase();
    if (mode === "manual") return "manual";
    if (mode === "sidecar") return "sidecar";
    if (mode === "sidecar_pending" || mode === "url") return "sidecar_pending";
    if (mode === "off") return oddsState.winlineUrl ? "off" : "none";
    return mode || "none";
  }
  if (manualHomeValue || manualAwayValue) return "manual";
  return "none";
}

function oddsSummary(custom = {}, oddsState = null) {
  const manualHomeValue = custom.homeOdd || (custom.odds && custom.odds.manualPlayer1) || "";
  const manualAwayValue = custom.awayOdd || (custom.odds && custom.odds.manualPlayer2) || "";
  const sourceLabel = oddsState
    ? `${oddsState.mode || "off"}${oddsState.autoUpdate ? ", авто" : ", ручной"}`
    : manualHomeValue || manualAwayValue
      ? "manual, ручной"
      : "авто";
  const sanitizedState = sanitizeOddsForDisplay(
    {
      player1: oddsState?.odds?.player1 ?? null,
      player2: oddsState?.odds?.player2 ?? null
    },
    {
      source: oddsState?.source || "winline",
      mode: oddsState?.mode || "off"
    }
  );
  const manualHome = oddsToDisplay(manualHomeValue);
  const manualAway = oddsToDisplay(manualAwayValue);
  return {
    home: manualHome || sanitizedState.odds.player1 || "-",
    away: manualAway || sanitizedState.odds.player2 || "-",
    mode: oddsSourceModeLabel(oddsState, manualHomeValue, manualAwayValue)
  };
}

async function sportsTennisNews(env) {
  const sourceUrl = String(env.SPORTS_TENNIS_NEWS_URL || SPORTS_TENNIS_NEWS_URL).trim();
  const pages = await sportsNewsPages(sourceUrl);
  const candidates = uniqueNewsItems(pages.flatMap(({ htmlValue, pageUrl }) => parseSportsTennisNews(htmlValue, pageUrl, NEWS_CANDIDATE_LIMIT)));
  const moderation = await safeNewsItems(candidates, NEWS_LIMIT);
  const items = moderation.items;
  if (!items.length) throw new Error("Sports.ru safe news parser returned no items");
  return {
    ok: true,
    source: "sports.ru",
    sourceUrl,
    generatedAt: new Date().toISOString(),
    moderation: {
      safe: true,
      blocked: moderation.blocked.length,
      scanned: moderation.scanned
    },
    items
  };
}

async function sportsNewsPages(sourceUrl) {
  const pages = [];
  for (let page = 1; page <= NEWS_SOURCE_PAGES; page += 1) {
    const pageUrl = sportsNewsPageUrl(sourceUrl, page);
    const response = await fetch(pageUrl, {
      headers: sportsNewsHeaders(),
      cf: { cacheTtl: 120, cacheEverything: false }
    });
    if (!response.ok) {
      if (page === 1) throw new Error(`Sports.ru ${response.status}`);
      continue;
    }
    pages.push({ pageUrl, htmlValue: await response.text() });
  }
  return pages;
}

function sportsNewsPageUrl(sourceUrl, page) {
  if (page <= 1) return sourceUrl;
  const url = new URL(sourceUrl);
  url.searchParams.set("page", String(page));
  return url.toString();
}

function sportsNewsHeaders() {
  return {
    "user-agent": "Mozilla/5.0 Tennis Overlay News Bot",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.5,en;q=0.4"
  };
}

function parseSportsTennisNews(htmlValue, sourceUrl, limit = 15) {
  const section = sportsTopNewsSection(htmlValue);
  const items = [];
  const seen = new Set();
  const paragraphPattern = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  while ((match = paragraphPattern.exec(section)) && items.length < limit) {
    const row = match[1] || "";
    const linkMatch = row.match(/<a\s+[^>]*class=["'][^"']*\bshort-text\b[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;
    const title = cleanHtmlText(linkMatch[2]);
    const url = absoluteSportsUrl(linkMatch[1]);
    if (!title || !url) continue;
    if (!/^https:\/\/www\.sports\.ru\/tennis\//i.test(url)) continue;
    const key = url.split("#", 1)[0];
    if (seen.has(key)) continue;
    seen.add(key);
    const time = cleanHtmlText(row.match(/<span\s+class=["']time["'][^>]*>([\s\S]*?)<\/span>/i)?.[1] || "");
    items.push({
      title,
      url,
      source: "Sports.ru",
      time,
      context: cleanHtmlText(row)
    });
  }
  return items;
}

function uniqueNewsItems(items) {
  const out = [];
  const seen = new Set();
  for (const item of items) {
    const key = String(item.url || "").split("#", 1)[0];
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

async function safeNewsItems(candidates, limit) {
  const items = [];
  const blocked = [];
  let scanned = 0;

  for (const item of candidates) {
    if (scanned >= NEWS_CANDIDATE_LIMIT || items.length >= limit) break;
    scanned += 1;

    const reasons = await newsModerationReasonsForItem(item);
    if (reasons.length) {
      blocked.push({ title: item.title, url: item.url, reasons });
      continue;
    }
    items.push(newsPublicItem(item));
  }

  return { items, blocked, scanned };
}

function newsPublicItem(item) {
  return {
    title: item.title,
    url: item.url,
    source: item.source,
    time: item.time
  };
}

async function newsModerationReasonsForItem(item) {
  const initial = newsModerationReasons([item.title, item.url, item.context].filter(Boolean).join(" "));
  if (initial.length) return initial;

  const articleText = await fetchSportsArticlePlainText(item.url);
  return newsModerationReasons(articleText);
}

async function fetchSportsArticlePlainText(url) {
  try {
    const response = await fetch(url, {
      headers: sportsNewsHeaders(),
      cf: { cacheTtl: 300, cacheEverything: false }
    });
    if (!response.ok) return "";
    const htmlValue = await response.text();
    return sportsArticlePlainText(htmlValue).slice(0, 12000);
  } catch (_error) {
    return "";
  }
}

function sportsArticlePlainText(htmlValue) {
  const start = htmlValue.indexOf("<h1");
  if (start < 0) return cleanHtmlText(htmlValue.slice(0, 30000));

  const commentStart = htmlValue.indexOf("comments-list", start);
  const contentEnd = commentStart > start ? commentStart : start + 30000;
  return cleanHtmlText(htmlValue.slice(start, contentEnd));
}

function newsModerationReasons(value) {
  const textValue = normalizeModerationText(value);
  if (!textValue) return [];

  const reasons = [];
  for (const rule of NEWS_SAFE_HARD_PATTERNS) {
    if (rule.pattern.test(textValue)) reasons.push(rule.reason);
  }

  if (NEWS_COUNTRY_CONTEXT_PATTERN.test(textValue) && NEWS_POLITICAL_CONTEXT_PATTERN.test(textValue)) {
    reasons.push("country-politics-context");
  }

  return [...new Set(reasons)];
}

function normalizeModerationText(value) {
  return String(value || "").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

function sportsTopNewsSection(htmlValue) {
  const topMarker = 'href="/tennis/news/top/?page=2"';
  const markerIndex = htmlValue.indexOf(topMarker);
  const startSearch = markerIndex >= 0 ? markerIndex : 0;
  const newsStart = htmlValue.indexOf('<div class="news"', startSearch);
  if (newsStart < 0) return htmlValue;
  const candidates = [
    htmlValue.indexOf('<div class="news"', newsStart + 1),
    htmlValue.indexOf('<div class="pageNavigation"', newsStart + 1)
  ].filter((index) => index > newsStart);
  const newsEnd = candidates.length ? Math.min(...candidates) : htmlValue.length;
  return htmlValue.slice(newsStart, newsEnd);
}

function absoluteSportsUrl(href) {
  const value = decodeHtml(String(href || "").trim());
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `https://www.sports.ru${value}`;
  try {
    return new URL(value, SPORTS_TENNIS_NEWS_URL).toString();
  } catch (_error) {
    return "";
  }
}

function cleanHtmlText(value) {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function decodeHtml(value) {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
    nbsp: " "
  };
  return String(value || "").replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (full, entity) => {
    const key = entity.toLowerCase();
    if (key[0] === "#") {
      const code = key.startsWith("#x") ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : full;
    }
    return Object.prototype.hasOwnProperty.call(named, key) ? named[key] : full;
  });
}

async function telegramWebhook(request, env, origin) {
  if (!env.TELEGRAM_BOT_TOKEN) {
    return json({ ok: false, error: "TELEGRAM_BOT_TOKEN is not configured" }, 500);
  }
  const expectedSecret = String(env.TELEGRAM_WEBHOOK_SECRET || "").trim();
  if (expectedSecret && request.headers.get("x-telegram-bot-api-secret-token") !== expectedSecret) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  try {
    const update = await request.json();
    await handleTelegramUpdate(update, env, origin);
  } catch (error) {
    console.log("telegram webhook error", error?.stack || error?.message || String(error));
  }
  return json({ ok: true });
}

async function handleTelegramUpdate(update, env, origin) {
  if (update.message) {
    const message = update.message;
    const chatId = message.chat?.id;
    const textValue = String(message.text || message.caption || "").trim();
    if (!chatId) return;
    if (message.message_id && textValue) {
      await safeDeleteMessage(env, chatId, message.message_id);
    }

    const replyMessageId = message.reply_to_message?.message_id;
    if (replyMessageId && textValue) {
      const pending = consumePendingEdit(chatId, replyMessageId);
      if (pending) {
        if (pending.block === "winline_url") {
          const parsedLink = parseWinlineUrlInput(textValue);
          if (!parsedLink.ok) {
            const modeKey = BOT_MODES.has(pending.mode) ? pending.mode : "stats";
            const speedKey = TICKER_SPEEDS[pending.speed] ? pending.speed : "normal";
            const match = await findMatch(env, pending.matchId);
            const custom = match ? getOverlayCustom(chatId, match.id, pending.program, modeKey, speedKey) : {};
            await replaceFlowMessage(env, chatId, getFlowMessageId(chatId), {
              text: [
                "Не вижу корректную ссылку Winline.",
                "Пришли URL вида https://winline.ru/... на конкретный матч.",
                "",
                match ? editMenuText(match, pending.program, modeKey, speedKey, custom) : ""
              ].filter(Boolean).join("\n"),
              reply_markup: match ? winlineMenuUnified(match, pending.program, modeKey, speedKey) : undefined,
              disable_web_page_preview: true
            });
            return;
          }
          await applyWinlineLinkFromChat(env, origin, chatId, {
            matchId: pending.matchId,
            program: pending.program,
            mode: pending.mode,
            speed: pending.speed,
            winlineUrl: parsedLink.winlineUrl
          });
          return;
        }

        const parsedPayload = parseReplyEditPayload(pending.block, textValue);
        if (!parsedPayload.ok) {
          const modeKey = BOT_MODES.has(pending.mode) ? pending.mode : "stats";
          const speedKey = TICKER_SPEEDS[pending.speed] ? pending.speed : "normal";
          const match = await findMatch(env, pending.matchId);
          if (match) {
            const custom = getOverlayCustom(chatId, match.id, pending.program, modeKey, speedKey);
            await replaceFlowMessage(env, chatId, getFlowMessageId(chatId), {
              text: [
                `Не понял формат ответа. Ожидаю: ${parsedPayload.hint || "два значения через запятую"}.`,
                "",
                editMenuText(match, pending.program, modeKey, speedKey, custom)
              ].join("\n"),
              reply_markup: editBlocksMenu(match, pending.program, modeKey, speedKey),
              disable_web_page_preview: true
            });
          } else {
            await replaceFlowMessage(env, chatId, getFlowMessageId(chatId), {
              text: `Не понял формат ответа. Ожидаю: ${parsedPayload.hint || "два значения через запятую"}.`,
              disable_web_page_preview: true
            });
          }
          return;
        }

        await applyEditBlock(env, origin, chatId, {
          matchId: pending.matchId,
          program: pending.program,
          mode: pending.mode,
          speed: pending.speed,
          ...parsedPayload
        }, pending.block);
        return;
      }
    }

    const command = textValue.split(/\s+/, 1)[0].replace(/@listen_bolshe_bot$/i, "").toLowerCase();
    if (command === "/start" || command === "start" || command === "/overlay" || command === "overlay") {
      const menu = await liveMenu(env);
      await replaceFlowMessage(env, chatId, getFlowMessageId(chatId), {
        text: menu.text,
        reply_markup: menu.reply_markup,
        disable_web_page_preview: true
      });
      return;
    }

    if (command === "/names" || command === "names") {
      const parsed = parseNamesCommand(textValue);
      if (!parsed.ok) {
        await telegramApi(env, "sendMessage", {
          chat_id: chatId,
          text: [
            "Формат команды:",
            "/names <matchId> <program> <mode> <speed> <homeName> ; <awayName> ; <homeCode> ; <awayCode> ; <stage>",
            "",
            "Пример:",
            "/names WIzfqXXr obs stats normal Д. МЕДВЕДЕВ ; Х-М. СЕРУНДОЛО ; RUS ; USA ; ПЕРВЫЙ КРУГ"
          ].join("\n")
        });
        return;
      }

      const match = await findMatch(env, parsed.matchId);
      if (!match) {
        await telegramApi(env, "sendMessage", {
          chat_id: chatId,
          text: "Матч не найден или уже исчез из live-списка. Выбери его заново через /start."
        });
        return;
      }
      if (!PROGRAM_LABELS[parsed.program]) {
        await telegramApi(env, "sendMessage", {
          chat_id: chatId,
          text: "Неверная программа. Используй obs, streamlabs или vmix."
        });
        return;
      }

      const speedKey = TICKER_SPEEDS[parsed.speed] ? parsed.speed : "normal";
      const modeKey = BOT_MODES.has(parsed.mode) ? parsed.mode : "stats";
      const patch = {
        homeName: parsed.homeName,
        awayName: parsed.awayName,
        homeCode: parsed.homeCode,
        awayCode: parsed.awayCode,
        stage: parsed.stage
      };
      const beforeCustom = getOverlayCustom(chatId, parsed.matchId, parsed.program, modeKey, speedKey);
      const beforeUrl = overlayPageUrl(origin, match, modeKey, speedKey, beforeCustom);
      const custom = setOverlayCustom(chatId, parsed.matchId, parsed.program, modeKey, speedKey, patch);
      const url = patchOverlayUrl(beforeUrl, overlayUrlPatchFromSettingsPatch(patch));
      await telegramApi(env, "sendMessage", {
        chat_id: chatId,
        text: [
          "✅ Готово, кастомные подписи применены.",
          "",
          `Матч: ${matchTitle(match)}`,
          `Программа: ${PROGRAM_LABELS[parsed.program]}`,
          `Режим: ${modeLabel(modeKey)}`,
          "",
          `URL:\n${url}`
        ].join("\n"),
        disable_web_page_preview: true
      });
      return;
    }

    if (command === "/edit_names" || command === "edit_names") {
      const parsed = parseEditNamesCommand(textValue);
      if (!parsed.ok) {
        await telegramApi(env, "sendMessage", {
          chat_id: chatId,
          text: [
            "Формат команды:",
            "/edit_names <matchId> <program> <mode> <speed> <homeName> ; <awayName>",
            "",
            "Пример:",
            "/edit_names WIzfqXXr obs stats normal Д. МЕДВЕДЕВ ; Х-М. СЕРУНДОЛО"
          ].join("\n")
        });
        return;
      }
      await applyEditBlock(env, origin, chatId, parsed, "names");
      return;
    }

    if (command === "/edit_codes" || command === "edit_codes") {
      const parsed = parseEditCodesCommand(textValue);
      if (!parsed.ok) {
        await telegramApi(env, "sendMessage", {
          chat_id: chatId,
          text: [
            "Формат команды:",
            "/edit_codes <matchId> <program> <mode> <speed> <homeShortCode>, <awayShortCode>",
            "",
            "Пример:",
            "/edit_codes WIzfqXXr obs stats normal МЕД, СЕР"
          ].join("\n")
        });
        return;
      }
      await applyEditBlock(env, origin, chatId, parsed, "codes");
      return;
    }

    if (command === "/edit_countries" || command === "edit_countries") {
      const parsed = parseEditCountriesCommand(textValue);
      if (!parsed.ok) {
        await telegramApi(env, "sendMessage", {
          chat_id: chatId,
          text: [
            "Формат команды:",
            "/edit_countries <matchId> <program> <mode> <speed> <homeCountry>, <awayCountry>",
            "",
            "Пример:",
            "/edit_countries WIzfqXXr obs stats normal RUS, USA"
          ].join("\n")
        });
        return;
      }
      await applyEditBlock(env, origin, chatId, parsed, "countries");
      return;
    }

    if (command === "/edit_stage" || command === "edit_stage") {
      const parsed = parseEditStageCommand(textValue);
      if (!parsed.ok) {
        await telegramApi(env, "sendMessage", {
          chat_id: chatId,
          text: [
            "Формат команды:",
            "/edit_stage <matchId> <program> <mode> <speed> <stage>",
            "",
            "Пример:",
            "/edit_stage WIzfqXXr obs stats normal ТРЕТИЙ КРУГ"
          ].join("\n")
        });
        return;
      }
      await applyEditBlock(env, origin, chatId, parsed, "stage");
      return;
    }

    if (command === "/edit_odds" || command === "edit_odds") {
      const parsed = parseEditOddsCommand(textValue);
      if (!parsed.ok) {
        await telegramApi(env, "sendMessage", {
          chat_id: chatId,
          text: [
            "Формат команды:",
            "/edit_odds <matchId> <program> <mode> <speed> <homeOdd> ; <awayOdd>",
            "",
            "Пример:",
            "/edit_odds WIzfqXXr obs stats normal 1.74 ; 2.15"
          ].join("\n")
        });
        return;
      }
      await applyEditBlock(env, origin, chatId, parsed, "odds");
      return;
    }

    if (command === "/admin_match_settings_debug" || command === "admin_match_settings_debug") {
      const args = textValue.split(/\s+/).slice(1).filter(Boolean);
      if (!args.length) {
        await telegramApi(env, "sendMessage", {
          chat_id: chatId,
          text: "Формат: /admin_match_settings_debug <matchId> [mode] [speed] [program]"
        });
        return;
      }
      const matchId = String(args[0] || "").trim();
      const modeArg = BOT_MODES.has(String(args[1] || "").toLowerCase()) ? String(args[1]).toLowerCase() : "stats";
      const speedArg = TICKER_SPEEDS[String(args[2] || "").toLowerCase()] ? String(args[2]).toLowerCase() : "normal";
      const programArg = PROGRAM_LABELS[String(args[3] || "").toLowerCase()] ? String(args[3]).toLowerCase() : "obs";
      const match = await findMatch(env, matchId);
      const custom = getOverlayCustom(chatId, matchId, programArg, modeArg, speedArg);
      const oddsState = getOddsState(matchId);
      const sessionKey = overlaySessionKey(chatId, matchId, programArg, modeArg, speedArg);
      const payload = {
        chatId,
        matchId,
        sessionKey,
        hasSession: overlayCustomBySession.has(sessionKey),
        custom,
        userOverrides: {
          player1: (custom.player1 && custom.player1.manualOverrides) || {},
          player2: (custom.player2 && custom.player2.manualOverrides) || {}
        },
        settingsUpdatedAt: custom.updatedAt || null,
        oddsState,
        oddsLastSuccessAtMsk: formatIsoTime(oddsState.lastSuccessAt || oddsState.updatedAt),
        oddsSettings: custom.odds || {},
        sourceMatch: match
          ? {
              id: match.id || null,
              home: match.home?.name || null,
              away: match.away?.name || null,
              tournament: match.tournament || null,
              status: match.status || null,
              startTimeUnix: Number(match.startTimeUnix || 0) || null
            }
          : null,
        matchFound: Boolean(match),
        matchTitle: match ? `${match.home?.name || ""} - ${match.away?.name || ""}` : null
      };
      await telegramApi(env, "sendMessage", {
        chat_id: chatId,
        text: truncate(JSON.stringify(payload, null, 2), 3600)
      });
      return;
    }

    await replaceFlowMessage(env, chatId, getFlowMessageId(chatId), {
      text: [
        "Давай начнем с простого сценария.",
        "",
        "1) Нажми /start",
        "2) Выбери матч",
        "3) Выбери программу",
        "4) Выбери режим",
        "",
        "Для ручных правок доступны команды:",
        "/edit_names, /edit_codes, /edit_countries, /edit_stage, /edit_odds",
        "",
        "Отладка:",
        "/admin_match_settings_debug <matchId>"
      ].join("\n")
    });
    return;
  }

  if (update.callback_query) {
    const callback = update.callback_query;
    const chatId = callback.message?.chat?.id;
    const messageId = callback.message?.message_id;
    const data = String(callback.data || "");
    if (!chatId || !messageId) return;
    await handleTelegramCallback(env, origin, callback.id, chatId, messageId, data);
  }
}

async function handleTelegramCallback(env, origin, callbackId, chatId, messageId, data) {
  if (data === "live") {
    const menu = await liveMenu(env);
    await replaceFlowMessage(env, chatId, messageId, {
      text: menu.text,
      reply_markup: menu.reply_markup,
      disable_web_page_preview: true
    });
    await answerCallback(env, callbackId);
    return;
  }

  if (data.startsWith("m|")) {
    const match = await findMatch(env, data.split("|")[1]);
    if (!match) {
      await answerCallback(env, callbackId, "Матч уже закончился или пропал из live", true);
      return;
    }
    await replaceFlowMessage(env, chatId, messageId, {
      text: [
        "Отлично, матч выбран.",
        "",
        matchTitle(match),
        "",
        "Шаг 2 из 4: выбери программу, где ты добавишь ссылку (OBS, Streamlabs или vMix)."
      ].join("\n"),
      reply_markup: programMenu(match),
      disable_web_page_preview: true
    });
    await answerCallback(env, callbackId);
    return;
  }

  if (data.startsWith("p|")) {
    const [, matchId, program] = data.split("|");
    const match = await findMatch(env, matchId);
    if (!match) {
      await answerCallback(env, callbackId, "Матч уже закончился или пропал из live", true);
      return;
    }
    if (!PROGRAM_LABELS[program]) {
      await answerCallback(env, callbackId, "Программа не найдена", true);
      return;
    }
    await replaceFlowMessage(env, chatId, messageId, {
      text: [
        matchTitle(match),
        "",
        `Программа: ${PROGRAM_LABELS[program]}`,
        "",
        "Шаг 3 из 4: выбери, что именно нужно вывести в эфир."
      ].join("\n"),
      reply_markup: modeMenu(match, program),
      disable_web_page_preview: true
    });
    await answerCallback(env, callbackId);
    return;
  }

  if (data.startsWith("r|")) {
    const [, matchId, program, mode] = data.split("|");
    const match = await findMatch(env, matchId);
    if (!match) {
      await answerCallback(env, callbackId, "Матч уже закончился или пропал из live", true);
      return;
    }
    if (!PROGRAM_LABELS[program]) {
      await answerCallback(env, callbackId, "Программа не найдена", true);
      return;
    }
    if (!BOT_MODES.has(mode)) {
      await answerCallback(env, callbackId, "Режим не найден", true);
      return;
    }
    const speed = "normal";
    if (mode === "stats") {
      const custom = getOverlayCustom(chatId, match.id, program, mode, speed);
      await replaceFlowMessage(env, chatId, messageId, {
        text: overlayInstructions(origin, match, program, mode, speed, custom),
        reply_markup: readyMenuUnified(match, program, mode, speed, custom),
        disable_web_page_preview: true
      });
      await answerCallback(env, callbackId, "Ссылка готова");
      return;
    }
    const current = getOverlayCustom(chatId, match.id, program, mode, speed);
    const sizeKey = tickerSizeKey(current.tickerSize);
    await replaceFlowMessage(env, chatId, messageId, {
      text: [
        matchTitle(match),
        "",
        `Программа: ${PROGRAM_LABELS[program]}`,
        `Режим: ${modeLabel(mode)}`,
        "",
        "\u0428\u0430\u0433 4 \u0438\u0437 4: \u0432\u044b\u0431\u0435\u0440\u0438 \u0440\u0430\u0437\u043c\u0435\u0440 \u0431\u0435\u0433\u0443\u0449\u0435\u0439 \u0441\u0442\u0440\u043e\u043a\u0438.",
        "\u0421\u043a\u043e\u0440\u043e\u0441\u0442\u044c \u043c\u0435\u043d\u044f\u0439 \u0432 URL \u0447\u0435\u0440\u0435\u0437 \u043f\u0430\u0440\u0430\u043c\u0435\u0442\u0440 ticker (\u043d\u0430\u043f\u0440\u0438\u043c\u0435\u0440, ticker=70)."
      ].join("\n"),
      reply_markup: tickerSizeMenu(match, program, mode, speed, sizeKey),
      disable_web_page_preview: true
    });
    await answerCallback(env, callbackId);
    return;
  }

  if (data.startsWith("s|")) {
    await answerCallback(env, callbackId, "\u0421\u043a\u043e\u0440\u043e\u0441\u0442\u044c \u043c\u0435\u043d\u044f\u0439 \u0432 URL: ?ticker=70");
    return;
  }

  if (data.startsWith("z|")) {
    const [, matchId, program, mode, speedOrSize, maybeSize] = data.split("|");
    const speed = "normal";
    const size = maybeSize || speedOrSize;
    const match = await findMatch(env, matchId);
    if (!match) {
      await answerCallback(env, callbackId, "Матч уже закончился или пропал из live", true);
      return;
    }
    if (!PROGRAM_LABELS[program]) {
      await answerCallback(env, callbackId, "Программа не найдена", true);
      return;
    }
    if (!BOT_MODES.has(mode)) {
      await answerCallback(env, callbackId, "Режим не найден", true);
      return;
    }
    if (mode !== "ticker") {
      await answerCallback(env, callbackId, "Размер доступен только для гибкой строки", true);
      return;
    }
    const sizeKey = tickerSizeKey(size);
    const current = getOverlayCustom(chatId, match.id, program, mode, speed);
    const patch = { tickerSize: sizeKey };
    const beforeUrl = overlayPageUrl(origin, match, mode, speed, current);
    const custom = setOverlayCustom(chatId, match.id, program, mode, speed, patch);
    const patchedUrl = patchOverlayUrl(beforeUrl, overlayUrlPatchFromSettingsPatch(patch));
    await replaceFlowMessage(env, chatId, messageId, {
      text: overlayInstructions(origin, match, program, mode, speed, custom, patchedUrl),
      reply_markup: readyMenuUnified(match, program, mode, speed, custom),
      disable_web_page_preview: true
    });
    await answerCallback(env, callbackId, "Готово");
    return;
  }

  if (data.startsWith("d|")) {
    const [, matchId, program, mode, speed, action] = data.split("|");
    const match = await findMatch(env, matchId);
    if (!match) {
      await answerCallback(env, callbackId, "Матч уже закончился или пропал из live", true);
      return;
    }
    if (!PROGRAM_LABELS[program]) {
      await answerCallback(env, callbackId, "Программа не найдена", true);
      return;
    }
    if (mode !== "stats") {
      await answerCallback(env, callbackId, "Задержка доступна только для статистики матча", true);
      return;
    }
    const speedKey = TICKER_SPEEDS[speed] ? speed : "normal";
    const current = getOverlayCustom(chatId, match.id, program, mode, speedKey);
    const currentDelay = statsDelaySeconds(current.statsDelaySec);
    if (action === "show") {
      await answerCallback(env, callbackId, `Текущая задержка: ${currentDelay} сек`);
      return;
    }
    const delta = action === "dec" ? -STATS_DELAY_STEP_SECONDS : STATS_DELAY_STEP_SECONDS;
    const nextDelay = statsDelaySeconds(currentDelay + delta);
    const patch = { statsDelaySec: nextDelay > 0 ? nextDelay : "" };
    const beforeUrl = overlayPageUrl(origin, match, mode, speedKey, current);
    const custom = setOverlayCustom(chatId, match.id, program, mode, speedKey, patch);
    const patchedUrl = patchOverlayUrl(beforeUrl, overlayUrlPatchFromSettingsPatch(patch));
    await replaceFlowMessage(env, chatId, messageId, {
      text: overlayInstructions(origin, match, program, mode, speedKey, custom, patchedUrl),
      reply_markup: readyMenuUnified(match, program, mode, speedKey, custom),
      disable_web_page_preview: true
    });
    await answerCallback(env, callbackId, `Задержка: ${nextDelay} сек`);
    return;
  }

  if (data.startsWith("e|")) {
    const [, matchId, program, mode, speed] = data.split("|");
    const match = await findMatch(env, matchId);
    if (match) {
      await replaceFlowMessage(env, chatId, messageId, {
        text: editMenuText(match, program, mode, speed, getOverlayCustom(chatId, match.id, program, mode, speed)),
        reply_markup: editBlocksMenu(match, program, mode, speed),
        disable_web_page_preview: true
      });
      await answerCallback(env, callbackId);
      return;
    }
    if (!match) {
      await answerCallback(env, callbackId, "Матч уже закончился или пропал из live", true);
      return;
    }
  }

  if (data.startsWith("ow|")) {
    const [, matchId, program, mode, speed] = data.split("|");
    const match = await findMatch(env, matchId);
    if (!match) {
      await answerCallback(env, callbackId, "Матч уже закончился или пропал из live", true);
      return;
    }
    const modeKey = BOT_MODES.has(mode) ? mode : "stats";
    const speedKey = TICKER_SPEEDS[speed] ? speed : "normal";
    const custom = getOverlayCustom(chatId, match.id, program, modeKey, speedKey);
    const oddsState = await getOddsStatePersistent(env, match.id);
    const sidecarStatus = await getSidecarConnectionStatus(env);
    await replaceFlowMessage(env, chatId, messageId, {
      text: winlineMenuTextUnified(match, program, modeKey, custom, oddsState, sidecarStatus),
      reply_markup: winlineMenuUnified(match, program, modeKey, speedKey),
      disable_web_page_preview: true
    });
    await answerCallback(env, callbackId);
    return;
  }

  if (data.startsWith("owl|")) {
    const [, matchId, program, mode, speed] = data.split("|");
    const match = await findMatch(env, matchId);
    if (!match) {
      await answerCallback(env, callbackId, "Матч уже закончился или пропал из live", true);
      return;
    }
    const prompt = await replaceFlowMessage(env, chatId, messageId, {
      text: [
        "Пришли ссылку на конкретный матч Winline.",
        "Я привяжу её к этому матчу и начну автообновление коэффициентов."
      ].join("\n"),
      reply_markup: { force_reply: true, selective: true },
      disable_web_page_preview: true
    });
    const replyMessageId = prompt?.result?.message_id;
    if (replyMessageId) {
      rememberPendingEdit(chatId, replyMessageId, { matchId, program, mode, speed, block: "winline_url" });
    }
    await answerCallback(env, callbackId);
    return;
  }

  if (data.startsWith("owe|")) {
    const [, matchId, program, mode, speed] = data.split("|");
    const match = await findMatch(env, matchId);
    if (!match) {
      await answerCallback(env, callbackId, "Матч уже недоступен", true);
      return;
    }
    const current = await getOddsStatePersistent(env, match.id);
    if (!current.winlineUrl) {
      const custom = getOverlayCustom(chatId, match.id, program, mode, speed);
      const sidecarStatus = await getSidecarConnectionStatus(env);
      await replaceFlowMessage(env, chatId, messageId, {
        text: winlineMenuTextUnified(match, program, mode, custom, current, sidecarStatus),
        reply_markup: winlineMenuUnified(match, program, mode, speed),
        disable_web_page_preview: true
      });
      await answerCallback(env, callbackId, "Сначала подключи ссылку Winline", true);
      return;
    }
    const state = await setOddsStatePersistent(env, match.id, {
      source: "winline",
      mode: "sidecar_pending",
      autoUpdate: true,
      updatedAt: new Date().toISOString(),
      lastError: "Waiting for sidecar",
      stale: true
    });
    await upsertActiveOddsMatch(env, {
      matchId: match.id,
      winlineUrl: state.winlineUrl,
      player1Name: state.player1Name || match.home?.name || "",
      player2Name: state.player2Name || match.away?.name || "",
      source: "winline",
      mode: "sidecar_pending",
      autoUpdate: true
    });
    const custom = getOverlayCustom(chatId, match.id, program, mode, speed);
    const sidecarStatus = await getSidecarConnectionStatus(env);
    const enableMessage = !sidecarStatus.configured
      ? "Автообновление включено, но odds-service не подключён. Кэфы не обновятся, пока sidecar не запущен."
      : sidecarStatus.ok
        ? "Автообновление включено. odds-service подключён."
        : "Автообновление включено, но odds-service сейчас недоступен.";
    await replaceFlowMessage(env, chatId, messageId, {
      text: overlayInstructions(origin, match, program, mode, speed, custom),
      reply_markup: readyMenuUnified(match, program, mode, speed, custom),
      disable_web_page_preview: true
    });
    await answerCallback(env, callbackId, enableMessage);
    return;
  }

  if (data.startsWith("owr|")) {
    const [, matchId, program, mode, speed] = data.split("|");
    const match = await findMatch(env, matchId);
    if (!match) {
      await answerCallback(env, callbackId, "Матч уже недоступен", true);
      return;
    }
    const state = await getOddsStatePersistent(env, match.id);
    const custom = getOverlayCustom(chatId, match.id, program, mode, speed);
    const sidecarStatus = await getSidecarConnectionStatus(env);
    let refreshMessage = "Запрос на обновление отправлен в sidecar.";
    if (state.mode === "manual" || state.autoUpdate === false) {
      const summary = oddsSummary(custom, state);
      refreshMessage = `Ручной режим: ${summary.home} / ${summary.away}. Автообновление выключено.`;
    } else if (!state.winlineUrl) {
      refreshMessage = "Сначала подключи ссылку Winline или введи кэфы вручную.";
    } else if (!sidecarStatus.configured) {
      refreshMessage = "odds-service не подключён. Можно вставить ссылку Winline, но автообновление заработает только после запуска sidecar. Сейчас можно ввести кэфы вручную.";
    } else if (!sidecarStatus.ok) {
      refreshMessage = "odds-service недоступен. Можно ввести кэфы вручную.";
    } else {
      const refreshResult = await requestSidecarRefresh(env, match.id);
      if (!refreshResult.ok) {
        refreshMessage = `Не удалось запросить sidecar refresh: ${refreshResult.error || `HTTP ${refreshResult.status || "?"}`}`;
      }
    }
    const refreshed = await getOddsStatePersistent(env, match.id);
    await replaceFlowMessage(env, chatId, messageId, {
      text: winlineMenuTextUnified(match, program, mode, custom, refreshed, sidecarStatus),
      reply_markup: winlineMenuUnified(match, program, mode, speed),
      disable_web_page_preview: true
    });
    await answerCallback(env, callbackId, refreshMessage);
    return;
  }

  if (data.startsWith("owx|")) {
    const [, matchId, program, mode, speed] = data.split("|");
    const match = await findMatch(env, matchId);
    if (!match) {
      await answerCallback(env, callbackId, "Матч уже недоступен", true);
      return;
    }
    const state = await setOddsStatePersistent(env, match.id, {
      autoUpdate: false,
      mode: "off",
      updatedAt: new Date().toISOString(),
      lastError: null
    });
    await removeActiveOddsMatch(env, match.id);
    const custom = getOverlayCustom(chatId, match.id, program, mode, speed);
    const sidecarStatus = await getSidecarConnectionStatus(env);
    await replaceFlowMessage(env, chatId, messageId, {
      text: winlineMenuTextUnified(match, program, mode, custom, state, sidecarStatus),
      reply_markup: winlineMenuUnified(match, program, mode, speed),
      disable_web_page_preview: true
    });
    await answerCallback(env, callbackId, "Автообновление отключено");
    return;
  }

  if (data.startsWith("owz|")) {
    const [, matchId, program, mode, speed] = data.split("|");
    const match = await findMatch(env, matchId);
    if (!match) {
      await answerCallback(env, callbackId, "Матч уже недоступен", true);
      return;
    }
    const current = await getOddsStatePersistent(env, match.id);
    const keepAuto = Boolean(current.winlineUrl) && Boolean(current.autoUpdate);
    const state = await setOddsStatePersistent(env, match.id, {
      source: keepAuto ? "winline" : (current.source || "winline"),
      mode: keepAuto ? "sidecar_pending" : "off",
      autoUpdate: keepAuto,
      odds: { player1: null, player2: null },
      updatedAt: new Date().toISOString(),
      lastError: keepAuto ? "Waiting for sidecar" : null,
      stale: true
    });
    if (keepAuto) {
      await upsertActiveOddsMatch(env, {
        matchId: match.id,
        winlineUrl: current.winlineUrl,
        player1Name: current.player1Name || match.home?.name || "",
        player2Name: current.player2Name || match.away?.name || "",
        source: "winline",
        mode: "sidecar_pending",
        autoUpdate: true
      });
    } else {
      await removeActiveOddsMatch(env, match.id);
    }
    const custom = getOverlayCustom(chatId, match.id, program, mode, speed);
    const sidecarStatus = await getSidecarConnectionStatus(env);
    await replaceFlowMessage(env, chatId, messageId, {
      text: winlineMenuTextUnified(match, program, mode, custom, state, sidecarStatus),
      reply_markup: winlineMenuUnified(match, program, mode, speed),
      disable_web_page_preview: true
    });
    await answerCallback(env, callbackId, keepAuto ? "Кэфы сброшены. Жду обновление от sidecar." : "Кэфы сброшены.");
    return;
  }

  if (data.startsWith("owa|")) {
    const [, matchId, program, mode, speed] = data.split("|");
    const match = await findMatch(env, matchId);
    if (!match) {
      await answerCallback(env, callbackId, "Матч уже недоступен", true);
      return;
    }
    const discovered = await discoverWinlineCandidate(match, env);
    if (!discovered.ok) {
      await answerCallback(env, callbackId, discovered.message || "Не удалось выполнить автопоиск", true);
      return;
    }
    const candidate = discovered.candidate;
    const token = createWinlineCandidateToken();
    pendingWinlineCandidatesByToken.set(token, {
      createdAt: Date.now(),
      matchId: match.id,
      program,
      mode,
      speed,
      winlineUrl: candidate.winlineUrl,
      player1Odd: candidate.odds.player1 || null,
      player2Odd: candidate.odds.player2 || null
    });
    await replaceFlowMessage(env, chatId, messageId, {
      text: [
        "Нашёл похожий матч Winline.",
        "",
        `${match.home.name} — ${match.away.name}`,
        `Кэфы: ${candidate.odds.player1 || "—"} / ${candidate.odds.player2 || "—"}`,
        "",
        "Подключить?"
      ].join("\n"),
      reply_markup: winlineCandidateMenu(token, match, program, mode, speed),
      disable_web_page_preview: true
    });
    await answerCallback(env, callbackId);
    return;
  }

  if (data.startsWith("owm|")) {
    const [, matchId, program, mode, speed] = data.split("|");
    const match = await findMatch(env, matchId);
    if (!match) {
      await answerCallback(env, callbackId, "Матч уже закончился или пропал из live", true);
      return;
    }
    const custom = getOverlayCustom(chatId, match.id, program, mode, speed);
    const prompt = await replaceFlowMessage(env, chatId, messageId, {
      text: [
        "Ручной ввод коэффициентов (fallback).",
        "",
        editBlockPrompt("eo", match, program, mode, speed, custom)
      ].join("\n"),
      reply_markup: { force_reply: true, selective: true },
      disable_web_page_preview: true
    });
    const replyMessageId = prompt?.result?.message_id;
    if (replyMessageId) {
      rememberPendingEdit(chatId, replyMessageId, { matchId, program, mode, speed, block: "odds" });
    }
    await answerCallback(env, callbackId);
    return;
  }

  if (data.startsWith("owy|")) {
    const [, token] = data.split("|");
    const candidate = pendingWinlineCandidatesByToken.get(token);
    pendingWinlineCandidatesByToken.delete(token);
    if (!candidate) {
      await answerCallback(env, callbackId, "Сессия подтверждения устарела. Запусти поиск заново.", true);
      return;
    }
    const match = await findMatch(env, candidate.matchId);
    if (!match) {
      await answerCallback(env, callbackId, "Матч уже недоступен", true);
      return;
    }
    await applyWinlineLinkFromChat(env, origin, chatId, {
      matchId: candidate.matchId,
      program: candidate.program,
      mode: candidate.mode,
      speed: candidate.speed,
      winlineUrl: candidate.winlineUrl,
      skipMatchLookup: match
    });
    await answerCallback(env, callbackId);
    return;
  }

  if (data.startsWith("own|")) {
    const [, matchId, program, mode, speed] = data.split("|");
    const match = await findMatch(env, matchId);
    if (!match) {
      await answerCallback(env, callbackId, "Матч уже недоступен", true);
      return;
    }
    const custom = getOverlayCustom(chatId, match.id, program, mode, speed);
    const oddsState = await getOddsStatePersistent(env, match.id);
    const sidecarStatus = await getSidecarConnectionStatus(env);
    await replaceFlowMessage(env, chatId, messageId, {
      text: winlineMenuTextUnified(match, program, mode, custom, oddsState, sidecarStatus),
      reply_markup: winlineMenuUnified(match, program, mode, speed),
      disable_web_page_preview: true
    });
    await answerCallback(env, callbackId);
    return;
  }

  if (data.startsWith("en|") || data.startsWith("ec|") || data.startsWith("eg|") || data.startsWith("es|") || data.startsWith("eo|")) {
    const [block, matchId, program, mode, speed] = data.split("|");
    const match = await findMatch(env, matchId);
    if (!match) {
      await answerCallback(env, callbackId, "Матч уже закончился или пропал из live", true);
      return;
    }
    const prompt = await replaceFlowMessage(env, chatId, messageId, {
      text: editBlockPrompt(block, match, program, mode, speed, getOverlayCustom(chatId, match.id, program, mode, speed)),
      reply_markup: { force_reply: true, selective: true },
      disable_web_page_preview: true
    });
    const replyMessageId = prompt?.result?.message_id;
    if (replyMessageId) {
      const mappedBlock = block === "en"
        ? "names"
        : block === "ec"
          ? "codes"
          : block === "eg"
            ? "countries"
            : block === "es"
              ? "stage"
              : "odds";
      rememberPendingEdit(chatId, replyMessageId, { matchId, program, mode, speed, block: mappedBlock });
    }
    await answerCallback(env, callbackId);
    return;
  }

  await answerCallback(env, callbackId);
}

async function telegramApi(env, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  let data = null;
  try {
    data = await response.json();
  } catch (_error) {
    data = null;
  }
  if (!response.ok || data?.ok === false) {
    console.log(`telegram ${method} failed`, data || response.status);
  }
  return data;
}

function answerCallback(env, callbackQueryId, textValue = "", showAlert = false) {
  return telegramApi(env, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text: textValue || undefined,
    show_alert: showAlert
  });
}

function flowChatKey(chatId) {
  return String(chatId || "");
}

function getFlowMessageId(chatId) {
  return flowMessageByChat.get(flowChatKey(chatId)) || null;
}

function setFlowMessageId(chatId, messageId) {
  if (!messageId) return;
  flowMessageByChat.set(flowChatKey(chatId), Number(messageId));
}

async function safeDeleteMessage(env, chatId, messageId) {
  if (!chatId || !messageId) return;
  try {
    await telegramApi(env, "deleteMessage", { chat_id: chatId, message_id: Number(messageId) });
  } catch (_error) {
    // ignore cleanup errors
  }
}

async function replaceFlowMessage(env, chatId, previousMessageId, payload) {
  const sent = await telegramApi(env, "sendMessage", { chat_id: chatId, ...payload });
  const newMessageId = sent?.result?.message_id;
  const tracked = getFlowMessageId(chatId);
  const toDelete = new Set([tracked, previousMessageId].filter(Boolean));
  if (newMessageId) toDelete.delete(newMessageId);
  for (const oldId of toDelete) {
    await safeDeleteMessage(env, chatId, oldId);
  }
  if (newMessageId) setFlowMessageId(chatId, newMessageId);
  return sent;
}

async function liveMenu(env) {
  try {
    const items = await menuMatches(env);
    const rows = items.slice(0, 45).map((match) => [button(matchButtonLabel(match), `m|${match.id}`)]);
    rows.push([button("Обновить список матчей", "live")]);
    if (!items.length) {
      return {
        text: [
          "Привет! Это @listen_bolshe_bot.",
          "Я помогу собрать ссылку для оверлея за пару шагов.",
          "",
          "Как это работает:",
          "1) Выбираешь live или ближайший матч (на 3 часа вперед).",
          "2) Выбираешь программу (OBS / Streamlabs / vMix).",
          "3) Выбираешь режим: «Статистика матча» или «Бегущая строка» (для строки потом выбирается размер: normal/small).",
          "4) Получаешь готовую ссылку.",
          "",
          "Сейчас нет live и ближайших матчей на 3 часа вперед. Нажми «Обновить список матчей»."
        ].join("\n"),
        reply_markup: keyboard(rows)
      };
    }
    return {
      text: [
        "Привет! Это @listen_bolshe_bot.",
        "Соберем ссылку для оверлея пошагово.",
        "",
        "Шаг 1 из 4: выбери live или ближайший матч на 3 часа вперед."
      ].join("\n"),
      reply_markup: keyboard(rows)
    };
  } catch (error) {
    return {
      text: [
        "Не получилось загрузить список матчей.",
        `Ошибка: ${error?.message || error}`,
        "",
        "Нажми «Обновить список матчей»."
      ].join("\n"),
      reply_markup: keyboard([[button("Обновить список матчей", "live")]])
    };
  }
}

function programMenu(match) {
  return keyboard([
    [button("OBS", `p|${match.id}|obs`), button("Streamlabs", `p|${match.id}|streamlabs`)],
    [button("vMix", `p|${match.id}|vmix`)],
    [button("Назад к матчам", "live")]
  ]);
}

function modeMenu(match, program) {
  return keyboard([
    [button("\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 \u043c\u0430\u0442\u0447\u0430", `r|${match.id}|${program}|stats`)],
    [button("\u0411\u0435\u0433\u0443\u0449\u0430\u044f \u0441\u0442\u0440\u043e\u043a\u0430", `r|${match.id}|${program}|ticker`)],
    [button("\u041d\u0430\u0437\u0430\u0434 \u043a \u0432\u044b\u0431\u043e\u0440\u0443 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b", `m|${match.id}`)],
    [button("\u041d\u0430\u0437\u0430\u0434 \u043a \u043c\u0430\u0442\u0447\u0430\u043c", "live")]
  ]);
}

function tickerSizeMenu(match, program, mode, speed, selectedSize = "normal") {
  const sizeKey = tickerSizeKey(selectedSize);
  return keyboard([
    [
      button(sizeKey === "normal" ? "\u041d\u043e\u0440\u043c\u0430\u043b\u044c\u043d\u044b\u0439 \u2022" : "\u041d\u043e\u0440\u043c\u0430\u043b\u044c\u043d\u044b\u0439", `z|${match.id}|${program}|${mode}|${speed}|normal`),
      button(sizeKey === "small" ? "\u041c\u0430\u043b\u0435\u043d\u044c\u043a\u0438\u0439 \u2022" : "\u041c\u0430\u043b\u0435\u043d\u044c\u043a\u0438\u0439", `z|${match.id}|${program}|${mode}|${speed}|small`)
    ],
    [button("\u041d\u0430\u0437\u0430\u0434 \u043a \u0432\u044b\u0431\u043e\u0440\u0443 \u0440\u0435\u0436\u0438\u043c\u0430", `p|${match.id}|${program}`)],
    [button("\u041d\u0430\u0437\u0430\u0434 \u043a \u0432\u044b\u0431\u043e\u0440\u0443 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b", `m|${match.id}`)],
    [button("\u041d\u0430\u0437\u0430\u0434 \u043a \u043c\u0430\u0442\u0447\u0430\u043c", "live")]
  ]);
}

function readyMenu(match, program, mode, speed, custom = {}) {
  const rows = [
    [button("\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 \u043c\u0430\u0442\u0447\u0430", `r|${match.id}|${program}|stats`)],
    [button("\u0411\u0435\u0433\u0443\u0449\u0430\u044f \u0441\u0442\u0440\u043e\u043a\u0430", `r|${match.id}|${program}|ticker`)]
  ];
  if (mode === "ticker") {
    const sizeKey = tickerSizeKey(custom.tickerSize);
    rows.push([
      button(sizeKey === "normal" ? "\u041d\u043e\u0440\u043c\u0430\u043b\u044c\u043d\u044b\u0439 \u2022" : "\u041d\u043e\u0440\u043c\u0430\u043b\u044c\u043d\u044b\u0439", `z|${match.id}|${program}|${mode}|${speed}|normal`),
      button(sizeKey === "small" ? "\u041c\u0430\u043b\u0435\u043d\u044c\u043a\u0438\u0439 \u2022" : "\u041c\u0430\u043b\u0435\u043d\u044c\u043a\u0438\u0439", `z|${match.id}|${program}|${mode}|${speed}|small`)
    ]);
  }
  if (mode === "stats") {
    const delay = statsDelaySeconds(custom.statsDelaySec);
    const oddsState = getOddsState(match.id);
    const summary = oddsSummary(custom, oddsState);
    const winlineConnected = Boolean(oddsState.winlineUrl);
    const winlineAuto = Boolean(oddsState.autoUpdate);
    const statusText = winlineConnected
      ? (winlineAuto ? "подключено" : "подключено (пауза)")
      : "не подключено";
    rows.push([
      button("\u22125 \u0441\u0435\u043a", `d|${match.id}|${program}|${mode}|${speed}|dec`),
      button("+5 \u0441\u0435\u043a", `d|${match.id}|${program}|${mode}|${speed}|inc`)
    ]);
    rows.push([button(`\u0417\u0430\u0434\u0435\u0440\u0436\u043a\u0430 \u0433\u0440\u0430\u0444\u0438\u043a\u0438: ${delay} \u0441\u0435\u043a`, `d|${match.id}|${program}|${mode}|${speed}|show`)]);
    rows.push([button(`Кэфы Winline: ${statusText}`, `ow|${match.id}|${program}|${mode}|${speed}`)]);
    rows.push([
      button("Включить Winline", `owe|${match.id}|${program}|${mode}|${speed}`),
      button("Отключить Winline", `owx|${match.id}|${program}|${mode}|${speed}`)
    ]);
    rows.push([
      button(`Кэфы: ${summary.home} / ${summary.away}`, `ow|${match.id}|${program}|${mode}|${speed}`),
      button("Обновить кэфы", `owr|${match.id}|${program}|${mode}|${speed}`)
    ]);
    rows.push([button("\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0431\u043b\u043e\u043a\u0438", `e|${match.id}|${program}|${mode}|${speed}`)]);
  }
  rows.push([button("\u0412\u044b\u0431\u0440\u0430\u0442\u044c \u0434\u0440\u0443\u0433\u0443\u044e \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0443", `m|${match.id}`)]);
  rows.push([button("\u041a \u0441\u043f\u0438\u0441\u043a\u0443 \u043c\u0430\u0442\u0447\u0435\u0439", "live")]);
  return keyboard(rows);
}

function readyMenuUnified(match, program, mode, speed, custom = {}) {
  const rows = [
    [button("\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 \u043c\u0430\u0442\u0447\u0430", `r|${match.id}|${program}|stats`)],
    [button("\u0411\u0435\u0433\u0443\u0449\u0430\u044f \u0441\u0442\u0440\u043e\u043a\u0430", `r|${match.id}|${program}|ticker`)]
  ];

  if (mode === "ticker") {
    const sizeKey = tickerSizeKey(custom.tickerSize);
    rows.push([
      button(sizeKey === "normal" ? "\u041d\u043e\u0440\u043c\u0430\u043b\u044c\u043d\u044b\u0439 \u2022" : "\u041d\u043e\u0440\u043c\u0430\u043b\u044c\u043d\u044b\u0439", `z|${match.id}|${program}|${mode}|${speed}|normal`),
      button(sizeKey === "small" ? "\u041c\u0430\u043b\u0435\u043d\u044c\u043a\u0438\u0439 \u2022" : "\u041c\u0430\u043b\u0435\u043d\u044c\u043a\u0438\u0439", `z|${match.id}|${program}|${mode}|${speed}|small`)
    ]);
  }

  if (mode === "stats") {
    const delay = statsDelaySeconds(custom.statsDelaySec);
    rows.push([
      button("\u22125 \u0441\u0435\u043a", `d|${match.id}|${program}|${mode}|${speed}|dec`),
      button("+5 \u0441\u0435\u043a", `d|${match.id}|${program}|${mode}|${speed}|inc`)
    ]);
    rows.push([button(`\u0417\u0430\u0434\u0435\u0440\u0436\u043a\u0430 \u0433\u0440\u0430\u0444\u0438\u043a\u0438: ${delay} \u0441\u0435\u043a`, `d|${match.id}|${program}|${mode}|${speed}|show`)]);
    rows.push([button("🎰 Кэфы Winline", `ow|${match.id}|${program}|${mode}|${speed}`)]);
    rows.push([button("✏️ Редактировать графические блоки", `e|${match.id}|${program}|${mode}|${speed}`)]);
  }

  rows.push([button("\u0412\u044b\u0431\u0440\u0430\u0442\u044c \u0434\u0440\u0443\u0433\u0443\u044e \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0443", `m|${match.id}`)]);
  rows.push([button("\u041a \u0441\u043f\u0438\u0441\u043a\u0443 \u043c\u0430\u0442\u0447\u0435\u0439", "live")]);
  return keyboard(rows);
}

function keyboard(rows) {
  return { inline_keyboard: rows };
}

function button(textValue, callbackData) {
  return { text: textValue, callback_data: callbackData };
}

function parseNamesCommand(textValue) {
  const match = String(textValue || "").match(/^\/?names(?:@listen_bolshe_bot)?\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+([\s\S]+)$/i);
  if (!match) return { ok: false };
  const [, matchId, program, mode, speed, payload] = match;
  const chunks = payload.split(";").map((item) => item.trim()).filter(Boolean);
  if (chunks.length < 5) return { ok: false };

  return {
    ok: true,
    matchId,
    program,
    mode,
    speed,
    homeName: chunks[0],
    awayName: chunks[1],
    homeCode: chunks[2],
    awayCode: chunks[3],
    stage: chunks.slice(4).join("; ").trim()
  };
}

function parseEditCommand(textValue, commandName) {
  const commands = Array.isArray(commandName) ? commandName : [commandName];
  let match = null;
  for (const name of commands) {
    match = String(textValue || "").match(new RegExp(`^/?${name}(?:@listen_bolshe_bot)?\\s+(\\S+)\\s+(\\S+)\\s+(\\S+)\\s+(\\S+)\\s+([\\s\\S]+)$`, "i"));
    if (match) break;
  }
  if (!match) return { ok: false };
  const [, matchId, program, mode, speed, payload] = match;
  return {
    ok: true,
    matchId,
    program: String(program || "").toLowerCase(),
    mode: String(mode || "").toLowerCase(),
    speed: String(speed || "").toLowerCase(),
    payload: String(payload || "").trim()
  };
}

function parseEditNamesCommand(textValue) {
  const parsed = parseEditCommand(textValue, "edit_names");
  if (!parsed.ok) return parsed;
  const chunks = parsed.payload.split(";").map((item) => item.trim()).filter(Boolean);
  if (chunks.length < 2) return { ok: false };
  return { ...parsed, homeName: chunks[0], awayName: chunks.slice(1).join("; ").trim() };
}

function parseEditCodesCommand(textValue) {
  const parsed = parseEditCommand(textValue, "edit_codes");
  if (!parsed.ok) return parsed;
  const pair = splitTwoValues(parsed.payload);
  if (!pair) return { ok: false };
  return {
    ...parsed,
    homeCode: normalizeCountryCode(pair[0]),
    awayCode: normalizeCountryCode(pair[1])
  };
}

function parseEditCountriesCommand(textValue) {
  const parsed = parseEditCommand(textValue, "edit_countries");
  if (!parsed.ok) return parsed;
  const pair = splitTwoValues(parsed.payload);
  if (!pair) return { ok: false };
  return {
    ...parsed,
    homeCountry: normalizeCountryCode(pair[0]),
    awayCountry: normalizeCountryCode(pair[1])
  };
}

function parseEditStageCommand(textValue) {
  const parsed = parseEditCommand(textValue, "edit_stage");
  if (!parsed.ok || !parsed.payload) return { ok: false };
  return { ...parsed, stage: normalizeFreeText(parsed.payload) };
}

function parseEditOddsCommand(textValue) {
  const parsed = parseEditCommand(textValue, "edit_odds");
  if (!parsed.ok) return parsed;
  const chunks = parsed.payload.split(";").map((item) => item.trim()).filter(Boolean);
  if (chunks.length < 2) return { ok: false };
  const homeOdd = cleanOdd(chunks[0]);
  const awayOdd = cleanOdd(chunks[1]);
  if (!homeOdd || !awayOdd) return { ok: false };
  return { ...parsed, homeOdd, awayOdd };
}

function splitTwoValues(textValue) {
  const chunks = String(textValue || "")
    .split(/[;,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (chunks.length < 2) return null;
  return [chunks[0], chunks[1]];
}

function parseReplyEditPayload(block, textValue) {
  if (block === "names") {
    const pair = splitTwoValues(textValue);
    if (!pair) return { ok: false, hint: "И. Фамилия, И. Фамилия" };
    return { ok: true, homeName: normalizeFreeText(pair[0]), awayName: normalizeFreeText(pair[1]) };
  }

  if (block === "codes" || block === "countries") {
    const pair = splitTwoValues(textValue);
    if (!pair) return { ok: false, hint: block === "countries" ? "RUS, USA" : "АДМ, МЕН" };
    if (block === "countries") {
      const homeCountry = normalizeCountryCode(pair[0]);
      const awayCountry = normalizeCountryCode(pair[1]);
      if (!homeCountry || !awayCountry) return { ok: false, hint: "RUS, USA" };
      return { ok: true, homeCountry, awayCountry };
    }
    const homeCode = normalizeCountryCode(pair[0]);
    const awayCode = normalizeCountryCode(pair[1]);
    if (!homeCode || !awayCode) return { ok: false, hint: "АДМ, МЕН" };
    return { ok: true, homeCode, awayCode };
  }

  if (block === "stage") {
    const stage = normalizeFreeText(textValue);
    if (!stage) return { ok: false, hint: "ТРЕТИЙ КРУГ" };
    return { ok: true, stage };
  }

  if (block === "odds") {
    const pair = splitTwoValues(textValue);
    if (!pair) return { ok: false, hint: "1.74, 2.15" };
    const homeOdd = cleanOdd(pair[0]);
    const awayOdd = cleanOdd(pair[1]);
    if (!homeOdd || !awayOdd) return { ok: false, hint: "1.74, 2.15" };
    return { ok: true, homeOdd, awayOdd };
  }

  return { ok: false, hint: "" };
}

function overlaySessionKey(chatId, matchId, _program, _mode, _speed) {
  // Match settings are shared across mode/speed/program in one chat.
  return [String(chatId || ""), String(matchId || "")].join("|");
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepMergeMatchSettings(baseValue, patchValue) {
  const base = isPlainObject(baseValue) ? { ...baseValue } : {};
  const patch = isPlainObject(patchValue) ? patchValue : {};
  for (const key of Object.keys(patch)) {
    const nextValue = patch[key];
    if (nextValue === undefined) continue;
    if (isPlainObject(nextValue) && isPlainObject(base[key])) {
      base[key] = deepMergeMatchSettings(base[key], nextValue);
    } else if (isPlainObject(nextValue)) {
      base[key] = deepMergeMatchSettings({}, nextValue);
    } else if (Array.isArray(nextValue)) {
      base[key] = nextValue.slice();
    } else {
      base[key] = nextValue;
    }
  }
  return base;
}

function legacyPatchToMatchSettingsPatch(patch) {
  const input = isPlainObject(patch) ? patch : {};
  const out = deepMergeMatchSettings({}, input);
  out.player1 = out.player1 || {};
  out.player2 = out.player2 || {};
  out.player1.manualOverrides = out.player1.manualOverrides || {};
  out.player2.manualOverrides = out.player2.manualOverrides || {};
  out.odds = out.odds || {};

  if (Object.prototype.hasOwnProperty.call(input, "homeName")) out.player1.manualOverrides.displayName = input.homeName;
  if (Object.prototype.hasOwnProperty.call(input, "awayName")) out.player2.manualOverrides.displayName = input.awayName;
  if (Object.prototype.hasOwnProperty.call(input, "homeCode")) out.player1.manualOverrides.shortName = input.homeCode;
  if (Object.prototype.hasOwnProperty.call(input, "awayCode")) out.player2.manualOverrides.shortName = input.awayCode;
  if (Object.prototype.hasOwnProperty.call(input, "homeCountry")) out.player1.manualOverrides.country = input.homeCountry;
  if (Object.prototype.hasOwnProperty.call(input, "awayCountry")) out.player2.manualOverrides.country = input.awayCountry;
  if (Object.prototype.hasOwnProperty.call(input, "homeOdd")) out.odds.manualPlayer1 = input.homeOdd;
  if (Object.prototype.hasOwnProperty.call(input, "awayOdd")) out.odds.manualPlayer2 = input.awayOdd;
  return out;
}

function normalizeMatchSettings(settings) {
  const next = deepMergeMatchSettings({}, settings || {});
  next.player1 = isPlainObject(next.player1) ? next.player1 : {};
  next.player2 = isPlainObject(next.player2) ? next.player2 : {};
  next.player1.manualOverrides = isPlainObject(next.player1.manualOverrides) ? next.player1.manualOverrides : {};
  next.player2.manualOverrides = isPlainObject(next.player2.manualOverrides) ? next.player2.manualOverrides : {};
  next.odds = isPlainObject(next.odds) ? next.odds : {};

  const homeName = normalizeFreeText(next.homeName || next.player1.manualOverrides.displayName || "");
  const awayName = normalizeFreeText(next.awayName || next.player2.manualOverrides.displayName || "");
  const homeCode = normalizeCountryCode(next.homeCode || next.player1.manualOverrides.shortName || "");
  const awayCode = normalizeCountryCode(next.awayCode || next.player2.manualOverrides.shortName || "");
  const homeCountry = normalizeCountryCode(next.homeCountry || next.player1.manualOverrides.country || "");
  const awayCountry = normalizeCountryCode(next.awayCountry || next.player2.manualOverrides.country || "");
  const stage = normalizeFreeText(next.stage || "");
  const manualHomeOdd = cleanOdd(next.homeOdd || next.odds.manualPlayer1 || "");
  const manualAwayOdd = cleanOdd(next.awayOdd || next.odds.manualPlayer2 || "");
  const delay = statsDelaySeconds(next.statsDelaySec);
  const size = tickerSizeKey(next.tickerSize);

  if (homeName) {
    next.homeName = homeName;
    next.player1.manualOverrides.displayName = homeName;
  } else {
    delete next.homeName;
    delete next.player1.manualOverrides.displayName;
  }
  if (awayName) {
    next.awayName = awayName;
    next.player2.manualOverrides.displayName = awayName;
  } else {
    delete next.awayName;
    delete next.player2.manualOverrides.displayName;
  }
  if (homeCode) {
    next.homeCode = homeCode;
    next.player1.manualOverrides.shortName = homeCode;
  } else {
    delete next.homeCode;
    delete next.player1.manualOverrides.shortName;
  }
  if (awayCode) {
    next.awayCode = awayCode;
    next.player2.manualOverrides.shortName = awayCode;
  } else {
    delete next.awayCode;
    delete next.player2.manualOverrides.shortName;
  }
  if (homeCountry) {
    next.homeCountry = homeCountry;
    next.player1.manualOverrides.country = homeCountry;
  } else {
    delete next.homeCountry;
    delete next.player1.manualOverrides.country;
  }
  if (awayCountry) {
    next.awayCountry = awayCountry;
    next.player2.manualOverrides.country = awayCountry;
  } else {
    delete next.awayCountry;
    delete next.player2.manualOverrides.country;
  }
  if (stage) next.stage = stage;
  else delete next.stage;

  if (manualHomeOdd) {
    next.homeOdd = manualHomeOdd;
    next.odds.manualPlayer1 = manualHomeOdd;
  } else {
    delete next.homeOdd;
    delete next.odds.manualPlayer1;
  }
  if (manualAwayOdd) {
    next.awayOdd = manualAwayOdd;
    next.odds.manualPlayer2 = manualAwayOdd;
  } else {
    delete next.awayOdd;
    delete next.odds.manualPlayer2;
  }

  if (delay > 0) next.statsDelaySec = delay;
  else delete next.statsDelaySec;

  if (size !== "normal") next.tickerSize = size;
  else delete next.tickerSize;

  next.odds.provider = String(next.odds.provider || "winline");
  next.odds.mode = manualHomeOdd || manualAwayOdd ? "manual" : (next.odds.mode || "auto");
  next.updatedAt = new Date().toISOString();
  return next;
}

function getOverlayCustom(chatId, matchId, program, mode, speed) {
  const key = overlaySessionKey(chatId, matchId, program, mode, speed);
  const current = overlayCustomBySession.get(key) || {};
  return normalizeMatchSettings(current);
}

function updateMatchSettings(chatId, matchId, program, mode, speed, patch) {
  const key = overlaySessionKey(chatId, matchId, program, mode, speed);
  const current = getOverlayCustom(chatId, matchId, program, mode, speed);
  const mappedPatch = legacyPatchToMatchSettingsPatch(patch || {});
  const merged = deepMergeMatchSettings(current, mappedPatch);
  const next = normalizeMatchSettings(merged);
  const significantKeys = Object.keys(next).filter((item) => item !== "updatedAt");
  if (!significantKeys.length) {
    overlayCustomBySession.delete(key);
    return {};
  }
  overlayCustomBySession.set(key, next);
  return next;
}

function setOverlayCustom(chatId, matchId, program, mode, speed, patch) {
  return updateMatchSettings(chatId, matchId, program, mode, speed, patch);
}

function patchOverlayUrl(rawUrl, patch = {}) {
  if (!rawUrl) return rawUrl;
  let url;
  try {
    url = new URL(rawUrl);
  } catch (_error) {
    return rawUrl;
  }

  for (const [key, value] of Object.entries(patch || {})) {
    if (value === undefined || value === null || value === "") {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, String(value));
    }
  }

  const oddsParam = url.searchParams.get("odds");
  if (oddsParam && (Object.prototype.hasOwnProperty.call(patch, "homeOdd") || Object.prototype.hasOwnProperty.call(patch, "awayOdd"))) {
    try {
      const nested = new URL(oddsParam, url.origin);
      if (Object.prototype.hasOwnProperty.call(patch, "homeOdd")) {
        if (patch.homeOdd === undefined || patch.homeOdd === null || patch.homeOdd === "") nested.searchParams.delete("homeOdd");
        else nested.searchParams.set("homeOdd", String(patch.homeOdd));
      }
      if (Object.prototype.hasOwnProperty.call(patch, "awayOdd")) {
        if (patch.awayOdd === undefined || patch.awayOdd === null || patch.awayOdd === "") nested.searchParams.delete("awayOdd");
        else nested.searchParams.set("awayOdd", String(patch.awayOdd));
      }
      url.searchParams.set("odds", `${nested.pathname}${nested.search}`);
    } catch (_error) {
      // Leave the top-level URL patched even if the nested odds URL is malformed.
    }
  }

  return url.toString();
}

function overlayUrlPatchFromSettingsPatch(patch = {}) {
  const input = isPlainObject(patch) ? patch : {};
  const out = {};
  const copyKeys = [
    "homeName",
    "awayName",
    "homeCode",
    "awayCode",
    "homeCountry",
    "awayCountry",
    "stage",
    "panel",
    "ticker",
    "homeOdd",
    "awayOdd"
  ];
  for (const key of copyKeys) {
    if (Object.prototype.hasOwnProperty.call(input, key)) out[key] = input[key];
  }
  if (Object.prototype.hasOwnProperty.call(input, "statsDelaySec")) {
    const delay = statsDelaySeconds(input.statsDelaySec);
    out.delay = delay > 0 ? delay : "";
  }
  if (Object.prototype.hasOwnProperty.call(input, "tickerSize")) {
    out.height = TICKER_SIZES[tickerSizeKey(input.tickerSize)]?.param || "normal";
  }
  return out;
}

function pendingEditKey(chatId, replyMessageId) {
  return `${String(chatId || "")}|${String(replyMessageId || "")}`;
}

function rememberPendingEdit(chatId, replyMessageId, payload) {
  pendingEditByReply.set(pendingEditKey(chatId, replyMessageId), payload);
}

function consumePendingEdit(chatId, replyMessageId) {
  const key = pendingEditKey(chatId, replyMessageId);
  const payload = pendingEditByReply.get(key) || null;
  pendingEditByReply.delete(key);
  return payload;
}

function normalizeCountryCode(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-ZА-ЯЁ0-9]/gi, "").slice(0, 3);
}

function normalizeFreeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function customSummaryLines(custom = {}) {
  const delay = statsDelaySeconds(custom.statsDelaySec);
  const manualHomeOdd = custom.homeOdd || (custom.odds && custom.odds.manualPlayer1) || "";
  const manualAwayOdd = custom.awayOdd || (custom.odds && custom.odds.manualPlayer2) || "";
  return [
    `Фамилии: ${custom.homeName || "авто"} / ${custom.awayName || "авто"}`,
    `Короткие (статистика): ${custom.homeCode || "авто"} / ${custom.awayCode || "авто"}`,
    `Страны (табло): ${custom.homeCountry || "авто"} / ${custom.awayCountry || "авто"}`,
    `Стадия: ${custom.stage || "авто"}`,
    `Коэффициенты: ${manualHomeOdd || "авто"} / ${manualAwayOdd || "авто"}`,
    `Задержка графики: ${delay} сек`,
    `Размер строки: ${TICKER_SIZES[tickerSizeKey(custom.tickerSize)].label}`
  ];
}

function editMenuText(match, program, mode, speed, custom = {}) {
  return [
    "Редактирование по блокам",
    "",
    matchTitle(match),
    `Программа: ${PROGRAM_LABELS[program] || program}`,
    `Режим: ${modeLabel(mode)}`,
    `Скорость строки: ${TICKER_SPEEDS[speed]?.label || speed}`,
    "",
    ...customSummaryLines(custom),
    "",
    "Выбери блок ниже: бот пришлет сообщение, на которое нужно ответить в нужном формате.",
    "Для автообновления коэффициентов открой «🎰 Кэфы Winline»."
  ].join("\n");
}

function editBlocksMenu(match, program, mode, speed) {
  return keyboard([
    [button("Фамилии", `en|${match.id}|${program}|${mode}|${speed}`), button("Короткие", `ec|${match.id}|${program}|${mode}|${speed}`)],
    [button("Страны", `eg|${match.id}|${program}|${mode}|${speed}`), button("Стадия", `es|${match.id}|${program}|${mode}|${speed}`)],
    [button("Коэффициенты", `eo|${match.id}|${program}|${mode}|${speed}`)],
    [button("🎰 Кэфы Winline", `ow|${match.id}|${program}|${mode}|${speed}`)],
    [button("Назад", `r|${match.id}|${program}|${mode}`)],
    [button("К live матчам", "live")]
  ]);
}

function editBlockPromptLegacy(block, match, program, mode, speed, custom = {}) {
  const shared = `${match.id} ${program} ${mode} ${speed}`;
  if (block === "en") {
    return [
      "Редактирование фамилий",
      "",
      ...customSummaryLines(custom),
      "",
      "Команда:",
      `/edit_names ${shared} Д. МЕДВЕДЕВ ; Х-М. СЕРУНДОЛО`
    ].join("\n");
  }
  if (block === "ec") {
    return [
      "Редактирование коротких подписей",
      "",
      ...customSummaryLines(custom),
      "",
      "Команда:",
      `/edit_codes ${shared} МЕД, СЕР`
    ].join("\n");
  }
  if (block === "eg") {
    return [
      "Редактирование стран",
      "",
      ...customSummaryLines(custom),
      "",
      "Команда:",
      `/edit_countries ${shared} RUS, USA`
    ].join("\n");
  }
  if (block === "es") {
    return [
      "Редактирование стадии",
      "",
      ...customSummaryLines(custom),
      "",
      "Команда:",
      `/edit_stage ${shared} ТРЕТИЙ КРУГ`
    ].join("\n");
  }
  return [
    "Редактирование коэффициентов",
    "",
    ...customSummaryLines(custom),
    "",
    "Команда:",
    `/edit_odds ${shared} 1.74 ; 2.15`
  ].join("\n");
}

function editBlockPrompt(block, match, program, mode, speed, custom = {}) {
  const blockLabel = block === "en"
    ? "Фамилии"
    : block === "ec"
      ? "Короткие для статистики"
      : block === "eg"
        ? "Страны в блоке счета"
      : block === "es"
        ? "Стадия турнира"
        : "Коэффициенты";
  const formatHint = block === "en"
    ? "И. Фамилия, И. Фамилия"
    : block === "ec"
      ? "АДМ, МЕН"
      : block === "eg"
        ? "RUS, USA"
      : block === "es"
        ? "ТРЕТИЙ КРУГ"
        : "1.74, 2.15";
  return [
    `Редактирование: ${blockLabel}`,
    "",
    matchTitle(match),
    `Программа: ${PROGRAM_LABELS[program] || program}`,
    `Режим: ${modeLabel(mode)}`,
    `Скорость: ${TICKER_SPEEDS[speed]?.label || speed}`,
    "",
    ...customSummaryLines(custom),
    "",
    `Пришли в ответ на это сообщение данные в формате: ${formatHint}`
  ].join("\n");
}

function winlineMenu(match, program, mode, speed) {
  return winlineMenuUnified(match, program, mode, speed);
}

function winlineMenuText(match, program, mode, speed, custom = {}, state = null) {
  return winlineMenuTextUnified(match, program, mode, custom, state);
}

function winlineMenuUnified(match, program, mode, speed) {
  const state = getOddsState(match.id);
  const autoToggleButton = state.autoUpdate
    ? button("⛔ Отключить автообновление", `owx|${match.id}|${program}|${mode}|${speed}`)
    : button("✅ Включить автообновление", `owe|${match.id}|${program}|${mode}|${speed}`);
  return keyboard([
    [button("🔍 Найти матч автоматически", `owa|${match.id}|${program}|${mode}|${speed}`)],
    [button("🔗 Вставить ссылку Winline", `owl|${match.id}|${program}|${mode}|${speed}`)],
    [button("✍️ Ввести кэфы вручную", `owm|${match.id}|${program}|${mode}|${speed}`)],
    [button("🔄 Обновить сейчас", `owr|${match.id}|${program}|${mode}|${speed}`)],
    [button("🧹 Сбросить кэфы", `owz|${match.id}|${program}|${mode}|${speed}`)],
    [autoToggleButton],
    [button("⬅️ Назад", `r|${match.id}|${program}|${mode}`)]
  ]);
}

function sidecarStatusText(oddsState, sidecarStatus = null) {
  if (oddsState?.mode === "manual" || oddsState?.source === "manual") {
    return "ручной режим, автообновление выключено";
  }
  if (oddsState?.autoUpdate === false) {
    return "автообновление выключено";
  }
  if (!sidecarStatus) {
    return oddsState?.lastError || "статус odds-service не проверен";
  }
  if (!sidecarStatus.configured) {
    return "odds-service не подключён. Ссылка сохранена, но автоматические кэфы не обновятся, пока sidecar не запущен.";
  }
  if (!sidecarStatus.ok) {
    return "odds-service недоступен. Можно ввести кэфы вручную.";
  }
  if (oddsState?.mode === "sidecar_pending" || oddsState?.mode === "url" || oddsState?.autoUpdate) {
    return "odds-service подключён, ждём следующий цикл обновления.";
  }
  return "odds-service подключён";
}

function winlineMenuTextUnified(match, program, mode, custom = {}, state = null, sidecarStatus = null) {
  const oddsState = state || getOddsState(match.id);
  const summary = oddsSummary(custom, oddsState);
  const stale = staleOdds(oddsState, null) ? "да" : "нет";
  const link = oddsState.winlineUrl ? truncate(oddsState.winlineUrl, 130) : "не подключена";
  const auto = oddsState.autoUpdate ? "включено" : "выключено";
  const lines = [
    "🎰 Коэффициенты Winline",
    "",
    `${match.home.name} — ${match.away.name}`,
    `Программа: ${PROGRAM_LABELS[program] || program}`,
    `Режим: ${modeLabel(mode)}`,
    "",
    `Источник: ${summary.mode}`,
    `Текущие кэфы: ${summary.home} / ${summary.away}`,
    `Автообновление: ${auto}`,
    `Ссылка Winline: ${link}`,
    `Статус: ${sidecarStatusText(oddsState, sidecarStatus)}`,
    `Stale: ${stale}`
  ];
  if (oddsState.lastError) lines.push(`Ошибка: ${oddsState.lastError}`);
  return lines.join("\n");
}

function parseWinlineUrlInput(textValue) {
  const direct = String(textValue || "").trim();
  const extracted = direct.match(/https?:\/\/[^\s]+/i)?.[0] || direct;
  if (!extracted) return { ok: false };
  try {
    return { ok: true, winlineUrl: normalizeWinlineUrl(extracted) };
  } catch (_error) {
    return { ok: false };
  }
}

async function applyWinlineLinkFromChat(env, origin, chatId, parsed) {
  const match = parsed.skipMatchLookup || await findMatch(env, parsed.matchId);
  if (!match) {
    await replaceFlowMessage(env, chatId, getFlowMessageId(chatId), {
      text: "Матч не найден или уже исчез из live-списка. Выбери его заново через /start.",
      disable_web_page_preview: true
    });
    return;
  }
  if (!PROGRAM_LABELS[parsed.program]) {
    await replaceFlowMessage(env, chatId, getFlowMessageId(chatId), {
      text: "Неверная программа. Используй obs, streamlabs или vmix.",
      disable_web_page_preview: true
    });
    return;
  }

  const modeKey = BOT_MODES.has(parsed.mode) ? parsed.mode : "stats";
  const speedKey = TICKER_SPEEDS[parsed.speed] ? parsed.speed : "normal";
  let state = null;
  try {
    state = await linkWinlineOdds(match.id, parsed.winlineUrl, env, {
      mode: "url",
      winlineEventId: match.id,
      player1Name: match.home?.name || "",
      player2Name: match.away?.name || ""
    });
  } catch (error) {
    const customError = getOverlayCustom(chatId, match.id, parsed.program, modeKey, speedKey);
    const sidecarStatus = await getSidecarConnectionStatus(env);
    await replaceFlowMessage(env, chatId, getFlowMessageId(chatId), {
      text: [
        "⚠️ Не получилось подключить Winline.",
        error?.message || String(error),
        "",
        winlineMenuTextUnified(match, parsed.program, modeKey, customError, await getOddsStatePersistent(env, match.id), sidecarStatus)
      ].join("\n"),
      reply_markup: winlineMenuUnified(match, parsed.program, modeKey, speedKey),
      disable_web_page_preview: true
    });
    return;
  }

  const custom = getOverlayCustom(chatId, match.id, parsed.program, modeKey, speedKey);
  const url = overlayPageUrl(origin, match, modeKey, speedKey, custom);
  const sidecarStatus = await getSidecarConnectionStatus(env);
  const linkedHome = state?.odds?.player1 ?? null;
  const linkedAway = state?.odds?.player2 ?? null;
  const linkedOddsLine = linkedHome && linkedAway
    ? `Текущие кэфы: ${linkedHome} / ${linkedAway}`
    : "Кэфы исхода матча сейчас не найдены: - / -";
  const autoLine = !sidecarStatus.configured
    ? "odds-service не подключён. Ссылка сохранена, но автоматические кэфы не обновятся, пока sidecar не запущен."
    : sidecarStatus.ok
      ? "odds-service подключён, ждём следующий цикл обновления."
      : "odds-service недоступен. Можно ввести кэфы вручную.";
  await replaceFlowMessage(env, chatId, getFlowMessageId(chatId), {
    text: [
      "✅ Матч Winline подключён.",
      "",
      linkedOddsLine,
      autoLine,
      "",
      `URL:\n${url}`,
      "",
      winlineMenuTextUnified(match, parsed.program, modeKey, custom, await getOddsStatePersistent(env, match.id), sidecarStatus)
    ].join("\n"),
    reply_markup: winlineMenuUnified(match, parsed.program, modeKey, speedKey),
    disable_web_page_preview: true
  });
}

async function discoverWinlineCandidate(match, env) {
  if (!oddsConfig(env).oddsServiceBaseUrl) {
    return {
      ok: false,
      message: "Автопоиск Winline сейчас недоступен: odds-service не подключён. Можно вставить ссылку Winline вручную или ввести кэфы руками."
    };
  }
  const discovered = await discoverWinlineCandidateViaSidecar(match, env);
  if (!discovered.configured) {
    return {
      ok: false,
      message: "Автопоиск Winline сейчас недоступен: odds-service не подключён. Можно вставить ссылку Winline вручную или ввести кэфы руками."
    };
  }
  if (!discovered.ok) {
    return {
      ok: false,
      message: `Автопоиск через sidecar не удался: ${discovered.error || `HTTP ${discovered.status || "?"}`}`
    };
  }
  const candidates = Array.isArray(discovered.body?.candidates) ? discovered.body.candidates : [];
  const candidate = candidates[0] || null;
  if (!candidate?.winlineUrl) {
    return {
      ok: false,
      message: "Sidecar не вернул кандидатов. Можно вставить ссылку Winline вручную или ввести кэфы руками."
    };
  }
  const player1 = parseOddValue(candidate?.odds?.player1 ?? candidate?.player1);
  const player2 = parseOddValue(candidate?.odds?.player2 ?? candidate?.player2);
  const confidence = Number(candidate?.confidence || 0);
  return {
    ok: true,
    candidate: {
      winlineUrl: normalizeWinlineUrl(candidate.winlineUrl),
      odds: {
        player1: player1 || null,
        player2: player2 || null
      },
      confidence: Number.isFinite(confidence) ? confidence : 0
    }
  };
}

function createWinlineCandidateToken() {
  const now = Date.now();
  for (const [token, item] of pendingWinlineCandidatesByToken.entries()) {
    if (!item?.createdAt || now - item.createdAt > 10 * 60 * 1000) {
      pendingWinlineCandidatesByToken.delete(token);
    }
  }
  return `${Math.random().toString(36).slice(2, 8)}${(now % 1e5).toString(36)}`;
}

function winlineCandidateMenu(token, match, program, mode, speed) {
  return keyboard([
    [button("✅ Да, подключить", `owy|${token}`)],
    [button("❌ Нет, вставить ссылку", `owl|${match.id}|${program}|${mode}|${speed}`)],
    [button("⬅️ Назад", `own|${match.id}|${program}|${mode}|${speed}`)]
  ]);
}

async function applyEditBlock(env, origin, chatId, parsed, block) {
  const match = await findMatch(env, parsed.matchId);
  if (!match) {
    await replaceFlowMessage(env, chatId, getFlowMessageId(chatId), {
      text: "Матч не найден или уже исчез из live-списка. Выбери его заново через /start.",
      disable_web_page_preview: true
    });
    return;
  }
  if (!PROGRAM_LABELS[parsed.program]) {
    await replaceFlowMessage(env, chatId, getFlowMessageId(chatId), {
      text: "Неверная программа. Используй obs, streamlabs или vmix.",
      disable_web_page_preview: true
    });
    return;
  }

  const modeKey = BOT_MODES.has(parsed.mode) ? parsed.mode : "stats";
  const speedKey = TICKER_SPEEDS[parsed.speed] ? parsed.speed : "normal";
  const beforeCustom = getOverlayCustom(chatId, parsed.matchId, parsed.program, modeKey, speedKey);
  const beforeUrl = overlayPageUrl(origin, match, modeKey, speedKey, beforeCustom);
  const patch = {};

  if (block === "names") {
    patch.homeName = normalizeFreeText(parsed.homeName);
    patch.awayName = normalizeFreeText(parsed.awayName);
  } else if (block === "codes") {
    patch.homeCode = normalizeCountryCode(parsed.homeCode);
    patch.awayCode = normalizeCountryCode(parsed.awayCode);
  } else if (block === "countries") {
    patch.homeCountry = normalizeCountryCode(parsed.homeCountry);
    patch.awayCountry = normalizeCountryCode(parsed.awayCountry);
  } else if (block === "stage") {
    patch.stage = normalizeFreeText(parsed.stage);
  } else if (block === "odds") {
    patch.homeOdd = parsed.homeOdd;
    patch.awayOdd = parsed.awayOdd;
    await setManualOddsState(env, match.id, parsed.homeOdd, parsed.awayOdd, {
      player1Name: match.home?.name || "",
      player2Name: match.away?.name || ""
    });
  }

  const custom = setOverlayCustom(chatId, parsed.matchId, parsed.program, modeKey, speedKey, patch);
  const url = patchOverlayUrl(beforeUrl, overlayUrlPatchFromSettingsPatch(patch));
  await replaceFlowMessage(env, chatId, getFlowMessageId(chatId), {
    text: [
      "Готово, блок обновлен.",
      "",
      `Матч: ${matchTitle(match)}`,
      ...customSummaryLines(custom),
      "",
      `URL:\n${url}`
    ].join("\n"),
    reply_markup: editBlocksMenu(match, parsed.program, modeKey, speedKey),
    disable_web_page_preview: true
  });
}

async function liveMatches(env) {
  return (await flashscoreEvents(env))
    .filter((match) => match.status === "live" && isSupportedMatch(match))
    .sort(compareMatchList);
}

async function menuMatches(env) {
  const events = (await flashscoreEvents(env)).filter(isSupportedMatch);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const live = events.filter((match) => match.status === "live").sort(compareMatchList);
  const upcoming = events
    .filter((match) => isUpcomingMatch(match, nowSeconds))
    .sort((a, b) => (a.startTimeUnix || 0) - (b.startTimeUnix || 0));

  const merged = [];
  const seen = new Set();
  for (const match of [...live, ...upcoming]) {
    if (seen.has(match.id)) continue;
    seen.add(match.id);
    merged.push(match);
  }
  return merged;
}

function compareMatchList(a, b) {
  return `${a.tournament} ${a.home.shortName}`.localeCompare(`${b.tournament} ${b.home.shortName}`);
}

function isUpcomingMatch(match, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (match.status !== "scheduled") return false;
  if (!Number.isFinite(match.startTimeUnix) || match.startTimeUnix <= 0) return false;
  const minStart = nowSeconds - UPCOMING_MATCH_LOOKBACK_SECONDS;
  const maxStart = nowSeconds + UPCOMING_MATCH_WINDOW_SECONDS;
  return match.startTimeUnix >= minStart && match.startTimeUnix <= maxStart;
}

async function findMatch(env, matchId) {
  return (await flashscoreEvents(env)).find((match) => match.id === matchId && isSupportedMatch(match)) || null;
}

async function flashscoreEvents(env) {
  const base = String(env.FLASHSCORE_LIVE_BASE || DEFAULT_BASE).replace(/\/+$/, "");
  const lang = String(env.FLASHSCORE_LANG || DEFAULT_LANG).trim() || DEFAULT_LANG;
  const textValue = await fetchText(`${base}/x/feed/f_2_0_2_${lang}_1`, `${base}/tennis/`);
  const events = [];
  let league = {};
  for (const record of parseFeed(textValue)) {
    if (record.ZA || record.ZAF) {
      league = record;
      continue;
    }
    if (record.AA) events.push(normalizeEvent(record, league, base));
  }
  return events;
}

function normalizeEvent(record, league, base) {
  const home = competitor(record, "home");
  const away = competitor(record, "away");
  const match = {
    id: value(record, "AA"),
    status: value(record, "AB") === "2" ? "live" : value(record, "AB") === "3" ? "finished" : "scheduled",
    startTimeUnix: parseUnixSeconds(value(record, "AD")),
    stageCode: value(record, "AC"),
    tournament: tournamentName(value(league, "ZA") || value(league, "ZAF")),
    league: value(league, "ZA") || value(league, "ZAF"),
    home,
    away,
    score: scoreLabel(record)
  };
  match.url = flashscoreEventUrl(base, match);
  return match;
}

function isSupportedMatch(match) {
  return !/doubles|парн/i.test(String(match.league || ""));
}

function competitor(record, sideName) {
  if (sideName === "home") {
    return {
      id: firstId(value(record, "PX")),
      slug: value(record, "WU"),
      name: value(record, "AE", "Home"),
      shortName: value(record, "FH", value(record, "AE", "Home"))
    };
  }
  return {
    id: firstId(value(record, "PY")),
    slug: value(record, "WV"),
    name: value(record, "AF", "Away"),
    shortName: value(record, "FK", value(record, "AF", "Away"))
  };
}

function firstId(raw) {
  return String(raw || "").split("/").filter(Boolean)[0] || "";
}

function parseUnixSeconds(raw) {
  const textValue = String(raw || "").trim();
  const digits = textValue.match(/\d{10,13}/)?.[0];
  if (!digits) return null;
  let numeric = Number(digits);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  if (numeric > 1e12) numeric = Math.floor(numeric / 1000);
  if (numeric < 1e9 || numeric > 2.5e9) return null;
  return numeric;
}

function formatStartTime(unixSeconds) {
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return "";
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: BOT_DISPLAY_TZ
    }).format(new Date(unixSeconds * 1000));
  } catch (_error) {
    return "";
  }
}

function formatIsoTime(isoValue) {
  const raw = String(isoValue || "").trim();
  if (!raw) return "";
  const ms = Date.parse(raw);
  if (!ms || isNaN(ms)) return "";
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: BOT_DISPLAY_TZ
    }).format(new Date(ms));
  } catch (_error) {
    return "";
  }
}

function upcomingHint(match) {
  if (match.status !== "scheduled") return "";
  const start = formatStartTime(match.startTimeUnix);
  return start ? `Начало матча ориентировочно в ${start} (МСК)` : "";
}

function tournamentName(raw) {
  const textValue = String(raw || "Tennis").trim();
  return (textValue.split(":").slice(1).join(":").trim() || textValue).replace(/\s+/g, " ");
}

function flashscoreEventUrl(base, match) {
  const homePath = competitorPath(match.home);
  const awayPath = competitorPath(match.away);
  if (!homePath || !awayPath) return `${base}/match/tennis/live-match/?mid=${encodeURIComponent(match.id)}`;
  return `${base}/match/tennis/${encodeURIComponent(homePath)}/${encodeURIComponent(awayPath)}/?mid=${encodeURIComponent(match.id)}`;
}

function competitorPath(player) {
  if (!player.slug || !player.id) return "";
  return String(player.slug).endsWith(`-${player.id}`) ? player.slug : `${player.slug}-${player.id}`;
}

function scoreLabel(record) {
  const pairs = [
    ["BA", "BB"],
    ["BC", "BD"],
    ["BE", "BF"],
    ["BG", "BH"],
    ["BI", "BJ"]
  ];
  const sets = pairs
    .map(([homeKey, awayKey]) => [value(record, homeKey), value(record, awayKey)])
    .filter(([home, away]) => home !== "" || away !== "")
    .map(([home, away]) => `${home || "0"}-${away || "0"}`);
  const points = [value(record, "WA"), value(record, "WB")];
  return [sets.join(" "), points[0] || points[1] ? `${points[0] || "0"}:${points[1] || "0"}` : ""].filter(Boolean).join(" | ");
}

function matchButtonLabel(match) {
  const scheduledStart = match.status === "scheduled" ? formatStartTime(match.startTimeUnix) : "";
  const left = scheduledStart ? `Старт ${scheduledStart}` : stageLabel(match);
  return truncate([left, match.score, `${match.home.shortName} - ${match.away.shortName}`].filter(Boolean).join(" | "), 58);
}

function matchTitle(match) {
  const meta = [stageLabel(match), match.score].filter(Boolean).join(" | ");
  const startHint = upcomingHint(match);
  return [match.tournament, `${match.home.name} - ${match.away.name}`, meta, startHint].filter(Boolean).join("\n");
}

function stageLabel(match) {
  if (match.status === "live") return STAGES[match.stageCode] || "Live";
  if (match.status === "finished") return "Finished";
  return "Скоро";
}

function overlayInstructions(origin, match, program, mode, speed, custom = {}, urlOverride = "") {
  const programKey = PROGRAM_LABELS[program] ? program : "obs";
  const modeKey = BOT_MODES.has(mode) ? mode : "stats";
  const speedKey = TICKER_SPEEDS[speed] ? speed : "normal";
  const sizeKey = tickerSizeKey(custom.tickerSize);
  const delay = statsDelaySeconds(custom.statsDelaySec);
  const oddsState = getOddsState(match.id);
  const odds = oddsSummary(custom, oddsState);
  const winlineStatus = oddsState.winlineUrl
    ? (oddsState.autoUpdate ? "подключено" : "подключено (пауза)")
    : "не подключено";
  const url = urlOverride || overlayPageUrl(origin, match, modeKey, speedKey, custom);
  if (modeKey === "ticker") {
    const tickerLines = [
      "\u0421\u043a\u043e\u0440\u043e\u0441\u0442\u044c: \u043c\u0435\u043d\u044f\u0439 \u0432 URL \u0447\u0435\u0440\u0435\u0437 ticker (\u043f\u0440\u0438\u043c\u0435\u0440: ticker=70)",
      `\u0420\u0430\u0437\u043c\u0435\u0440: ${TICKER_SIZES[sizeKey].label}`,
      "\u041f\u043b\u0430\u0448\u043a\u0430 \u00ab\u0421\u041c\u041e\u0422\u0420\u0418\u00bb: \u043e\u0442\u043a\u043b\u044e\u0447\u0435\u043d\u0430"
    ];
    return [
      "Готово. Ссылка на бегущую строку собрана.",
      "",
      `Матч для контекста: ${match.home.name} - ${match.away.name}`,
      `Программа: ${PROGRAM_LABELS[programKey]}`,
      `Режим: ${modeLabel(modeKey)}`,
      ...tickerLines,
      "",
      "URL:",
      url,
      "",
      "Что делать дальше:",
      ...programSteps(programKey)
    ].join("\n");
  }
  return [
    "Готово. Ссылка на статистику матча собрана.",
    "",
    `Матч:\n${matchTitle(match)}`,
    "",
    `Программа: ${PROGRAM_LABELS[programKey]}`,
    `Режим: ${modeLabel(modeKey)}`,
    `Скорость строки: ${TICKER_SPEEDS[speedKey].label} (${TICKER_SPEEDS[speedKey].pixelsPerSecond})`,
    `Задержка графики: ${delay} сек`,
    `Winline: ${winlineStatus}`,
    `Кэфы: ${odds.home} / ${odds.away}`,
    "",
    "URL:",
    url,
    "",
    "Подсказка по ручным правкам:",
    "Открой «Редактировать графические блоки» и меняй отдельно фамилии, короткие подписи и стадию. Коэффициенты Winline редактируются в отдельном меню.",
    "",
    "Что делать дальше:",
    ...programSteps(programKey),
  ].join("\n");
}

function overlayPageUrl(origin, match, mode, speed = "normal", custom = {}) {
  if (mode === "ticker") {
    const tickerSpeed = TICKER_SPEEDS[speed]?.pixelsPerSecond || 100;
    const tickerSize = TICKER_SIZES[tickerSizeKey(custom.tickerSize)]?.param || "normal";
    const tickerQuery = new URLSearchParams({
      ticker: String(tickerSpeed),
      height: tickerSize,
      cta: "0",
      mode: "flex",
      refresh: "60000",
      limit: String(NEWS_LIMIT)
    });
    return `${origin}${NEWS_TICKER_FLEX_PATH}?${tickerQuery.toString()}`;
  }
  const sourceQuery = new URLSearchParams({ url: match.url }).toString();
  const source = `/api/match/flashscore?${sourceQuery}`;
  const newsSource = "/api/news/tennis";
  const oddsQuery = new URLSearchParams({
    matchId: match.id || "",
    home: match.home?.name || "",
    away: match.away?.name || ""
  });
  const manualHomeOdd = custom.homeOdd || (custom.odds && custom.odds.manualPlayer1) || "";
  const manualAwayOdd = custom.awayOdd || (custom.odds && custom.odds.manualPlayer2) || "";
  if (manualHomeOdd) oddsQuery.set("homeOdd", manualHomeOdd);
  if (manualAwayOdd) oddsQuery.set("awayOdd", manualAwayOdd);
  const oddsSource = `/api/odds/current?${oddsQuery.toString()}`;
  const tickerSpeed = TICKER_SPEEDS[speed]?.pixelsPerSecond || 100;
  const query = new URLSearchParams({
    source,
    news: newsSource,
    odds: oddsSource,
    matchId: match.id || "",
    panel: mode,
    ticker: String(tickerSpeed),
    poll: "3000"
  });
  if (custom.homeName) query.set("homeName", custom.homeName);
  if (custom.awayName) query.set("awayName", custom.awayName);
  if (custom.homeCode) query.set("homeCode", custom.homeCode);
  if (custom.awayCode) query.set("awayCode", custom.awayCode);
  if (custom.homeCountry) query.set("homeCountry", custom.homeCountry);
  if (custom.awayCountry) query.set("awayCountry", custom.awayCountry);
  if (custom.stage) query.set("stage", custom.stage);
  if (manualHomeOdd) query.set("homeOdd", manualHomeOdd);
  if (manualAwayOdd) query.set("awayOdd", manualAwayOdd);
  const delay = statsDelaySeconds(custom.statsDelaySec);
  if (delay > 0) query.set("delay", String(delay));
  return `${origin}/overlay.html?${query.toString()}`;
}

function programSteps(program) {
  if (program === "vmix") {
    return [
      "1. vMix: Add Input -> Web Browser.",
      "2. Вставь URL в поле Address.",
      "3. Размер input: 1920x1080.",
      "4. Перед эфиром нажми Reload, если окно уже было открыто."
    ];
  }
  if (program === "streamlabs") {
    return [
      "1. Streamlabs: Sources -> Browser Source.",
      "2. Вставь URL в поле URL.",
      "3. Width 1920, Height 1080.",
      "4. Перед эфиром нажми Refresh cache/current page."
    ];
  }
  return [
    "1. OBS: Sources -> Browser.",
    "2. Вставь URL в поле URL.",
    "3. Width 1920, Height 1080.",
    "4. Перед эфиром нажми Refresh cache/current page."
  ];
}

function truncate(textValue, limit) {
  const text = String(textValue || "");
  return text.length > limit ? `${text.slice(0, Math.max(0, limit - 1))}…` : text;
}

async function flashscoreMatch(url, env) {
  const eventId = eventIdFrom(url.searchParams.get("id"), url.searchParams.get("url"));
  const base = String(env.FLASHSCORE_LIVE_BASE || DEFAULT_BASE).replace(/\/+$/, "");
  const matchUrl = url.searchParams.get("url") || (eventId === DEFAULT_MATCH_ID ? DEFAULT_MATCH_URL : `${base}/match/tennis/${eventId}/`);
  const feed = (name) => `${base}/x/feed/${name}_${PROJECT_ID}_${eventId}`;

  const [page, commonText, summaryText, statsText, historyText] = await Promise.all([
    fetchText(matchUrl, matchUrl),
    fetchText(feed("dc"), matchUrl),
    fetchText(feed("df_sui"), matchUrl),
    fetchText(feed("df_st"), matchUrl),
    fetchText(feed("df_mh"), matchUrl)
  ]);

  const common = parseFeed(commonText)[0] || {};
  const summary = parseSummary(parseFeed(summaryText));
  const history = parseHistory(parseFeed(historyText));
  const players = parsePlayers(page);
  const serving = inferServingSide(history);
  const stages = { ...STAGES, ...(safeJson(extractObject(page, '"eventStageTranslations":')) || {}) };
  const title = meta(page, "og:title") || players.map((player) => player.name).join(" - ");
  const stage = stages[value(common, "DB")] || summary.label || "Live";
  const sets = buildSetScores(history, { ...summary, label: stage }, common);

  return {
    schemaVersion: "1.0",
    provider: "flashscore",
    generatedAt: new Date().toISOString(),
    source: { eventId, url: matchUrl },
    match: {
      id: eventId,
      title,
      tournament: meta(page, "og:description"),
      status: value(common, "DL") === "3" ? "live" : "unknown",
      stage,
      duration: summary.duration,
      startedAtUnix: value(common, "DC"),
      updatedAtUnix: value(common, "DD")
    },
    players: players.map((player) => ({ ...player, isServing: player.side === serving })),
    score: {
      current: { home: value(common, "DP"), away: value(common, "DQ") },
      games: { home: value(common, "DN", summary.homeGames), away: value(common, "DO", summary.awayGames) },
      sets
    },
    statistics: parseStats(parseFeed(statsText)),
    matchHistory: history.games,
    currentGame: history.currentGame
  };
}

async function fetchText(url, referer) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9",
      referer,
      "x-fsign": FEED_SIGN
    }
  });
  if (!response.ok) throw new Error(`Flashscore ${response.status}: ${url}`);
  return response.text();
}

function eventIdFrom(id, sourceUrl) {
  if (id) return String(id).trim();
  if (!sourceUrl) return DEFAULT_MATCH_ID;
  const parsed = new URL(sourceUrl);
  const mid = parsed.searchParams.get("mid");
  if (mid) return mid;
  const match = parsed.pathname.match(/-([A-Za-z0-9]{8})(?:\/|$)/);
  if (match) return match[1];
  throw new Error("Pass ?id=... or Flashscore URL with ?mid=...");
}

function parseFeed(textValue) {
  return String(textValue || "")
    .split("¬~")
    .map((record) => record.replace(/~$/g, "").trim())
    .filter(Boolean)
    .map((record) => {
      const fields = {};
      for (const token of record.split("¬")) {
        const index = token.indexOf("÷");
        if (index > 0) fields[token.slice(0, index)] = token.slice(index + 1);
      }
      return fields;
    });
}

function value(record, key, fallback = "") {
  return record?.[key] ?? fallback;
}

function parseSummary(records) {
  const row = records.find((record) => record.AC && (record.IG || record.IH)) || {};
  const totalDuration =
    records.map((record) => value(record, "RB")).find(Boolean) ||
    records.map((record) => value(record, "RC")).find(Boolean) ||
    value(row, "RC", "");
  return {
    label: value(row, "AC"),
    homeGames: value(row, "IG"),
    awayGames: value(row, "IH"),
    duration: totalDuration
  };
}

function buildSetScores(history, summary, common) {
  const setsByNumber = new Map();
  for (const game of history.games || []) {
    const label = game.set || "Set 1";
    const number = setNumber(label, setsByNumber.size + 1);
    setsByNumber.set(number, {
      label,
      number,
      homeGames: game.homeGames,
      awayGames: game.awayGames,
      winner: game.winner || ""
    });
  }

  const existingNumbers = [...setsByNumber.keys()].filter((item) => Number.isFinite(item));
  const fallbackNumber = existingNumbers.length ? Math.max(...existingNumbers) : 1;
  const currentLabel = isSetLabel(summary.label) ? summary.label : `Set ${fallbackNumber}`;
  const currentNumber = setNumber(currentLabel, fallbackNumber);
  const current = {
    label: currentLabel,
    number: currentNumber,
    homeGames: value(common, "DN", summary.homeGames),
    awayGames: value(common, "DO", summary.awayGames),
    winner: setsByNumber.get(currentNumber)?.winner || ""
  };

  if (current.homeGames !== "" || current.awayGames !== "") {
    setsByNumber.set(currentNumber, { ...(setsByNumber.get(currentNumber) || {}), ...current });
  }

  return [...setsByNumber.values()]
    .sort((a, b) => Number(a.number || 0) - Number(b.number || 0))
    .slice(0, 5)
    .map((set, index) => ({
      label: set.label || `Set ${index + 1}`,
      number: set.number || index + 1,
      homeGames: set.homeGames ?? "",
      awayGames: set.awayGames ?? "",
      winner: set.winner || "",
      tieBreak: String(set.homeGames) === "6" && String(set.awayGames) === "6"
    }));
}

function setNumber(label, fallback) {
  const number = String(label || "").match(/\d+/)?.[0];
  return number ? Number(number) : fallback;
}

function isSetLabel(label) {
  const valueText = String(label || "").trim();
  if (!valueText) return false;
  return /^set\s*\d+/i.test(valueText) || /^\d+$/.test(valueText);
}

function inferServingSide(history) {
  if (history.currentGame?.server) return history.currentGame.server;
  const lastGame = [...(history.games || [])].reverse().find((game) => game.server);
  if (!lastGame) return "";
  return lastGame.server === "home" ? "away" : "home";
}

function parseHistory(records) {
  const games = [];
  let currentSet = "";
  let currentGame = null;
  for (const record of records) {
    if (record.HA) currentSet = record.HA;
    if (record.HC || record.HE) {
      games.push({
        set: currentSet,
        homeGames: value(record, "HC"),
        awayGames: value(record, "HE"),
        server: side(value(record, "HG")),
        winner: side(value(record, "HK")),
        points: value(record, "HL")
      });
    }
    if (record.HN || record.HO) {
      currentGame = {
        server: side(value(record, "HN")),
        points: value(record, "HO"),
        currentPoint: value(record, "HO").split(",").map((item) => item.trim()).filter(Boolean).at(-1) || ""
      };
    }
  }
  return { games, currentGame };
}

function parseStats(records) {
  const sections = [];
  let scope = "";
  let section = null;
  for (const record of records) {
    if (record.SE) {
      scope = record.SE;
      section = null;
      continue;
    }
    if (scope && scope !== "Match") continue;
    if (record.SF) {
      section = { section: record.SF, rows: [] };
      sections.push(section);
      continue;
    }
    if (record.SG) {
      if (!section) {
        section = { section: "Match", rows: [] };
        sections.push(section);
      }
      section.rows.push({ label: record.SG, home: value(record, "SH"), away: value(record, "SI") });
    }
  }
  return sections;
}

function parsePlayers(page) {
  const participants =
    safeJson(extractObject(page, '"participantsData":')) ||
    safeJson(extractObject(page, '"participants":')) ||
    {};
  const home = participants.home?.[0] || {};
  const away = participants.away?.[0] || {};
  return [
    player("home", home, "Home player"),
    player("away", away, "Away player")
  ];
}

function player(sideName, row, fallback) {
  return {
    side: sideName,
    id: row.id || "",
    name: row.full_name || row.seo_name || row.name || fallback,
    shortName: row.name || row.short_name || row.full_name || fallback,
    country: row.country || "",
    rank: Array.isArray(row.rank) ? row.rank[1] || "" : "",
    image: row.image_path || ""
  };
}

function side(code) {
  return code === "1" ? "home" : code === "2" ? "away" : "";
}

function meta(page, property) {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, "i");
  return page.match(pattern)?.[1] || "";
}

function extractObject(textValue, marker) {
  const markerIndex = textValue.indexOf(marker);
  if (markerIndex < 0) return null;
  const start = textValue.indexOf("{", markerIndex + marker.length);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < textValue.length; index += 1) {
    const char = textValue[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") depth -= 1;
    if (depth === 0) return textValue.slice(start, index + 1);
  }
  return null;
}

function safeJson(jsonText) {
  try {
    return jsonText ? JSON.parse(jsonText) : null;
  } catch (_error) {
    return null;
  }
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      ...extraHeaders
    }
  });
}

function html(body) {
  return text(body, "text/html; charset=utf-8");
}

function text(body, contentType) {
  return new Response(body, { headers: { "content-type": contentType, "cache-control": "public, max-age=60" } });
}

function overlayCss() {
  return OVERLAY_CSS
    .replaceAll('url("/news-ticker-bg.png")', `url("${NEWS_TICKER_BG_URL}")`)
    .replaceAll('url("/news-ticker-logo.png")', `url("${NEWS_TICKER_LOGO_URL}")`);
}

function newsTickerCss() {
  return NEWS_TICKER_CSS
    .replaceAll('url("/news-ticker-bg.png")', `url("${NEWS_TICKER_BG_URL}")`)
    .replaceAll('url("/news-ticker-bg-small.png")', `url("${NEWS_TICKER_BG_SMALL_URL}")`)
    .replaceAll('url("/news-ticker-logo.png")', `url("${NEWS_TICKER_LOGO_URL}")`);
}

function assetRedirect(assetUrl) {
  return Response.redirect(assetUrl, 302);
}

const OVERLAY_HTML = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tennis Overlay</title>
<link rel="stylesheet" href="/overlay.css?v=20260529-4">
</head>
<body>
<main id="overlay" class="overlay">
  <section class="left-panel" aria-label="Статистика матча">
    <div class="promo-art"><img src="/assets/promo-top-left.jpg" alt=""></div>
    <div class="stats-title">СТАТИСТИКА МАТЧА</div>
    <div class="stats-head">
      <div id="statHomeCode" class="team-code">---</div>
      <div id="statAwayCode" class="team-code">---</div>
    </div>
    <div id="statsGrid" class="stats-grid"></div>
    <div class="odds-panel">
      <div class="odds-title">КОЭФФИЦИЕНТЫ WINLINE</div>
      <div class="odds-values">
        <div id="homeOdds" class="odds-box">--</div>
        <div id="awayOdds" class="odds-box">--</div>
      </div>
    </div>
  </section>

  <section class="video-zone" aria-label="Зона видео"></section>

  <section class="score-strip" aria-label="Счет матча">
    <div id="scoreTournament" class="score-tournament">FRENCH OPEN | МУЖЧИНЫ | ПЕРВЫЙ КРУГ</div>
    <div id="scoreClock" class="score-clock">ВРЕМЯ МАТЧА | --:--</div>

    <div id="scoreHome" class="score-row home">
      <div id="homeCountry" class="country-code">---</div>
      <div class="serve-slot"><span class="tennis-ball"></span></div>
      <img id="homePhoto" class="player-photo" alt="">
      <div id="homeScoreName" class="score-name">ИГРОК 1</div>
      <div id="homeLivePoints" class="live-value">0</div>
      <div class="live-separator">|</div>
      <div id="homeSet1" class="set-cell"></div>
      <div id="homeSet2" class="set-cell"></div>
      <div id="homeSet3" class="set-cell"></div>
      <div id="homeSet4" class="set-cell"></div>
      <div id="homeSet5" class="set-cell"></div>
    </div>

    <div id="scoreAway" class="score-row away">
      <div id="awayCountry" class="country-code">---</div>
      <div class="serve-slot"><span class="tennis-ball"></span></div>
      <img id="awayPhoto" class="player-photo" alt="">
      <div id="awayScoreName" class="score-name">ИГРОК 2</div>
      <div id="awayLivePoints" class="live-value">0</div>
      <div class="live-separator">|</div>
      <div id="awaySet1" class="set-cell"></div>
      <div id="awaySet2" class="set-cell"></div>
      <div id="awaySet3" class="set-cell"></div>
      <div id="awaySet4" class="set-cell"></div>
      <div id="awaySet5" class="set-cell"></div>
    </div>
  </section>

  <section class="ticker" aria-label="Новости">
    <div class="ticker-mask"><div id="tickerTrack" class="ticker-track">Загружаем новости...</div></div>
    <div id="tickerCta" class="ticker-cta" hidden>
      <span class="ticker-cta-arrow">↓</span>
      <span class="ticker-cta-text">СМОТРИ ПРЯМУЮ ТРАНСЛЯЦИЮ МАТЧА ПО ССЫЛКЕ</span>
      <span class="ticker-cta-arrow">↓</span>
    </div>
  </section>
</main>
<script src="/overlay.js?v=20260529-4"></script>
</body>
</html>
`;

const OVERLAY_CSS = `@import url("https://fonts.googleapis.com/css2?family=Sofia+Sans:ital,wght@0,400..900;1,400..900&family=Sofia+Sans+Condensed:ital,wght@0,400..900;1,400..900&display=swap");

:root {
  --purple: #4b2b86;
  --lime: #dfff24;
  --green: #205900;
  --black: #111117;
  --line: #a9a9a9;
  --blue: #006bff;
}

* {
  box-sizing: border-box;
}

html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: transparent;
  font-family: "Sofia Sans", Arial, sans-serif;
  color: #111;
}

.overlay {
  position: relative;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  background: transparent;
  transform-origin: top left;
}

.left-panel {
  position: absolute;
  left: 0;
  top: 0;
  width: 540px;
  height: 978px;
  background: #fff;
  overflow: hidden;
}

.promo-art {
  position: absolute;
  left: 0;
  top: 0;
  width: 540px;
  height: 226px;
  overflow: hidden;
  background: #230a1f;
}

.promo-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.stats-title {
  position: absolute;
  left: 0;
  top: 226px;
  width: 540px;
  height: 67px;
  background: #fff;
  color: var(--purple);
  font-family: "Sofia Sans Condensed", Arial, sans-serif;
  font-size: 51px;
  line-height: 67px;
  font-weight: 900;
  font-style: italic;
  text-align: center;
}

.stats-head {
  position: absolute;
  left: 0;
  top: 293px;
  width: 540px;
  height: 60px;
  background: var(--purple);
  display: grid;
  grid-template-columns: 181px 182px 177px;
  align-items: center;
}

.team-code {
  color: #fff;
  font-size: 30px;
  font-weight: 900;
  text-align: center;
}

.team-code:first-child {
  grid-column: 1;
}

.team-code:last-child {
  grid-column: 3;
}

.stats-grid {
  position: absolute;
  left: 0;
  top: 353px;
  width: 540px;
  height: 420px;
  display: grid;
  grid-template-rows: repeat(7, 60px);
  background: #fff;
}

.stat-row-template {
  display: grid;
  grid-template-columns: 181px 182px 177px;
  min-height: 60px;
}

.stat-cell {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--line);
  font-size: 26px;
  font-weight: 800;
  color: var(--purple);
  text-align: center;
  white-space: nowrap;
}

.stat-label {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  background: var(--purple);
  color: #fff;
  border-bottom: 0;
  font-size: 17px;
  line-height: 18px;
  font-weight: 900;
  text-align: center;
  text-transform: uppercase;
}

.odds-panel {
  position: absolute;
  left: 0;
  top: 778px;
  width: 540px;
  height: 200px;
  background: var(--black);
  border-top: 1px solid #24242c;
}

.odds-title {
  position: absolute;
  left: 62px;
  top: 20px;
  color: #fff;
  font-family: "Sofia Sans Condensed", Arial, sans-serif;
  font-size: 38px;
  line-height: 40px;
  font-weight: 900;
  font-style: italic;
}

.odds-values {
  position: absolute;
  left: 56px;
  right: 54px;
  top: 91px;
  display: flex;
  justify-content: space-between;
}

.odds-box {
  width: 146px;
  height: 66px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: skew(-10deg);
  background: var(--blue);
  color: #fff;
  font-size: 34px;
  font-weight: 900;
  line-height: 1;
}

.video-zone {
  position: absolute;
  left: 546px;
  top: 0;
  width: 1374px;
  height: 773px;
  background: var(--green);
}

.score-strip {
  position: absolute;
  left: 546px;
  top: 773px;
  width: 1374px;
  height: 205px;
  background: #fff;
  overflow: hidden;
}

.score-tournament {
  position: absolute;
  left: 68px;
  top: 17px;
  width: 900px;
  height: 36px;
  color: #111;
  font-size: 31px;
  line-height: 36px;
  font-weight: 500;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.score-clock {
  position: absolute;
  left: 960px;
  right: 38px;
  top: 17px;
  height: 36px;
  text-align: right;
  color: #111;
  font-size: 31px;
  line-height: 36px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
}

.score-row {
  position: absolute;
  left: 68px;
  width: 1220px;
  height: 60px;
  display: grid;
  grid-template-columns: 72px 44px 61px 631px 66px 16px repeat(5, 46px);
  column-gap: 10px;
  align-items: center;
}

.score-row.home {
  top: 71px;
}

.score-row.away {
  top: 134px;
}

.country-code {
  font-size: 31px;
  font-weight: 500;
  text-align: left;
  line-height: 44px;
}

.serve-slot {
  width: 44px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tennis-ball {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff67a 0 12%, #dfff24 34%, #a5c90b 100%);
  box-shadow: 0 0 12px rgba(212, 255, 31, 0.8);
  opacity: 0;
  position: relative;
}

.tennis-ball::before,
.tennis-ball::after {
  content: "";
  position: absolute;
  top: 2px;
  bottom: 2px;
  width: 12px;
  border: 2px solid rgba(255, 255, 255, 0.9);
  border-left: 0;
  border-radius: 50%;
  opacity: 0.9;
}

.tennis-ball::before {
  left: 2px;
  transform: rotate(24deg);
}

.tennis-ball::after {
  right: 2px;
  transform: rotate(204deg);
}

.score-row.serving .tennis-ball {
  opacity: 1;
}

.player-photo {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--lime);
  border: 4px solid var(--lime);
}

.score-name {
  min-width: 0;
  color: #000;
  font-family: "Sofia Sans Condensed", Arial, sans-serif;
  font-size: 43px;
  line-height: 54px;
  font-weight: 900;
  font-style: italic;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.live-value {
  width: 66px;
  text-align: center;
  color: #111;
  font-size: 36px;
  line-height: 48px;
  font-weight: 700;
}

.live-value.advantage {
  font-style: italic;
  font-weight: 900;
}

.live-separator {
  width: 16px;
  text-align: center;
  color: #222;
  font-size: 42px;
  line-height: 48px;
  font-weight: 600;
}

.set-cell {
  position: relative;
  width: 46px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.set-main {
  position: relative;
  z-index: 1;
  min-width: 32px;
  text-align: center;
  color: #111;
  font-size: 34px;
  font-weight: 600;
  line-height: 1;
}

.set-main.won {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--purple);
  color: #fff;
  font-weight: 900;
}

.tie-break-index {
  position: absolute;
  top: -7px;
  right: -5px;
  color: #111;
  font-size: 13px;
  font-weight: 900;
  line-height: 1;
  pointer-events: none;
}

.set-cell.tie-break .set-main {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: #dc203f;
  color: #fff;
  font-weight: 900;
}

.set-cell.tie-break .set-main.won {
  background: #dc203f;
}

.ticker {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 102px;
  overflow: hidden;
  background: url("/news-ticker-bg.png") left bottom / 1920px 1080px no-repeat;
}

.ticker-mask {
  position: absolute;
  left: 150px;
  right: 0;
  top: 0;
  z-index: 2;
  height: 102px;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to right, transparent 0, transparent 10px, #000 112px, #000 100%);
  mask-image: linear-gradient(to right, transparent 0, transparent 10px, #000 112px, #000 100%);
}

.ticker-track {
  position: absolute;
  left: 0;
  top: 0;
  height: 102px;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  color: #fff;
  font-family: "Sofia Sans Condensed", Arial, sans-serif;
  font-size: 42px;
  line-height: 102px;
  font-weight: 900;
  font-style: italic;
  text-transform: uppercase;
  text-shadow: 0 2px 2px rgba(0, 0, 0, 0.18);
  will-change: transform;
  animation: none;
}

.ticker-cta {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48px;
  color: #fff;
  text-transform: uppercase;
  text-shadow: 0 2px 2px rgba(0, 0, 0, 0.24);
  font-family: "Sofia Sans Condensed", Arial, sans-serif;
  pointer-events: none;
}

.ticker-cta[hidden] {
  display: none;
}

.ticker-cta-text {
  font-size: 52px;
  line-height: 1;
  font-weight: 900;
  font-style: italic;
}

.ticker-cta-arrow {
  color: var(--lime);
  font-size: 64px;
  line-height: 1;
  font-weight: 900;
}

.guides .left-panel,
.guides .video-zone,
.guides .score-strip,
.guides .ticker {
  outline: 2px solid rgba(202, 255, 61, 0.8);
}

@keyframes ticker-scroll {
  from {
    transform: translateX(var(--ticker-start, 1808px));
  }

  to {
    transform: translateX(-100%);
  }
}
`;

const OVERLAY_JS = `const params = new URLSearchParams(window.location.search);

const TICKER_SPEEDS = { slow: 60, normal: 100, fast: 130 };
const TICKER_CTA_HOLD_MS = 60000;
const TICKER_SEPARATOR = "   ✦   ";
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
  { label: "ДВОЙНЫЕ\\\\nОШИБКИ", sources: [["Service", "Double Faults"]] },
  { label: "% ПЕРВОЙ\\\\nПОДАЧИ", sources: [["Service", "1st serve percentage"]] },
  { label: "ОЧКИ НА\\\\nПЕРВОЙ ПОДАЧЕ", sources: [["Service", "1st serve points won"]] },
  { label: "ОЧКИ НА\\\\nВТОРОЙ ПОДАЧЕ", sources: [["Service", "2nd serve points won"]] },
  { label: "БРЕЙК-ПОИНТЫ", sources: [["Return", "Break Points Converted"], ["Service", "Break Points Saved"]] },
  { label: "РОЗЫГРЫШИ\\\\nПОД ДАВЛЕНИЕМ", sources: [["Points", "Last 10 balls"], ["Points", "Total Points Won"]] }
];

const config = {
  source: params.get("source") || "/api/match/flashscore?id=Sril3X2m",
  news: params.get("news") || "/api/news/tennis",
  odds: params.get("odds") || "",
  matchId: params.get("matchId") || "",
  winline: params.get("winline") || "",
  ticker: params.get("ticker") || params.get("tickerSpeed") || "100",
  poll: Number(params.get("poll") || 3000),
  guides: params.get("guides") === "1",
  stage: params.get("stage") || "",
  homeName: params.get("homeName") || "",
  awayName: params.get("awayName") || "",
  homeCode: params.get("homeCode") || "",
  awayCode: params.get("awayCode") || "",
  homeCountry: params.get("homeCountry") || "",
  awayCountry: params.get("awayCountry") || "",
  homeOdd: params.get("homeOdd") || "",
  awayOdd: params.get("awayOdd") || "",
  delay: params.get("delay") || params.get("delaySec") || "0"
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
  homeLivePoints: document.querySelector("#homeLivePoints"),
  awayLivePoints: document.querySelector("#awayLivePoints"),
  homeOdds: document.querySelector("#homeOdds"),
  awayOdds: document.querySelector("#awayOdds"),
  tickerMask: document.querySelector(".ticker-mask"),
  tickerTrack: document.querySelector("#tickerTrack"),
  tickerCta: document.querySelector("#tickerCta")
};

let lastMatchData = null;
let activeTickerText = "Загружаем новости...";
let queuedTickerText = "";
let tickerStarted = false;
let ctaTimer = null;
let newsFetchInFlight = null;
const matchFrameQueue = [];

function asText(value, fallback) {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function fetchJson(url) {
  return fetch(url, { cache: "no-store" }).then((response) => {
    if (!response.ok) throw new Error(\`\${response.status} \${response.statusText}\`);
    return response.json();
  });
}

function statsDelayMs() {
  const numeric = Number(config.delay);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.min(Math.round(numeric), 300) * 1000;
}

function flushMatchQueue(now = Date.now()) {
  while (matchFrameQueue.length && matchFrameQueue[0].readyAt <= now) {
    const frame = matchFrameQueue.shift();
    renderMatch(frame.data);
  }
}

function queueMatchRender(data) {
  const delayMs = statsDelayMs();
  if (delayMs <= 0) {
    matchFrameQueue.length = 0;
    renderMatch(data);
    return;
  }
  matchFrameQueue.push({ readyAt: Date.now() + delayMs, data });
  if (matchFrameQueue.length > 500) {
    matchFrameQueue.splice(0, matchFrameQueue.length - 500);
  }
  flushMatchQueue();
}

function statHtml() {
  return STAT_ROWS.map((row) => (
    \`<div class="stat-row-template"><div class="stat-cell" data-stat-home="\${row.label.replace(/\\\\n/g, " ")}"></div><div class="stat-label">\${row.label.replace(/\\\\n/g, "<br>")}</div><div class="stat-cell" data-stat-away="\${row.label.replace(/\\\\n/g, " ")}"></div></div>\`
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
  const cleaned = String(name || "").replace(/\\([^)]*\\)/g, "").trim();
  const parts = cleaned.split(/\\s+/).filter(Boolean);
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
  return initials ? \`\${initials}. \${lastText}\` : lastText;
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
  if (/1\\/64|128|1st round|first round|1 round/i.test(value)) return "ПЕРВЫЙ КРУГ";
  if (/1\\/32|64|2nd round|second round|2 round/i.test(value)) return "ВТОРОЙ КРУГ";
  if (/1\\/16|32|3rd round|third round|3 round/i.test(value)) return "ТРЕТИЙ КРУГ";
  if (/1\\/8|16|4th round|fourth round|4 round/i.test(value)) return "1/8 ФИНАЛА";
  if (value.includes("quarter")) return "1/4 ФИНАЛА";
  if (value.includes("semi")) return "ПОЛУФИНАЛ";
  if (value.includes("final")) return "ФИНАЛ";
  return String(stage || "").replace(/set \\d+/i, "").replace(/\\s+/g, " ").trim().toUpperCase();
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
  return \`\${tournament.toUpperCase()} | \${gender} | \${stage}\`;
}

function isCompletedSet(home, away) {
  if (!Number.isFinite(home) || !Number.isFinite(away)) return false;
  if (home === away) return false;
  const max = Math.max(home, away);
  const min = Math.min(home, away);
  if (max < 6) return false;
  if (max === 6) return min <= 4;
  if (max === 7) return min >= 5 && min <= 6;
  return max - min >= 2;
}

function setWinner(set) {
  const home = Number(set && set.homeGames);
  const away = Number(set && set.awayGames);
  if (!isCompletedSet(home, away)) return "";
  return home > away ? "home" : "away";
}

function setGameNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function isFinishedTieBreakScore(home, away) {
  if (!isCompletedSet(home, away)) return false;
  const max = Math.max(home, away);
  const min = Math.min(home, away);
  return max >= 8 && min >= 6 && max - min === 2;
}

function normalizeSetForDisplay(set) {
  const rawHome = setGameNumber(set && set.homeGames);
  const rawAway = setGameNumber(set && set.awayGames);

  if (!Number.isFinite(rawHome) || !Number.isFinite(rawAway)) {
    return {
      homeMain: asText(set && set.homeGames, ""),
      awayMain: asText(set && set.awayGames, ""),
      homeTieBreak: "",
      awayTieBreak: "",
      winner: "",
      tieBreakLive: false
    };
  }

  let homeMain = rawHome;
  let awayMain = rawAway;
  let homeTieBreak = "";
  let awayTieBreak = "";

  if (isFinishedTieBreakScore(rawHome, rawAway)) {
    homeTieBreak = String(rawHome);
    awayTieBreak = String(rawAway);
    if (rawHome > rawAway) {
      homeMain = 7;
      awayMain = 6;
    } else {
      homeMain = 6;
      awayMain = 7;
    }
  }

  const winner = isCompletedSet(homeMain, awayMain)
    ? (homeMain > awayMain ? "home" : "away")
    : "";
  const tieBreakLive = !homeTieBreak && !awayTieBreak && (Boolean(set && set.tieBreak) || (homeMain === 6 && awayMain === 6));

  return {
    homeMain: String(homeMain),
    awayMain: String(awayMain),
    homeTieBreak,
    awayTieBreak,
    winner,
    tieBreakLive
  };
}

function renderSetCell(cell, mainScore, tieBreakScore, won) {
  cell.replaceChildren();

  const main = document.createElement("span");
  main.className = "set-main";
  if (won) main.classList.add("won");
  main.textContent = asText(mainScore, "");
  cell.appendChild(main);

  if (tieBreakScore) {
    const tieBreak = document.createElement("span");
    tieBreak.className = "tie-break-index";
    tieBreak.textContent = String(tieBreakScore);
    cell.appendChild(tieBreak);
  }
}

function renderSets(data) {
  const sets = (data && data.score && Array.isArray(data.score.sets)) ? data.score.sets : [];
  for (let i = 0; i < 5; i += 1) {
    const set = sets[i] || {};
    const home = document.querySelector(\`#homeSet\${i + 1}\`);
    const away = document.querySelector(\`#awaySet\${i + 1}\`);
    if (!home || !away) continue;

    home.classList.remove("tie-break", "winner");
    away.classList.remove("tie-break", "winner");

    const display = normalizeSetForDisplay(set);
    renderSetCell(home, display.homeMain, display.homeTieBreak, display.winner === "home");
    renderSetCell(away, display.awayMain, display.awayTieBreak, display.winner === "away");

    if (display.tieBreakLive) {
      home.classList.add("tie-break");
      away.classList.add("tie-break");
    }
  }
}

function formatPoint(value) {
  const point = String(value || "").trim().toUpperCase();
  if (!point) return "-";
  if (point.includes("Б!")) return "Б!";
  if (point === "A" || point === "AD" || point === "40A") return "Б!";
  const numeric = point.match(/(?:^|[^0-9])(40|30|15|0)(?:[^0-9]|$)/);
  if (numeric) return numeric[1];
  const adv = point.match(/(?:^|[^A-Z])(A|AD)(?:[^A-Z]|$)/);
  if (adv) return "Б!";
  return point;
}

function cleanPointToken(value) {
  const formatted = formatPoint(value);
  return /^(0|15|30|40|Б!)$/.test(formatted) ? formatted : "";
}

function parsePointPairFromCurrentGame(data) {
  const point = String(data?.currentGame?.currentPoint || data?.currentGame?.points || "").trim();
  if (!point) return null;
  const parts = point.split(":");
  if (parts.length < 2) return null;
  const home = cleanPointToken(parts[0]);
  const away = cleanPointToken(parts[1]);
  if (!home || !away) return null;
  return { home, away };
}

function looksLikeGamePoint(value) {
  return Boolean(cleanPointToken(value));
}

function resolveCurrentPoints(data) {
  const fromGame = parsePointPairFromCurrentGame(data);
  if (fromGame) return fromGame;

  const raw = data?.score?.current || {};
  const home = cleanPointToken(raw.home);
  const away = cleanPointToken(raw.away);
  if (looksLikeGamePoint(home) && looksLikeGamePoint(away)) {
    return { home, away };
  }
  return { home: "-", away: "-" };
}

function renderLivePoint(element, value) {
  const formatted = formatPoint(value);
  element.textContent = formatted;
  element.classList.toggle("advantage", formatted === "Б!");
}

function renderPlayer(side, player) {
  const isHome = side === "home";
  const row = isHome ? refs.scoreHome : refs.scoreAway;
  const photo = isHome ? refs.homePhoto : refs.awayPhoto;
  const country = isHome ? refs.homeCountry : refs.awayCountry;
  const scoreName = isHome ? refs.homeScoreName : refs.awayScoreName;
  const forcedName = isHome ? config.homeName : config.awayName;
  const forcedCountry = isHome ? config.homeCountry : config.awayCountry;

  country.textContent = countryCode(forcedCountry || player.country);
  scoreName.textContent = toRussianDisplayName(forcedName || player.name || player.shortName);
  photo.src = player.image || "";
  photo.alt = player.name || "";
  row.classList.toggle("serving", Boolean(player.isServing));
}

function formatPlannedStart(unixValue) {
  const numeric = Number(unixValue);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  const seconds = numeric > 1e12 ? Math.floor(numeric / 1000) : numeric;
  if (seconds < 1e9 || seconds > 2.5e9) return "";
  if (seconds < Math.floor(Date.now() / 1000) - 1800) return "";
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Moscow"
    }).format(new Date(seconds * 1000));
  } catch (_error) {
    return "";
  }
}

function fitScoreClockText() {
  const element = refs.scoreClock;
  if (!element) return;

  let size = 31;
  element.style.fontSize = size + "px";
  element.style.lineHeight = "36px";

  const maxWidth = element.clientWidth || 320;
  while (element.scrollWidth > maxWidth && size > 18) {
    size -= 1;
    element.style.fontSize = size + "px";
    element.style.lineHeight = Math.max(24, Math.round(size * 1.16)) + "px";
  }
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

  const plannedStart = formatPlannedStart(match.startedAtUnix);
  if (match.status === "live" && duration) {
    refs.scoreClock.textContent = "ВРЕМЯ МАТЧА | " + duration;
  } else if (plannedStart) {
    refs.scoreClock.textContent = "НАЧАЛО МАТЧА | " + plannedStart + " (МСК)";
  } else {
    refs.scoreClock.textContent = "СКОРО";
  }
  fitScoreClockText();

  const current = resolveCurrentPoints(data || {});
  renderLivePoint(refs.homeLivePoints, current.home);
  renderLivePoint(refs.awayLivePoints, current.away);

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
  refs.tickerTrack.style.setProperty("--ticker-start", \`\${maskWidth}px\`);
  const distance = maskWidth + (refs.tickerTrack.scrollWidth || 1200);
  const duration = Math.max(12, Math.round(distance / tickerSpeed()));
  refs.tickerTrack.style.setProperty("--ticker-duration", \`\${duration}s\`);
  void refs.tickerTrack.offsetWidth;
  refs.tickerTrack.style.animation = "ticker-scroll var(--ticker-duration) linear 1";
}

function tickerItemsFromPayload(payload) {
  const list = Array.isArray(payload) ? payload : payload.items || [];
  const items = list.map((item) => (typeof item === "string" ? item : item.title)).filter(Boolean).slice(0, 15);
  return items.length ? items : ["Новости временно недоступны"];
}

function tickerTextFromItems(items) {
  const text = items.map((item) => String(item || "").trim()).filter(Boolean).join(TICKER_SEPARATOR);
  return text || "Новости временно недоступны";
}

function beginNewsCycle() {
  restartTicker(activeTickerText || "Новости временно недоступны");
}

function ensureTickerStarted() {
  if (tickerStarted) return;
  tickerStarted = true;
  beginNewsCycle();
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
  if (queuedTickerText) {
    activeTickerText = queuedTickerText;
    queuedTickerText = "";
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
  holdCta();
}

function oddsUrl() {
  if (config.odds) return config.odds;
  if (config.matchId) {
    const url = new URL("/api/odds/current", window.location.origin);
    url.searchParams.set("matchId", config.matchId);
    return \`\${url.pathname}\${url.search}\`;
  }
  const players = lastMatchData && Array.isArray(lastMatchData.players) ? lastMatchData.players : [];
  const homePlayer = players.find((player) => player.side === "home") || {};
  const awayPlayer = players.find((player) => player.side === "away") || {};
  const home = homePlayer.name || "";
  const away = awayPlayer.name || "";
  const url = new URL("/api/odds/current", window.location.origin);
  if (lastMatchData && lastMatchData.source && lastMatchData.source.eventId) {
    url.searchParams.set("matchId", lastMatchData.source.eventId);
  }
  url.searchParams.set("home", home);
  url.searchParams.set("away", away);
  if (config.winline) url.searchParams.set("matchUrl", config.winline);
  if (config.homeOdd) url.searchParams.set("homeOdd", config.homeOdd);
  if (config.awayOdd) url.searchParams.set("awayOdd", config.awayOdd);
  return \`\${url.pathname}\${url.search}\`;
}

function formatOdds(value) {
  const numeric = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(numeric)) return "-";
  return numeric.toFixed(2);
}

function renderOdds(payload) {
  const odds = payload && payload.odds ? payload.odds : {};
  const home = odds.home ?? odds.player1 ?? null;
  const away = odds.away ?? odds.player2 ?? null;
  refs.homeOdds.textContent = formatOdds(home);
  refs.awayOdds.textContent = formatOdds(away);
}

async function refreshMatch() {
  try {
    queueMatchRender(await fetchJson(config.source));
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
  fitScoreClockText();
  if (!tickerStarted) return;
  if (ctaTimer) return;
  restartTicker(activeTickerText || "Новости временно недоступны");
});

refreshMatch().then(refreshOdds);
queueNewsRefresh();
setInterval(refreshMatch, Math.max(config.poll, 1000));
setInterval(flushMatchQueue, 250);
setInterval(queueNewsRefresh, 60000);
setInterval(refreshOdds, 2000);
`;

const NEWS_TICKER_HTML = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Больше! tennis news ticker</title>
<link rel="stylesheet" href="/news-ticker.css?v=20260530-2">
</head>
<body>
<main class="news-ticker-overlay" aria-label="Бегущая строка новостей">
  <section class="ticker" aria-label="Новости">
    <div class="ticker-mask"><div id="tickerTrack" class="ticker-track">Загружаем новости...</div></div>
    <div id="tickerCta" class="ticker-cta" hidden>
      <span class="ticker-cta-arrow">↓</span>
      <span class="ticker-cta-text">СМОТРИ ПРЯМУЮ ТРАНСЛЯЦИЮ МАТЧА ПО ССЫЛКЕ</span>
      <span class="ticker-cta-arrow">↓</span>
    </div>
  </section>
</main>
<script src="/news-ticker.js?v=20260530-2"></script>
</body>
</html>
`;

const NEWS_TICKER_FLEX_HTML = NEWS_TICKER_HTML;

const NEWS_TICKER_CSS = `@import url("https://fonts.googleapis.com/css2?family=Sofia+Sans:ital,wght@0,400..900;1,400..900&display=swap");

:root {
  --canvas-width: 1920px;
  --ticker-height: 102px;
  --ticker-font-size: 42px;
  --ticker-logo-left: 24px;
  --ticker-logo-top: 18px;
  --ticker-logo-width: 116px;
  --ticker-logo-height: 78px;
  --ticker-logo-cover-width: 180px;
  --ticker-safe-left: 150px;
  --ticker-fade-width: 112px;
  --ticker-cta-size: 52px;
  --ticker-arrow-size: 64px;
  --purple: #3c1474;
  --deep-purple: #260545;
  --lime: #dfff24;
}

* {
  box-sizing: border-box;
}

html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: transparent;
  font-family: "Sofia Sans", Arial, sans-serif;
}

.news-ticker-overlay {
  position: relative;
  width: var(--canvas-width);
  height: var(--ticker-height);
  overflow: hidden;
  transform-origin: top left;
  background: transparent;
}

.ticker {
  position: absolute;
  inset: 0;
  height: var(--ticker-height);
  overflow: hidden;
  background: url("/news-ticker-bg.png") left bottom / 1920px 1080px no-repeat;
}

.news-ticker-overlay.mode-flex.size-small .ticker {
  background: url("/news-ticker-bg-small.png") left top / 1920px 1080px no-repeat;
}

.news-ticker-overlay.mode-flex .ticker::before {
  content: "";
  position: absolute;
  left: var(--ticker-logo-left);
  top: var(--ticker-logo-top);
  width: var(--ticker-logo-width);
  height: var(--ticker-logo-height);
  background: url("/news-ticker-logo.png") center / contain no-repeat;
  z-index: 3;
  pointer-events: none;
}

.news-ticker-overlay.mode-flex .ticker::after {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  width: var(--ticker-logo-cover-width);
  height: var(--ticker-height);
  background: url("/news-ticker-bg.png") -220px bottom / 1920px 1080px no-repeat;
  z-index: 1;
  pointer-events: none;
}

.news-ticker-overlay.mode-flex.size-small .ticker::before,
.news-ticker-overlay.mode-flex.size-small .ticker::after {
  display: none;
}

.ticker-mask {
  position: absolute;
  left: var(--ticker-safe-left);
  right: 0;
  top: 0;
  z-index: 2;
  height: var(--ticker-height);
  overflow: hidden;
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0,
    transparent 10px,
    #000 var(--ticker-fade-width),
    #000 100%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0,
    transparent 10px,
    #000 var(--ticker-fade-width),
    #000 100%
  );
}

.ticker-track {
  position: absolute;
  left: 0;
  top: 0;
  display: inline-flex;
  align-items: center;
  height: var(--ticker-height);
  color: #fff;
  font-family: "Sofia Sans", Arial, sans-serif;
  font-size: var(--ticker-font-size);
  font-style: italic;
  font-weight: 900;
  line-height: var(--ticker-height);
  text-shadow: 0 2px 2px rgba(0, 0, 0, 0.24);
  text-transform: uppercase;
  white-space: nowrap;
  will-change: transform;
  animation: none;
}

.ticker-cta {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48px;
  color: #fff;
  text-transform: uppercase;
  text-shadow: 0 2px 2px rgba(0, 0, 0, 0.24);
  font-family: "Sofia Sans", Arial, sans-serif;
  pointer-events: none;
}

.ticker-cta[hidden] {
  display: none;
}

.ticker-cta-text {
  font-size: var(--ticker-cta-size);
  line-height: 1;
  font-weight: 900;
  font-style: italic;
}

.ticker-cta-arrow {
  color: var(--lime);
  font-size: var(--ticker-arrow-size);
  line-height: 1;
  font-weight: 900;
}

@keyframes ticker-scroll {
  from {
    transform: translateX(var(--ticker-start, 1770px));
  }

  to {
    transform: translateX(-100%);
  }
}
`;

const NEWS_TICKER_JS = `const params = new URLSearchParams(window.location.search);

const TICKER_SPEEDS = { slow: 60, normal: 100, fast: 130 };
const TICKER_HEIGHTS = {
  small: { height: 51, fontSize: 31, logoLeft: 16, logoTop: 10, logoWidth: 46, logoHeight: 31, safeLeft: 72, fadeWidth: 56 },
  normal: { height: 102, fontSize: 42, logoLeft: 24, logoTop: 18, logoWidth: 116, logoHeight: 78, safeLeft: 150, fadeWidth: 112 },
  large: { height: 128, fontSize: 52, logoLeft: 30, logoTop: 22, logoWidth: 125, logoHeight: 84, safeLeft: 172, fadeWidth: 132 }
};
const DEFAULT_TICKER_HEIGHT = 102;
const DEFAULT_LOGO_ASPECT = 116 / 78;
const TICKER_CTA_HOLD_MS = 60000;
const TICKER_SEPARATOR = "   ✦   ";
const modeFromPath = window.location.pathname.includes("news-ticker-flex") ? "flex" : "match";
const tickerMode = (params.get("mode") || modeFromPath).toLowerCase();
const isFlexTicker = tickerMode === "flex";

const config = {
  news: params.get("news") || "/api/news/tennis",
  ticker: params.get("ticker") || params.get("speed") || "100",
  height: isFlexTicker
    ? (params.get("height") || params.get("size") || params.get("tickerHeight") || "normal")
    : "normal",
  ctaEnabled: !isFlexTicker && params.get("cta") !== "0",
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
  const overlay = document.querySelector(".news-ticker-overlay");
  root.style.setProperty("--ticker-height", \`\${size.height}px\`);
  root.style.setProperty("--ticker-font-size", \`\${size.fontSize}px\`);
  root.style.setProperty("--ticker-logo-left", \`\${size.logoLeft}px\`);
  root.style.setProperty("--ticker-logo-top", \`\${size.logoTop}px\`);
  root.style.setProperty("--ticker-logo-width", \`\${size.logoWidth}px\`);
  root.style.setProperty("--ticker-logo-height", \`\${size.logoHeight}px\`);
  root.style.setProperty("--ticker-logo-cover-width", \`\${Math.max(size.safeLeft + 84, size.logoLeft + size.logoWidth + 40)}px\`);
  root.style.setProperty("--ticker-safe-left", \`\${size.safeLeft}px\`);
  root.style.setProperty("--ticker-fade-width", \`\${size.fadeWidth}px\`);
  root.style.setProperty("--ticker-cta-size", \`\${clampNumber(Math.round(size.fontSize * 1.25), 30, 64)}px\`);
  root.style.setProperty("--ticker-arrow-size", \`\${clampNumber(Math.round(size.fontSize * 1.5), 36, 84)}px\`);
  if (overlay) {
    const configuredHeightKey = String(config.height || "").toLowerCase();
    overlay.classList.toggle("mode-flex", isFlexTicker);
    overlay.classList.toggle("size-small", isFlexTicker && configuredHeightKey === "small");
  }
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
  if (!response.ok) throw new Error(\`\${response.status} \${response.statusText}\`);
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
  refs.track.style.setProperty("--ticker-start", \`\${maskWidth}px\`);
  const distance = maskWidth + (refs.track.scrollWidth || 1200);
  const duration = Math.max(12, Math.round(distance / tickerSpeed()));
  refs.track.style.setProperty("--ticker-duration", \`\${duration}s\`);
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
  if (!config.ctaEnabled) {
    switchCycleAfterCta();
    return;
  }
  showCta();
  if (ctaTimer) clearTimeout(ctaTimer);
  ctaTimer = setTimeout(switchCycleAfterCta, TICKER_CTA_HOLD_MS);
}

function handleTickerEnd() {
  if (ctaTimer) return;
  if (!config.ctaEnabled) {
    switchCycleAfterCta();
    return;
  }
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
`;

