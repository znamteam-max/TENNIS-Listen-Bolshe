import { execFile } from "node:child_process";
import { promisify } from "node:util";

const PROJECT_ID = "2";
const FEED_SIGN = "SW9D1eZo";
const DEFAULT_HOST = "https://www.flashscore.com";
const DEFAULT_MATCH_URL =
  "https://www.flashscore.com/match/tennis/jasika-omar-lOWZLw6o/stewart-hamish-0j2A0w2n/?mid=Sril3X2m";

const stageFallback = {
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

const execFileAsync = promisify(execFile);

const psQuote = (value) => `'${String(value).replace(/'/g, "''")}'`;

const fetchTextWithPowerShell = async (url, referer) => {
  const script = `
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$headers = @{
  'User-Agent' = 'Mozilla/5.0 Tennis Overlay Adapter'
  'Accept' = '*/*'
  'Accept-Language' = 'en-US,en;q=0.9'
  'Referer' = ${psQuote(referer)}
  'x-fsign' = '${FEED_SIGN}'
}
$response = Invoke-WebRequest -Uri ${psQuote(url)} -UseBasicParsing -Headers $headers -TimeoutSec 25
$response.Content
`;

  const encoded = Buffer.from(script, "utf16le").toString("base64");
  const { stdout } = await execFileAsync("powershell", ["-NoProfile", "-EncodedCommand", encoded], {
    maxBuffer: 1024 * 1024 * 8,
    windowsHide: true
  });
  return stdout;
};

const splitRecord = (record) => {
  const fields = {};
  for (const token of record.split("¬")) {
    if (!token.includes("÷")) continue;
    const index = token.indexOf("÷");
    fields[token.slice(0, index)] = token.slice(index + 1);
  }
  return fields;
};

const parseFeed = (text) =>
  text
    .split("¬~")
    .map((record) => record.replace(/~$/g, "").trim())
    .filter(Boolean)
    .map(splitRecord);

const value = (record, key, fallback = "") => record?.[key] ?? fallback;

const fetchText = async (url, referer) => {
  if (process.platform === "win32" && url.includes("flashscore.com")) {
    return fetchTextWithPowerShell(url, referer);
  }

  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: {
      "user-agent": "Mozilla/5.0 Tennis Overlay Adapter",
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9",
      referer,
      "x-fsign": FEED_SIGN
    }
  });

  if (!response.ok) {
    throw new Error(`Flashscore request failed ${response.status}: ${url}`);
  }

  return response.text();
};

const extractEventId = ({ id, url }) => {
  if (id) return id.trim();
  if (!url) return "Sril3X2m";

  const parsed = new URL(url);
  const mid = parsed.searchParams.get("mid");
  if (mid) return mid;

  const pathMatch = parsed.pathname.match(/-([A-Za-z0-9]{8})(?:\/|$)/);
  if (pathMatch) return pathMatch[1];

  throw new Error("Flashscore event id was not found. Pass ?id=... or a match URL with ?mid=...");
};

const normalizeMatchUrl = (url, eventId) => {
  if (url) return url;
  if (eventId === "Sril3X2m") return DEFAULT_MATCH_URL;
  return `${DEFAULT_HOST}/match/tennis/live-match/?mid=${encodeURIComponent(eventId)}`;
};

const extractBalancedJson = (text, marker) => {
  const markerIndex = text.indexOf(marker);
  if (markerIndex < 0) return null;

  const start = text.indexOf("{", markerIndex + marker.length);
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return text.slice(start, index + 1);
  }

  return null;
};

const safeJson = (jsonText) => {
  if (!jsonText) return null;
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
};

const extractMeta = (html, property) => {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, "i");
  return html.match(pattern)?.[1] || "";
};

const extractPlayers = (html) => {
  const participants =
    safeJson(extractBalancedJson(html, '"participantsData":')) ||
    safeJson(extractBalancedJson(html, '"participants":'));
  const home = participants?.home?.[0] || {};
  const away = participants?.away?.[0] || {};

  return [
    {
      side: "home",
      id: home.id || "",
      name: home.full_name || home.seo_name || home.name || "Home player",
      shortName: home.name || home.short_name || home.full_name || "Home",
      country: home.country || "",
      rank: Array.isArray(home.rank) ? home.rank[1] || "" : "",
      image: home.image_path || ""
    },
    {
      side: "away",
      id: away.id || "",
      name: away.full_name || away.seo_name || away.name || "Away player",
      shortName: away.name || away.short_name || away.full_name || "Away",
      country: away.country || "",
      rank: Array.isArray(away.rank) ? away.rank[1] || "" : "",
      image: away.image_path || ""
    }
  ];
};

