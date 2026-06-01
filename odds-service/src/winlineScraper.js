import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const POSITIVE_MARKET_TITLES = [
  "исход",
  "исход 12",
  "исход 12 матч",
  "победитель",
  "победитель матча",
  "основной исход",
  "1x2",
  "match winner",
  "winner"
];

const BANNED_MARKET_WORDS = [
  "сет",
  "гейм",
  "очко",
  "тай",
  "тай-брейк",
  "фора",
  "тотал",
  "точный",
  "следующий",
  "брейк",
  "подача",
  "set",
  "game",
  "point",
  "tie break",
  "handicap",
  "total",
  "break"
];

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\u0451/g, "\u0435")
    .replace(/[.,:;()[\]{}"'`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeNameToken(name) {
  const tokens = normalizeText(name)
    .replace(/[^a-zа-я0-9 ]/gi, " ")
    .split(" ")
    .filter(Boolean);
  if (!tokens.length) return "";
  const strong = tokens.filter((token) => /[a-zа-я]/i.test(token) && token.length >= 3);
  if (strong.length) {
    strong.sort((a, b) => b.length - a.length);
    return strong[0];
  }
  return tokens[tokens.length - 1];
}

function parseOddValue(value) {
  const text = String(value ?? "").trim().replace(",", ".");
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(text)) return null;
  const numeric = Number(text);
  if (!Number.isFinite(numeric)) return null;
  return numeric;
}

export function isValidMatchWinnerOddsPair(odds) {
  const a = Number(odds?.player1);
  const b = Number(odds?.player2);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  if (a <= 1 || b <= 1) return false;
  if (a > 50 || b > 50) return false;
  const impliedSum = (1 / a) + (1 / b);
  return impliedSum >= 0.85 && impliedSum <= 1.35;
}

function formatOdd(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Number(numeric.toFixed(2));
}

function containsAny(textValue, patterns) {
  const normalized = normalizeText(textValue);
  if (!normalized) return false;
  return patterns.some((pattern) => normalized.includes(normalizeText(pattern)));
}

function pickBestCandidate(candidates = []) {
  const valid = candidates
    .map((candidate) => ({
      ...candidate,
      odds: {
        player1: formatOdd(candidate?.odds?.player1),
        player2: formatOdd(candidate?.odds?.player2)
      }
    }))
    .filter((candidate) => isValidMatchWinnerOddsPair(candidate.odds));

  if (!valid.length) return null;
  valid.sort((a, b) => (Number(b.score || 0) - Number(a.score || 0)));
  return valid[0];
}

