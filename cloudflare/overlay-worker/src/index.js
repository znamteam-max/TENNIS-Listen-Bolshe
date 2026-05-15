const PROJECT_ID = "2";
const FEED_SIGN = "SW9D1eZo";
const DEFAULT_BASE = "https://www.flashscore.com";
const DEFAULT_LANG = "ru";
const SPORTS_TENNIS_NEWS_URL = "https://www.sports.ru/tennis/news/top/";
const DEFAULT_MATCH_ID = "Sril3X2m";
const DEFAULT_MATCH_URL =
  "https://www.flashscore.com/match/tennis/jasika-omar-lOWZLw6o/stewart-hamish-0j2A0w2n/?mid=Sril3X2m";
const TELEGRAM_WEBHOOK_PATH = "/telegram/webhook";

const PROGRAM_LABELS = {
  obs: "OBS",
  streamlabs: "Streamlabs",
  vmix: "vMix"
};

const MODE_LABELS = {
  stats: "Статистика",
  chat: "Чат"
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
    if (url.pathname === "/overlay.css") return text(OVERLAY_CSS, "text/css; charset=utf-8");
    if (url.pathname === "/overlay.js") return text(OVERLAY_JS, "text/javascript; charset=utf-8");
    if (url.pathname === "/api/health") return json({ ok: true, service: "tennis-listen-bolshe-overlay" });
    if (url.pathname === "/api/news/tennis") {
      try {
        return json(await sportsTennisNews(env), 200, { "cache-control": "public, max-age=120" });
      } catch (error) {
        return json(fallbackNews(error), 200, { "cache-control": "public, max-age=30" });
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
        "/api/health",
        "/api/matches",
        "/api/live-matches",
        "/api/news/tennis",
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

async function sportsTennisNews(env) {
  const sourceUrl = String(env.SPORTS_TENNIS_NEWS_URL || SPORTS_TENNIS_NEWS_URL).trim();
  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 Tennis Overlay News Bot",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.5,en;q=0.4"
    },
    cf: { cacheTtl: 120, cacheEverything: false }
  });
  if (!response.ok) throw new Error(`Sports.ru ${response.status}`);
  const htmlValue = await response.text();
  const items = parseSportsTennisNews(htmlValue, sourceUrl, 15);
  if (!items.length) throw new Error("Sports.ru news parser returned no items");
  return {
    ok: true,
    source: "sports.ru",
    sourceUrl,
    generatedAt: new Date().toISOString(),
    items
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
      time
    });
  }
  return items;
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
    await telegramApi(env, "editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: overlayInstructions(origin, match, program, mode),
      reply_markup: readyMenu(match, program),
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

function readyMenu(match, program) {
  return keyboard([
    [button("Статистика", `r|${match.id}|${program}|stats`), button("Чат", `r|${match.id}|${program}|chat`)],
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

function overlayInstructions(origin, match, program, mode) {
  const programKey = PROGRAM_LABELS[program] ? program : "obs";
  const modeKey = MODE_LABELS[mode] ? mode : "stats";
  const url = overlayPageUrl(origin, match, modeKey);
  return [
    "🎾 Оверлей готов",
    "",
    `Матч:\n${matchTitle(match)}`,
    "",
    `Программа: ${PROGRAM_LABELS[programKey]}`,
    `Режим: ${MODE_LABELS[modeKey]}`,
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

function overlayPageUrl(origin, match, mode) {
  const sourceQuery = new URLSearchParams({ url: match.url }).toString();
  const source = encodeURIComponent(`/api/match/flashscore?${sourceQuery}`);
  const newsSource = encodeURIComponent("/api/news/tennis");
  return `${origin}/overlay.html?source=${source}&news=${newsSource}&panel=${mode}&poll=3000`;
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
  const serving = history.currentGame?.server || "";
  const stages = { ...STAGES, ...(safeJson(extractObject(page, '"eventStageTranslations":')) || {}) };
  const title = meta(page, "og:title") || players.map((player) => player.name).join(" - ");

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
      stage: stages[value(common, "DB")] || summary.label || "Live",
      duration: summary.duration,
      startedAtUnix: value(common, "DC"),
      updatedAtUnix: value(common, "DD")
    },
    players: players.map((player) => ({ ...player, isServing: player.side === serving })),
    score: {
      current: { home: value(common, "DP"), away: value(common, "DQ") },
      games: { home: value(common, "DN", summary.homeGames), away: value(common, "DO", summary.awayGames) },
      sets: [{ label: summary.label || "Current set", homeGames: value(common, "DN", summary.homeGames), awayGames: value(common, "DO", summary.awayGames), winner: "" }]
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
  <aside class="left-rail">
    <section class="promo-block">
      <div class="promo-kicker">LIVE TENNIS</div>
      <div id="matchTitle" class="promo-title">Loading match</div>
      <div id="matchStage" class="promo-meta">Connecting data</div>
    </section>
    <section id="statsPanel" class="stats-panel">
      <div class="panel-head"><span>Статистика</span><span id="statUpdated">--:--</span></div>
      <div id="statsList" class="stats-list"></div>
    </section>
    <section id="chatPanel" class="chat-panel" hidden>
      <div class="panel-head"><span>Чат</span><span>LIVE</span></div>
      <div class="chat-line">Комментатор подключен.</div>
      <div class="chat-line">Оверлей готов к эфиру.</div>
      <div class="chat-line muted">Здесь можно вывести чат трансляции.</div>
    </section>
    <section class="brand-block"><span>БОЛЬШЕ!</span><small>TENNIS STREAM</small></section>
  </aside>
  <section class="video-zone"><div class="safe-label">VIDEO / COMMENTATOR AREA</div></section>
  <section class="scorebug">
    <div id="tournament" class="scorebug-tournament">Tournament</div>
    <div id="playerHome" class="player-row"><span class="serve-dot"></span><span class="player-name">Home</span><span id="homeGames" class="score-cell">0</span><span id="homePoint" class="point-cell">0</span></div>
    <div id="playerAway" class="player-row"><span class="serve-dot"></span><span class="player-name">Away</span><span id="awayGames" class="score-cell">0</span><span id="awayPoint" class="point-cell">0</span></div>
  </section>
  <section class="ticker"><div id="tickerTrack" class="ticker-track">Loading news...</div></section>
</main>
<script src="/overlay.js"></script>
</body>
</html>`;

const OVERLAY_CSS = `:root{--green:#caff3d;--cyan:#18d8c8;--panel:rgba(17,20,25,.88);--line:rgba(255,255,255,.16);--text:#f7f9fc;--muted:#aab3bf}*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden;background:transparent;color:var(--text);font-family:Arial,Helvetica,sans-serif}.overlay{position:relative;width:100vw;height:100vh;min-width:1280px;min-height:720px}.left-rail{position:absolute;left:34px;top:34px;bottom:78px;width:360px;display:grid;grid-template-rows:164px minmax(0,1fr) 128px;gap:18px;min-height:0}.promo-block,.stats-panel,.chat-panel,.brand-block,.scorebug{border:1px solid var(--line);border-radius:8px;background:var(--panel);box-shadow:0 20px 50px rgba(0,0,0,.28);backdrop-filter:blur(8px)}.stats-panel,.chat-panel{min-height:0;overflow:hidden}.promo-block{padding:22px;border-left:6px solid var(--green)}.promo-kicker{color:var(--green);font-size:15px;font-weight:800}.promo-title{margin-top:18px;font-size:28px;line-height:1.05;font-weight:800}.promo-meta{margin-top:10px;color:var(--muted);font-size:15px}.panel-head{display:flex;justify-content:space-between;align-items:center;min-height:44px;padding:0 16px;border-bottom:1px solid var(--line);color:var(--green);font-weight:800;font-size:14px}.stats-list{height:calc(100% - 44px);overflow:hidden;padding:12px 14px}.stat-section{margin-bottom:13px}.stat-section-title{margin-bottom:7px;color:var(--cyan);font-size:13px;font-weight:800}.stat-row{display:grid;grid-template-columns:58px 1fr 58px;align-items:center;min-height:25px;gap:8px;color:var(--text);font-size:13px}.stat-row span:nth-child(2){color:var(--muted);text-align:center}.stat-row span:last-child{text-align:right}.chat-line{margin:14px 16px 0;padding:10px 12px;border-radius:8px;background:rgba(255,255,255,.08);font-size:15px}.chat-line.muted{color:var(--muted)}.brand-block{display:grid;align-content:center;justify-items:start;padding:0 26px;background:linear-gradient(90deg,rgba(255,77,109,.92),rgba(202,255,61,.88));color:#101114}.brand-block span{font-size:40px;font-weight:900}.brand-block small{margin-top:4px;font-weight:800}.video-zone{position:absolute;left:430px;right:34px;top:34px;bottom:78px;border:1px dashed transparent}.safe-label{position:absolute;top:0;right:0;opacity:0;color:rgba(255,255,255,.5);font-size:13px}.scorebug{position:absolute;right:44px;bottom:106px;width:462px;padding:12px}.scorebug-tournament{min-height:24px;margin-bottom:8px;color:var(--green);font-size:13px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.player-row{display:grid;grid-template-columns:18px minmax(0,1fr) 54px 66px;align-items:center;min-height:42px;gap:10px;border-top:1px solid var(--line);font-size:18px;font-weight:800}.serve-dot{width:10px;height:10px;border-radius:50%;background:transparent}.player-row.serving .serve-dot{background:var(--green);box-shadow:0 0 18px var(--green)}.player-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.score-cell,.point-cell{min-height:30px;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;background:rgba(255,255,255,.1)}.point-cell{background:var(--green);color:#101114}.ticker{position:absolute;left:0;right:0;bottom:0;height:52px;overflow:hidden;background:#050608;border-top:3px solid var(--green)}.ticker-track{display:inline-flex;align-items:center;height:52px;min-width:100%;padding-left:100%;white-space:nowrap;color:var(--text);font-size:23px;font-weight:800;animation:ticker 38s linear infinite}@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-100%)}}.guides .left-rail,.guides .video-zone,.guides .scorebug,.guides .ticker{outline:2px solid rgba(202,255,61,.75)}.guides .safe-label{opacity:1}`;

const OVERLAY_JS = `const params=new URLSearchParams(window.location.search);const config={source:params.get("source")||"/api/match/flashscore?id=${DEFAULT_MATCH_ID}",news:params.get("news")||"/api/news/tennis",panel:params.get("panel")||"stats",poll:Number(params.get("poll")||3000),guides:params.get("guides")==="1"};const refs={overlay:document.querySelector("#overlay"),matchTitle:document.querySelector("#matchTitle"),matchStage:document.querySelector("#matchStage"),tournament:document.querySelector("#tournament"),statsPanel:document.querySelector("#statsPanel"),chatPanel:document.querySelector("#chatPanel"),statsList:document.querySelector("#statsList"),statUpdated:document.querySelector("#statUpdated"),playerHome:document.querySelector("#playerHome"),playerAway:document.querySelector("#playerAway"),homeName:document.querySelector("#playerHome .player-name"),awayName:document.querySelector("#playerAway .player-name"),homeGames:document.querySelector("#homeGames"),awayGames:document.querySelector("#awayGames"),homePoint:document.querySelector("#homePoint"),awayPoint:document.querySelector("#awayPoint"),tickerTrack:document.querySelector("#tickerTrack")};function asText(value,fallback=""){return value===null||value===undefined||value===""?fallback:String(value)}function setPanelMode(){refs.statsPanel.hidden=config.panel==="chat";refs.chatPanel.hidden=config.panel!=="chat"}function setGuides(){refs.overlay.classList.toggle("guides",config.guides)}async function fetchJson(url){const response=await fetch(url,{cache:"no-store"});if(!response.ok)throw new Error(response.status+" "+response.statusText);return response.json()}function statRows(sections){const wanted=["Service","Return","Points","Games"];return sections.filter(section=>wanted.includes(section.section)).slice(0,4).map(section=>{const rows=section.rows.slice(0,section.section==="Points"?4:3).map(row=>'<div class="stat-row"><span>'+asText(row.home,"-")+'</span><span>'+row.label+'</span><span>'+asText(row.away,"-")+"</span></div>").join("");return '<div class="stat-section"><div class="stat-section-title">'+section.section+"</div>"+rows+"</div>"}).join("")}function renderMatch(data){const home=data.players?.find(player=>player.side==="home")||data.players?.[0]||{};const away=data.players?.find(player=>player.side==="away")||data.players?.[1]||{};refs.matchTitle.textContent=data.match?.title||asText(home.name,"Home")+" - "+asText(away.name,"Away");refs.matchStage.textContent=[data.match?.stage,data.match?.duration].filter(Boolean).join(" · ");refs.tournament.textContent=data.match?.tournament||data.match?.stage||"Live tennis";refs.homeName.textContent=asText(home.shortName||home.name,"Home");refs.awayName.textContent=asText(away.shortName||away.name,"Away");refs.homeGames.textContent=asText(data.score?.games?.home,"0");refs.awayGames.textContent=asText(data.score?.games?.away,"0");refs.homePoint.textContent=asText(data.score?.current?.home,"");refs.awayPoint.textContent=asText(data.score?.current?.away,"");refs.playerHome.classList.toggle("serving",Boolean(home.isServing));refs.playerAway.classList.toggle("serving",Boolean(away.isServing));refs.statsList.innerHTML=statRows(data.statistics||[])||'<div class="chat-line muted">Статистика пока недоступна.</div>';refs.statUpdated.textContent=new Date(data.generatedAt||Date.now()).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}function renderNews(items){const list=Array.isArray(items)?items:items.items||[];refs.tickerTrack.textContent=list.map(item=>item.title||item).filter(Boolean).join("   •   ")}async function refreshMatch(){try{renderMatch(await fetchJson(config.source))}catch(error){refs.matchStage.textContent="Ошибка данных: "+error.message}}async function refreshNews(){try{renderNews(await fetchJson(config.news))}catch(_error){refs.tickerTrack.textContent="Новости временно недоступны"}}setPanelMode();setGuides();refreshMatch();refreshNews();setInterval(refreshMatch,Math.max(config.poll,1000));setInterval(refreshNews,60000);`;