const extractStageMap = (html) => {
  const stageMap = safeJson(extractBalancedJson(html, '"eventStageTranslations":'));
  return { ...stageFallback, ...(stageMap || {}) };
};

const parseSummary = (records) => {
  const setRecord = records.find((record) => record.AC && (record.IG || record.IH)) || {};
  return {
    label: value(setRecord, "AC", ""),
    homeGames: value(setRecord, "IG", ""),
    awayGames: value(setRecord, "IH", ""),
    duration: value(setRecord, "RC", records.find((record) => record.RB)?.RB || "")
  };
};

const parseMatchHistory = (records) => {
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
        server: value(record, "HG") === "1" ? "home" : value(record, "HG") === "2" ? "away" : "",
        winner: value(record, "HK") === "1" ? "home" : value(record, "HK") === "2" ? "away" : "",
        breakPoint: value(record, "HH") === "1",
        points: value(record, "HL")
      });
    }
    if (record.HN || record.HO) {
      currentGame = {
        server: value(record, "HN") === "1" ? "home" : value(record, "HN") === "2" ? "away" : "",
        points: value(record, "HO"),
        currentPoint: value(record, "HO").split(",").map((item) => item.trim()).filter(Boolean).at(-1) || ""
      };
    }
  }

  return { games, currentGame };
};

const parseStats = (records) => {
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
      section.rows.push({
        label: record.SG,
        home: value(record, "SH"),
        away: value(record, "SI")
      });
    }
  }

  return sections;
};

const deriveSets = (summary, common) => {
  const homeGames = value(common, "DN", summary.homeGames);
  const awayGames = value(common, "DO", summary.awayGames);

  if (!summary.label && !homeGames && !awayGames) return [];

  return [
    {
      label: summary.label || "Current set",
      homeGames,
      awayGames,
      winner: ""
    }
  ];
};

export const getFlashscoreMatch = async ({ id, url } = {}) => {
  const eventId = extractEventId({ id, url });
  const matchUrl = normalizeMatchUrl(url, eventId);
  const feedBase = `${DEFAULT_HOST}/x/feed/`;

  const [html, commonText, summaryText, statsText, historyText] = await Promise.all([
    fetchText(matchUrl, DEFAULT_HOST),
    fetchText(`${feedBase}dc_${PROJECT_ID}_${eventId}`, matchUrl),
    fetchText(`${feedBase}df_sui_${PROJECT_ID}_${eventId}`, matchUrl),
    fetchText(`${feedBase}df_st_${PROJECT_ID}_${eventId}`, matchUrl),
    fetchText(`${feedBase}df_mh_${PROJECT_ID}_${eventId}`, matchUrl)
  ]);

  const common = parseFeed(commonText)[0] || {};
  const summary = parseSummary(parseFeed(summaryText));
  const history = parseMatchHistory(parseFeed(historyText));
  const stageMap = extractStageMap(html);
  const players = extractPlayers(html);
  const servingSide = history.currentGame?.server || "";
  const title = extractMeta(html, "og:title") || players.map((player) => player.name).join(" - ");
  const tournament = extractMeta(html, "og:description");

  return {
    schemaVersion: "1.0",
    provider: "flashscore",
    generatedAt: new Date().toISOString(),
    source: {
      eventId,
      url: matchUrl,
      feeds: {
        common: `dc_${PROJECT_ID}_${eventId}`,
        summary: `df_sui_${PROJECT_ID}_${eventId}`,
        statistics: `df_st_${PROJECT_ID}_${eventId}`,
        matchHistory: `df_mh_${PROJECT_ID}_${eventId}`
      }
    },
    match: {
      id: eventId,
      title,
      tournament,
      status: value(common, "DL") === "3" ? "live" : "unknown",
      stage: stageMap[value(common, "DB")] || summary.label || "Live",
      duration: summary.duration,
      startedAtUnix: value(common, "DC"),
      updatedAtUnix: value(common, "DD")
    },
    players: players.map((player) => ({
      ...player,
      isServing: player.side === servingSide
    })),
    score: {
      current: {
        home: value(common, "DP"),
        away: value(common, "DQ")
      },
      games: {
        home: value(common, "DN", summary.homeGames),
        away: value(common, "DO", summary.awayGames)
      },
      sets: deriveSets(summary, common)
    },
    statistics: parseStats(parseFeed(statsText)),
    matchHistory: history.games,
    currentGame: history.currentGame,
    raw: {
      common
    }
  };
};