export async function scrapeWinlineMatchWinnerOdds({ page, winlineUrl, player1Name, player2Name, settleDelayMs = 5000, timeoutMs = 45000 }) {
  const player1Token = normalizeNameToken(player1Name);
  const player2Token = normalizeNameToken(player2Name);
  const debug = {
    winlineUrl,
    player1Name: player1Name || null,
    player2Name: player2Name || null,
    player1Token,
    player2Token,
    pageTitle: null,
    bodyChecks: null,
    candidates: [],
    reason: null
  };

  await page.goto(winlineUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
  try {
    await page.waitForLoadState("networkidle", { timeout: Math.min(8000, timeoutMs) });
  } catch {
    // Some pages keep long-polling or analytics requests open; continue with settled DOM.
  }
  await page.waitForTimeout(settleDelayMs);
  debug.pageTitle = await page.title();

  const scan = await page.evaluate(({ positiveTitles, bannedWords, player1TokenInner, player2TokenInner }) => {
    const normalize = (value) =>
      String(value || "")
        .toLowerCase()
        .replace(/\u0451/g, "\u0435")
        .replace(/[.,:;()[\]{}"'`]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const containsAny = (textValue, patterns) => {
      const normalized = normalize(textValue);
      if (!normalized) return false;
      return patterns.some((pattern) => normalized.includes(normalize(pattern)));
    };

    const extractOdds = (textValue) => {
      const matches = String(textValue || "").match(/\b\d{1,2}[.,]\d{1,2}\b/g) || [];
      const unique = [];
      for (const item of matches) {
        const normalized = item.replace(",", ".");
        const numeric = Number(normalized);
        if (!Number.isFinite(numeric)) continue;
        if (numeric <= 1 || numeric > 50) continue;
        if (!unique.includes(normalized)) unique.push(normalized);
      }
      return unique.slice(0, 6);
    };

    const bodyText = document.body?.innerText || "";
    const bodyNormalized = normalize(bodyText);
    const nodes = Array.from(document.querySelectorAll("div, section, article, li"));
    const candidates = [];
    const MAX_NODES = 5000;

    for (const node of nodes.slice(0, MAX_NODES)) {
      const raw = node?.innerText || "";
      const text = raw.replace(/\s+/g, " ").trim();
      if (!text || text.length < 6 || text.length > 600) continue;
      const normalized = normalize(text);
      const hasPositive = containsAny(normalized, positiveTitles);
      const hasBanned = containsAny(normalized, bannedWords);
      const hasP1P2Markers = /\b(п1|п2|p1|p2|1|2)\b/i.test(text);
      const hasPlayers =
        (player1TokenInner && normalized.includes(player1TokenInner))
        || (player2TokenInner && normalized.includes(player2TokenInner));
      const oddsRaw = extractOdds(text);
      if (!oddsRaw.length) continue;

      if (!hasPositive && !hasP1P2Markers && !hasPlayers) continue;
      if (hasBanned && !hasPlayers) continue;

      const odds = oddsRaw.map((value) => Number(value));
      const pair = odds.length >= 2 ? { player1: odds[0], player2: odds[1] } : null;
      let score = 0;
      if (hasPositive) score += 120;
      if (hasP1P2Markers) score += 35;
      if (hasPlayers) score += 35;
      if (!hasBanned) score += 15;
      if (pair) score += 20;

      candidates.push({
        score,
        titleSnippet: text.slice(0, 180),
        normalizedSnippet: normalized.slice(0, 180),
        hasPositive,
        hasBanned,
        hasP1P2Markers,
        hasPlayers,
        oddsRaw: oddsRaw.slice(0, 4),
        odds: pair || { player1: null, player2: null }
      });
    }

    candidates.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
    return {
      bodyChecks: {
        hasPlayer1: player1TokenInner ? bodyNormalized.includes(player1TokenInner) : null,
        hasPlayer2: player2TokenInner ? bodyNormalized.includes(player2TokenInner) : null,
        hasOutcomeWords: containsAny(bodyNormalized, positiveTitles),
        hasOddsLikeNumbers: /\b\d{1,2}[.,]\d{1,2}\b/.test(bodyText)
      },
      candidates: candidates.slice(0, 60)
    };
  }, {
    positiveTitles: POSITIVE_MARKET_TITLES,
    bannedWords: BANNED_MARKET_WORDS,
    player1TokenInner: player1Token,
    player2TokenInner: player2Token
  });

  debug.bodyChecks = scan.bodyChecks;
  debug.candidates = scan.candidates;

  const winnerCandidate = pickBestCandidate(scan.candidates);
  if (!winnerCandidate) {
    debug.reason = "Match winner market not found";
    return {
      ok: false,
      odds: { player1: null, player2: null },
      marketTitle: null,
      error: "Match winner market not found",
      debug
    };
  }

  return {
    ok: true,
    odds: {
      player1: winnerCandidate.odds.player1,
      player2: winnerCandidate.odds.player2
    },
    marketTitle: winnerCandidate.titleSnippet || "Match winner",
    debug
  };
}

async function runScrapeCli() {
  const winlineUrl = String(process.argv[2] || "").trim();
  if (!winlineUrl) {
    console.error("Usage: npm run test:scrape -- <winlineUrl> [player1Name] [player2Name]");
    process.exit(1);
  }
  const player1Name = String(process.argv[3] || "").trim();
  const player2Name = String(process.argv[4] || "").trim();

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const result = await scrapeWinlineMatchWinnerOdds({
      page,
      winlineUrl,
      player1Name,
      player2Name,
      settleDelayMs: 5000,
      timeoutMs: 45000
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirectRun) {
  runScrapeCli().catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exit(1);
  });
}
