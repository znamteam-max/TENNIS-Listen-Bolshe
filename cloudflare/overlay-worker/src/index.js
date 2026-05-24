const PROJECT_ID = "2";
const FEED_SIGN = "SW9D1eZo";
const DEFAULT_BASE = "https://www.flashscore.com";
const DEFAULT_LANG = "ru";
const SPORTS_TENNIS_NEWS_URL = "https://www.sports.ru/tennis/news/top/";
const DEFAULT_MATCH_ID = "Sril3X2m";
const DEFAULT_MATCH_URL =
  "https://www.flashscore.com/match/tennis/jasika-omar-lOWZLw6o/stewart-hamish-0j2A0w2n/?mid=Sril3X2m";
const TELEGRAM_WEBHOOK_PATH = "/telegram/webhook";
const NEWS_TICKER_PATH = "/news-ticker.html";
const NEWS_LIMIT = 15;
const NEWS_CANDIDATE_LIMIT = 60;
const NEWS_SOURCE_PAGES = 2;
const NEWS_CTA = "смотрите прямую трансляцию на Больше! в ВК, ссылка в описании";
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

const MODE_LABELS = {
  stats: "Статистика",
  chat: "Чат"
};

const TICKER_SPEEDS = {
  slow: { label: "Медленно", pixelsPerSecond: 26 },
  normal: { label: "Средне", pixelsPerSecond: 36 },
  fast: { label: "Быстрее", pixelsPerSecond: 52 }
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/overlay.html") return html(OVERLAY_HTML);
    if (url.pathname === NEWS_TICKER_PATH || url.pathname === "/ticker.html") return html(NEWS_TICKER_HTML);
    if (url.pathname === "/overlay.css") return text(OVERLAY_CSS, "text/css; charset=utf-8");
    if (url.pathname === "/overlay.js") return text(OVERLAY_JS, "text/javascript; charset=utf-8");
    if (url.pathname === "/news-ticker.css") return text(NEWS_TICKER_CSS, "text/css; charset=utf-8");
    if (url.pathname === "/news-ticker.js") return text(NEWS_TICKER_JS, "text/javascript; charset=utf-8");
    if (url.pathname === "/api/health") return json({ ok: true, service: "tennis-listen-bolshe-overlay" });
    if (url.pathname === "/api/news/tennis") {
      try {
        return json(await sportsTennisNews(env), 200, { "cache-control": "public, max-age=120" });
      } catch (error) {
        return json(fallbackNews(error), 200, { "cache-control": "public, max-age=30" });
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
        "/api/health",
        "/api/matches",
        "/api/live-matches",
        "/api/news/tennis",
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
  const manualHome = url.searchParams.get("homeOdd") || url.searchParams.get("home");
  const manualAway = url.searchParams.get("awayOdd") || url.searchParams.get("away");

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
  if (!sourceUrl) {
    return {
      ok: true,
      provider: "winline",
      source: "not-configured",
      updatedAt: new Date().toISOString(),
      odds: { home: null, away: null },
      players: { home, away }
    };
  }

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
  const odds = extractWinlineOdds(payload, home, away);
  return {
    ok: true,
    provider: "winline",
    source: sourceUrl,
    updatedAt: new Date().toISOString(),
    odds,
    players: { home, away }
  };
}

function extractWinlineOdds(payload, home, away) {
  if (typeof payload === "string") {
    const firstTwo = payload.match(/\b\d+[.,]\d+\b/g)?.slice(0, 2) || [];
    return { home: cleanOdd(firstTwo[0]), away: cleanOdd(firstTwo[1]) };
  }

  const direct = payload?.odds || payload?.winline || payload;
  const directHome = direct?.home ?? direct?.homeOdd ?? direct?.p1 ?? direct?.player1 ?? direct?.first;
  const directAway = direct?.away ?? direct?.awayOdd ?? direct?.p2 ?? direct?.player2 ?? direct?.second;
  if (directHome || directAway) return { home: cleanOdd(directHome), away: cleanOdd(directAway) };

  const wantedHome = normalizeName(home);
  const wantedAway = normalizeName(away);
  const stack = [payload];
  while (stack.length) {
    const item = stack.pop();
    if (!item || typeof item !== "object") continue;
    if (Array.isArray(item)) {
      stack.push(...item);
      continue;
    }

    const text = normalizeName([item.home, item.away, item.player1, item.player2, item.name, item.title, item.eventName].filter(Boolean).join(" "));
    if (text && (!wantedHome || text.includes(wantedHome.split(" ").at(-1))) && (!wantedAway || text.includes(wantedAway.split(" ").at(-1)))) {
      const homeOdd = item.homeOdd ?? item.homeOdds ?? item.odd1 ?? item.p1 ?? item.win1 ?? item.k1;
      const awayOdd = item.awayOdd ?? item.awayOdds ?? item.odd2 ?? item.p2 ?? item.win2 ?? item.k2;
      if (homeOdd || awayOdd) return { home: cleanOdd(homeOdd), away: cleanOdd(awayOdd) };
    }
    stack.push(...Object.values(item).filter((value) => value && typeof value === "object"));
  }

  return { home: null, away: null };
}

function cleanOdd(value) {
  const textValue = String(value ?? "").replace(",", ".").trim();
  if (!/^\d+(\.\d+)?$/.test(textValue)) return null;
  return Number(textValue).toFixed(2);
}

function normalizeName(value) {
  return String(value || "").toLowerCase().replace(/[^a-zа-яё0-9]+/gi, " ").trim();
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

    const command = textValue.split(/\s+/, 1)[0].replace(/@listen_bolshe_bot$/i, "").toLowerCase();
    if (command === "/start" || command === "start" || command === "/overlay" || command === "overlay") {
      const menu = await liveMenu(env);
      await telegramApi(env, "sendMessage", {
        chat_id: chatId,
        text: menu.text,
        reply_markup: menu.reply_markup,
        disable_web_page_preview: true
      });
      return;
    }

    await telegramApi(env, "sendMessage", {
      chat_id: chatId,
      text: "Команды:\n/start - открыть live-меню\n/overlay - выбрать матч и получить URL для OBS, Streamlabs или vMix"
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
    await telegramApi(env, "editMessageText", {
      chat_id: chatId,
      message_id: messageId,
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
      await answerCallback(env, callbackId, "Матч не найден или уже пропал из списка", true);
      return;
    }
    await telegramApi(env, "editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: `🎾 Матч выбран\n\n${matchTitle(match)}\n\nВыбери программу:`,
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
      await answerCallback(env, callbackId, "Матч не найден или уже пропал из списка", true);
      return;
    }
    if (!PROGRAM_LABELS[program]) {
      await answerCallback(env, callbackId, "Программа не найдена", true);
      return;
    }
    await telegramApi(env, "editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: `🎾 ${matchTitle(match)}\n\nПрограмма: ${PROGRAM_LABELS[program]}\nВыбери режим оверлея:`,
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
      await answerCallback(env, callbackId, "Матч не найден или уже пропал из списка", true);
      return;
    }
    if (!PROGRAM_LABELS[program]) {
      await answerCallback(env, callbackId, "Программа не найдена", true);
      return;
    }
    if (!MODE_LABELS[mode]) {
      await answerCallback(env, callbackId, "Режим не найден", true);
      return;
    }
    await telegramApi(env, "editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: `🎾 ${matchTitle(match)}\n\nПрограмма: ${PROGRAM_LABELS[program]}\nРежим: ${MODE_LABELS[mode]}\n\nВыбери скорость нижней бегущей строки:`,
      reply_markup: speedMenu(match, program, mode),
      disable_web_page_preview: true
    });
    await answerCallback(env, callbackId);
    return;
  }

  if (data.startsWith("s|")) {
    const [, matchId, program, mode, speed] = data.split("|");
    const match = await findMatch(env, matchId);
    if (!match) {
      await answerCallback(env, callbackId, "Матч не найден или уже пропал из списка", true);
      return;
    }
    if (!PROGRAM_LABELS[program]) {
      await answerCallback(env, callbackId, "Программа не найдена", true);
      return;
    }
    if (!MODE_LABELS[mode]) {
      await answerCallback(env, callbackId, "Режим не найден", true);
      return;
    }
    if (!TICKER_SPEEDS[speed]) {
      await answerCallback(env, callbackId, "Скорость не найдена", true);
      return;
    }
    await telegramApi(env, "editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: overlayInstructions(origin, match, program, mode, speed),
      reply_markup: readyMenu(match, program, mode, speed),
      disable_web_page_preview: true
    });
    await answerCallback(env, callbackId, "Готово");
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
  if (!response.ok) {
    console.log(`telegram ${method} failed`, await response.text());
  }
}

function answerCallback(env, callbackQueryId, textValue = "", showAlert = false) {
  return telegramApi(env, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text: textValue || undefined,
    show_alert: showAlert
  });
}

async function liveMenu(env) {
  try {
    const items = await liveMatches(env);
    const rows = items.slice(0, 45).map((match) => [button(matchButtonLabel(match), `m|${match.id}`)]);
    rows.push([button("Обновить список", "live")]);
    if (!items.length) {
      return {
        text: "🎾 Live оверлей\nСейчас live-матчи не найдены. Нажми «Обновить список» через минуту.",
        reply_markup: keyboard(rows)
      };
    }
    return {
      text: "🎾 Live оверлей\nВыбери матч для трансляции:",
      reply_markup: keyboard(rows)
    };
  } catch (error) {
    return {
      text: `🎾 Live оверлей\nНе удалось получить live-матчи: ${error?.message || error}`,
      reply_markup: keyboard([[button("Обновить список", "live")]])
    };
  }
}

function programMenu(match) {
  return keyboard([
    [button("OBS", `p|${match.id}|obs`), button("Streamlabs", `p|${match.id}|streamlabs`)],
    [button("vMix", `p|${match.id}|vmix`)],
    [button("К live матчам", "live")]
  ]);
}

function modeMenu(match, program) {
  return keyboard([
    [button("Статистика", `r|${match.id}|${program}|stats`), button("Чат", `r|${match.id}|${program}|chat`)],
    [button("Другая программа", `m|${match.id}`)],
    [button("К live матчам", "live")]
  ]);
}

function speedMenu(match, program, mode) {
  return keyboard([
    [
      button("Медленно", `s|${match.id}|${program}|${mode}|slow`),
      button("Средне", `s|${match.id}|${program}|${mode}|normal`),
      button("Быстрее", `s|${match.id}|${program}|${mode}|fast`)
    ],
    [button("Другой режим", `p|${match.id}|${program}`)],
    [button("Другая программа", `m|${match.id}`)],
    [button("К live матчам", "live")]
  ]);
}

function readyMenu(match, program, mode, speed) {
  return keyboard([
    [button("Статистика", `r|${match.id}|${program}|stats`), button("Чат", `r|${match.id}|${program}|chat`)],
    [
      button("Медленно", `s|${match.id}|${program}|${mode}|slow`),
      button("Средне", `s|${match.id}|${program}|${mode}|normal`),
      button("Быстрее", `s|${match.id}|${program}|${mode}|fast`)
    ],
    [button("Другая программа", `m|${match.id}`)],
    [button("К live матчам", "live")]
  ]);
}

function keyboard(rows) {
  return { inline_keyboard: rows };
}

function button(textValue, callbackData) {
  return { text: textValue, callback_data: callbackData };
}

async function liveMatches(env) {
  return (await flashscoreEvents(env))
    .filter((match) => match.status === "live" && isSupportedMatch(match))
    .sort((a, b) => `${a.tournament} ${a.home.shortName}`.localeCompare(`${b.tournament} ${b.home.shortName}`));
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
  return truncate([stageLabel(match), match.score, `${match.home.shortName} - ${match.away.shortName}`].filter(Boolean).join(" | "), 58);
}

function matchTitle(match) {
  return [match.tournament, `${match.home.name} - ${match.away.name}`, [stageLabel(match), match.score].filter(Boolean).join(" | ")].filter(Boolean).join("\n");
}

function stageLabel(match) {
  if (match.status === "live") return STAGES[match.stageCode] || "Live";
  if (match.status === "finished") return "Finished";
  return "Scheduled";
}

function overlayInstructions(origin, match, program, mode, speed) {
  const programKey = PROGRAM_LABELS[program] ? program : "obs";
  const modeKey = MODE_LABELS[mode] ? mode : "stats";
  const speedKey = TICKER_SPEEDS[speed] ? speed : "slow";
  const url = overlayPageUrl(origin, match, modeKey, speedKey);
  return [
    "🎾 Оверлей готов",
    "",
    `Матч:\n${matchTitle(match)}`,
    "",
    `Программа: ${PROGRAM_LABELS[programKey]}`,
    `Режим: ${MODE_LABELS[modeKey]}`,
    `Скорость строки: ${TICKER_SPEEDS[speedKey].label}`,
    "",
    "URL:",
    url,
    "",
    "Что делать дальше:",
    ...programSteps(programKey),
    "",
    "Оверлей сам обновляет данные. Если переключаешь матч, просто замени URL в источнике."
  ].join("\n");
}

function overlayPageUrl(origin, match, mode, speed = "slow") {
  const sourceQuery = new URLSearchParams({ url: match.url }).toString();
  const source = encodeURIComponent(`/api/match/flashscore?${sourceQuery}`);
  const newsSource = encodeURIComponent("/api/news/tennis");
  const oddsQuery = new URLSearchParams({ home: match.home?.name || "", away: match.away?.name || "" }).toString();
  const oddsSource = encodeURIComponent(`/api/odds/winline?${oddsQuery}`);
  const tickerSpeed = TICKER_SPEEDS[speed] ? speed : "slow";
  return `${origin}/overlay.html?source=${source}&news=${newsSource}&odds=${oddsSource}&panel=${mode}&ticker=${tickerSpeed}&poll=3000`;
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
  const matchUrl = url.searchParams.get("url") || (eventId === DEFAULT_MATCH_ID ? DEFAULT_MATCH_URL : `${base}/match/tennis/live-match/?mid=${eventId}`);
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
  return {
    label: value(row, "AC"),
    homeGames: value(row, "IG"),
    awayGames: value(row, "IH"),
    duration: value(row, "RC", records.find((record) => record.RB)?.RB || "")
  };
}

function buildSetScores(history, summary, common) {
  const setsByLabel = new Map();
  for (const game of history.games || []) {
    const label = game.set || "Set 1";
    setsByLabel.set(label, {
      label,
      number: setNumber(label, setsByLabel.size + 1),
      homeGames: game.homeGames,
      awayGames: game.awayGames,
      winner: game.winner || ""
    });
  }

  const currentLabel = summary.label || [...setsByLabel.keys()].at(-1) || "Set 1";
  const currentNumber = setNumber(currentLabel, setsByLabel.size || 1);
  const current = {
    label: currentLabel,
    number: currentNumber,
    homeGames: value(common, "DN", summary.homeGames),
    awayGames: value(common, "DO", summary.awayGames),
    winner: ""
  };

  if (current.homeGames !== "" || current.awayGames !== "") {
    setsByLabel.set(currentLabel, { ...(setsByLabel.get(currentLabel) || {}), ...current });
  }

  return [...setsByLabel.values()]
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

const OVERLAY_HTML = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tennis Overlay</title>
<link rel="stylesheet" href="/overlay.css">
</head>
<body>
<main id="overlay" class="overlay">
  <section class="left-panel" aria-label="Статистика матча">
    <div class="promo-art">
      <div class="promo-title-main">ВСЕ ДОРОГИ ВЕДУТ В ПАРИЖ</div>
      <div class="promo-pill">РОЛАН ГАРРОС-2026 НА <b>БОЛЬШЕ!</b></div>
    </div>
    <div class="stats-title">СТАТИСТИКА МАТЧА</div>
    <div class="stats-head">
      <div id="statHomeCode" class="team-code">---</div>
      <div id="statAwayCode" class="team-code">---</div>
    </div>
    <div id="statsGrid" class="stats-grid"></div>
    <div id="statTime" class="stats-time">ВРЕМЯ МАТЧА --:--</div>
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
    <div id="scoreTournament" class="score-tournament">РОЛАН ГАРРОС | МУЖЧИНЫ ПЕРВЫЙ КРУГ</div>
    <div id="scoreClock" class="score-clock">СКОРО</div>

    <div id="scoreHome" class="score-row home">
      <div id="homeCountry" class="country-code">---</div>
      <div class="serve-slot"><span class="tennis-ball"></span></div>
      <img id="homePhoto" class="player-photo" alt="">
      <div id="homeScoreName" class="score-name">ИГРОК 1</div>
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
      <div id="awaySet1" class="set-cell"></div>
      <div id="awaySet2" class="set-cell"></div>
      <div id="awaySet3" class="set-cell"></div>
      <div id="awaySet4" class="set-cell"></div>
      <div id="awaySet5" class="set-cell"></div>
    </div>
  </section>

  <section class="ticker" aria-label="Новости">
    <div class="ticker-logo" aria-hidden="true"><span></span></div>
    <div class="ticker-mask"><div id="tickerTrack" class="ticker-track">Загружаем новости...</div></div>
  </section>
</main>
<script src="/overlay.js"></script>
</body>
</html>`;

const OVERLAY_CSS = `@import url("https://fonts.googleapis.com/css2?family=Sofia+Sans:ital,wght@0,400..900;1,400..900&family=Sofia+Sans+Condensed:ital,wght@0,400..900;1,400..900&display=swap");:root{--purple:#4b2b86;--lime:#dfff24;--green:#205900;--black:#111117;--line:#a9a9a9;--white:#fff;--blue:#006bff;--scale:1}*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden;background:transparent;font-family:"Sofia Sans",Arial,sans-serif;color:#111}.overlay{position:relative;width:1920px;height:1080px;overflow:hidden;background:transparent;transform-origin:top left}.left-panel{position:absolute;left:0;top:0;width:540px;height:978px;background:#fff;overflow:hidden}.promo-art{position:absolute;left:0;top:0;width:540px;height:226px;overflow:hidden;background:linear-gradient(180deg,rgba(38,13,10,.1),rgba(38,13,10,.34)),radial-gradient(circle at 52% 62%,#f2d08d 0 8%,#be6b38 20%,#4a211d 56%,#121018 100%)}.promo-art:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.42),transparent 26%,transparent 74%,rgba(0,0,0,.42)),repeating-linear-gradient(90deg,rgba(255,255,255,.14) 0 2px,transparent 2px 46px);mix-blend-mode:screen;opacity:.7}.promo-title-main{position:absolute;left:78px;top:0;width:390px;text-align:center;color:#fff;font-family:"Sofia Sans Condensed",Arial,sans-serif;font-size:40px;line-height:1;font-weight:900;font-style:italic;text-shadow:0 2px 4px rgba(0,0,0,.45)}.promo-pill{position:absolute;left:164px;top:82px;padding:3px 9px;border-radius:5px;background:#15151a;color:#fff;font-size:13px;line-height:16px;font-weight:900}.promo-pill b{color:var(--lime);font-style:italic}.stats-title{position:absolute;left:0;top:226px;width:540px;height:67px;background:#fff;color:var(--purple);font-family:"Sofia Sans Condensed",Arial,sans-serif;font-size:51px;line-height:67px;font-weight:900;font-style:italic;text-align:center}.stats-head{position:absolute;left:0;top:293px;width:540px;height:60px;background:var(--purple);display:grid;grid-template-columns:181px 182px 177px;align-items:center}.team-code{color:#fff;font-size:30px;font-weight:900;text-align:center}.team-code:first-child{grid-column:1}.team-code:last-child{grid-column:3}.stats-grid{position:absolute;left:0;top:353px;width:540px;height:420px;display:grid;grid-template-rows:repeat(7,60px);background:#fff}.stat-row-template{display:grid;grid-template-columns:181px 182px 177px;min-height:60px}.stat-cell{height:60px;display:flex;align-items:center;justify-content:center;border-bottom:1px solid var(--line);font-size:26px;font-weight:800;color:var(--purple);text-align:center;white-space:nowrap}.stat-label{height:60px;display:flex;align-items:center;justify-content:center;padding:0 14px;background:var(--purple);color:#fff;border-bottom:0;font-size:17px;line-height:18px;font-weight:900;text-align:center;text-transform:uppercase}.stats-time{position:absolute;left:181px;top:313px;width:182px;height:20px;color:#fff;background:var(--purple);font-size:12px;font-weight:900;text-align:center;line-height:20px;opacity:.95}.odds-panel{position:absolute;left:0;top:778px;width:540px;height:200px;background:var(--black);border-top:1px solid #24242c}.odds-title{position:absolute;left:62px;top:20px;color:#fff;font-family:"Sofia Sans Condensed",Arial,sans-serif;font-size:38px;line-height:40px;font-weight:900;font-style:italic}.odds-values{position:absolute;left:56px;right:54px;top:91px;display:flex;justify-content:space-between}.odds-box{width:146px;height:66px;display:flex;align-items:center;justify-content:center;transform:skew(-10deg);background:var(--blue);color:#fff;font-size:34px;font-weight:900;line-height:1}.odds-box::first-letter{transform:skew(10deg)}.video-zone{position:absolute;left:546px;top:0;width:1374px;height:773px;background:var(--green)}.score-strip{position:absolute;left:546px;top:773px;width:1374px;height:205px;background:#fff;overflow:hidden}.score-tournament{position:absolute;left:222px;top:21px;width:700px;height:36px;color:#111;font-size:31px;line-height:36px;font-weight:500;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.score-clock{position:absolute;right:165px;top:19px;width:180px;height:36px;text-align:center;color:#111;font-size:31px;line-height:36px;font-weight:500;white-space:nowrap}.score-row{position:absolute;left:68px;width:1220px;height:60px;display:grid;grid-template-columns:72px 36px 61px 1fr repeat(5,54px);column-gap:12px;align-items:center}.score-row.home{top:71px}.score-row.away{top:134px}.country-code{font-size:31px;font-weight:500;text-align:left;line-height:44px}.serve-slot{width:36px;height:48px;display:flex;align-items:center;justify-content:center}.tennis-ball{width:22px;height:22px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff67a 0 12%,#dfff24 34%,#a5c90b 100%);box-shadow:0 0 12px rgba(212,255,31,.8);opacity:0;position:relative}.tennis-ball:before,.tennis-ball:after{content:"";position:absolute;top:2px;bottom:2px;width:12px;border:2px solid rgba(255,255,255,.9);border-left:0;border-radius:50%;opacity:.9}.tennis-ball:before{left:2px;transform:rotate(24deg)}.tennis-ball:after{right:2px;transform:rotate(204deg)}.score-row.serving .tennis-ball{opacity:1}.player-photo{width:58px;height:58px;border-radius:50%;object-fit:cover;background:var(--lime);border:4px solid var(--lime)}.score-name{min-width:0;color:#000;font-family:"Sofia Sans Condensed",Arial,sans-serif;font-size:43px;line-height:54px;font-weight:900;font-style:italic;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.set-cell{width:54px;height:48px;display:flex;align-items:center;justify-content:center;color:#111;font-size:34px;font-weight:600;line-height:1}.set-cell.tie-break{width:42px;height:42px;justify-self:center;background:var(--purple);color:#fff;border-radius:2px;font-weight:900}.ticker{position:absolute;left:0;right:0;bottom:0;height:102px;overflow:hidden;background:linear-gradient(112deg,#6b3fad 0%,#513397 34%,#caff22 42%,#6440a4 49%,#43176f 100%)}.ticker:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(17deg,rgba(255,255,255,.16) 0 1px,transparent 1px 4px);opacity:.45}.ticker-logo{position:absolute;left:31px;top:22px;width:64px;height:64px;border-radius:50%;background:#fff;z-index:3}.ticker-logo span{position:absolute;left:16px;top:11px;width:31px;height:42px;border-radius:4px;overflow:hidden}.ticker-logo span:before{content:"";position:absolute;left:-12px;top:3px;width:38px;height:38px;border:9px solid var(--purple);border-left:0;border-bottom:0;transform:rotate(45deg)}.ticker-mask{position:absolute;left:112px;right:0;top:0;height:102px;overflow:hidden;z-index:2}.ticker-track{position:absolute;left:0;top:0;height:102px;display:inline-flex;align-items:center;white-space:nowrap;color:#fff;font-family:"Sofia Sans Condensed",Arial,sans-serif;font-size:42px;line-height:102px;font-weight:900;font-style:italic;text-transform:uppercase;text-shadow:0 2px 2px rgba(0,0,0,.18);will-change:transform;animation:none}.guides .left-panel,.guides .video-zone,.guides .score-strip,.guides .ticker{outline:2px solid rgba(202,255,61,.8)}@keyframes ticker{from{transform:translateX(var(--ticker-start,1808px))}to{transform:translateX(-100%)}}`;

const OVERLAY_JS = `
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
`;

const NEWS_TICKER_HTML = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Больше! tennis news ticker</title>
<link rel="stylesheet" href="/news-ticker.css">
</head>
<body>
<main class="news-ticker-overlay" aria-label="Бегущая строка новостей">
  <section class="ticker" aria-label="Новости">
    <div class="ticker-logo" aria-hidden="true"><span></span></div>
    <div class="ticker-mask"><div id="tickerTrack" class="ticker-track">Загружаем новости...</div></div>
  </section>
</main>
<script src="/news-ticker.js"></script>
</body>
</html>`;

const NEWS_TICKER_CSS = `@import url("https://fonts.googleapis.com/css2?family=Sofia+Sans:ital,wght@0,400..900;1,400..900&display=swap");:root{--purple:#4b2b86;--lime:#dfff24;--ticker-height:102px}*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden;background:transparent;font-family:"Sofia Sans",Arial,sans-serif}.news-ticker-overlay{position:relative;width:1920px;height:var(--ticker-height);overflow:hidden;transform-origin:top left;background:transparent}.ticker{position:absolute;inset:0;overflow:hidden;background:linear-gradient(112deg,#6b3fad 0%,#513397 34%,#caff22 42%,#6440a4 49%,#43176f 100%)}.ticker:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(17deg,rgba(255,255,255,.16) 0 1px,transparent 1px 4px);opacity:.45}.ticker-logo{position:absolute;left:31px;top:19px;z-index:3;width:64px;height:64px;border-radius:50%;background:#fff}.ticker-logo span{position:absolute;left:16px;top:11px;width:31px;height:42px;overflow:hidden;border-radius:4px}.ticker-logo span:before{content:"";position:absolute;left:-12px;top:3px;width:38px;height:38px;border:9px solid var(--purple);border-left:0;border-bottom:0;transform:rotate(45deg)}.ticker-mask{position:absolute;left:112px;right:0;top:0;z-index:2;height:var(--ticker-height);overflow:hidden}.ticker-track{position:absolute;left:0;top:0;display:inline-flex;align-items:center;height:var(--ticker-height);color:#fff;font-family:"Sofia Sans",Arial,sans-serif;font-size:42px;font-style:italic;font-weight:900;line-height:var(--ticker-height);text-shadow:0 2px 2px rgba(0,0,0,.18);text-transform:uppercase;white-space:nowrap;will-change:transform;animation:none}@keyframes ticker-scroll{from{transform:translateX(var(--ticker-start,1808px))}to{transform:translateX(-100%)}}`;

const NEWS_TICKER_JS = `
const params = new URLSearchParams(window.location.search);
const DEFAULT_CTA = ${JSON.stringify(NEWS_CTA)};
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
`;
