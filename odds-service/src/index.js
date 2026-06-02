import http from "node:http";
import { chromium } from "playwright";
import { getActiveMatches as getFallbackActiveMatches } from "./activeMatches.js";
import { fetchActiveMatchesFromWorker } from "./activeMatchesFromWorker.js";
import { getConfig } from "./config.js";
import { log, logError } from "./logger.js";
import { pushOdds } from "./pushOdds.js";
import { scrapeWinlineMatchWinnerOdds } from "./winlineScraper.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeMatch(item = {}) {
  const matchId = String(item.matchId || "").trim();
  const winlineUrl = String(item.winlineUrl || "").trim();
  if (!matchId || !winlineUrl) return null;
  return {
    matchId,
    winlineUrl,
    player1Name: String(item.player1Name || "").trim(),
    player2Name: String(item.player2Name || "").trim()
  };
}

function hasValidOddsPair(odds) {
  return Number.isFinite(Number(odds?.player1)) && Number.isFinite(Number(odds?.player2));
}

function toJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    const total = chunks.reduce((sum, item) => sum + item.length, 0);
    if (total > 64 * 1024) throw new Error("payload-too-large");
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function ensureSecret(headers, expectedSecret) {
  const provided = String(headers["x-odds-secret"] || "").trim();
  return Boolean(expectedSecret && provided && provided === expectedSecret);
}

async function ensureMatchPage(browserContext, pageByMatchId, match) {
  const existing = pageByMatchId.get(match.matchId);
  if (existing && !existing.isClosed()) return existing;
  const page = await browserContext.newPage();
  pageByMatchId.set(match.matchId, page);
  return page;
}

async function processOneMatch({ browserContext, pageByMatchId, config, match }) {
  const page = await ensureMatchPage(browserContext, pageByMatchId, match);
  const matchPrefix = `[${match.matchId}]`;

  log(`${matchPrefix} scraping ${match.player1Name} - ${match.player2Name}`);
  let scrapeResult;
  try {
    scrapeResult = await scrapeWinlineMatchWinnerOdds({
      page,
      winlineUrl: match.winlineUrl,
      player1Name: match.player1Name,
      player2Name: match.player2Name,
      settleDelayMs: config.settleDelayMs,
      timeoutMs: config.pageTimeoutMs
    });
  } catch (error) {
    logError(`${matchPrefix} scrape crash`, error);
    scrapeResult = {
      ok: false,
      odds: { player1: null, player2: null },
      marketTitle: null,
      error: `Scrape failed: ${error?.message || String(error)}`
    };
  }

  if (scrapeResult.ok) {
    log(`${matchPrefix} odds found: ${scrapeResult.odds.player1} / ${scrapeResult.odds.player2}, market: ${scrapeResult.marketTitle}`);
  } else {
    log(`${matchPrefix} odds not found: ${scrapeResult.error || "Match winner market not found"}`);
  }

  const payload = {
    matchId: match.matchId,
    source: "winline-playwright",
    winlineUrl: match.winlineUrl,
    player1: scrapeResult.ok ? scrapeResult.odds.player1 : null,
    player2: scrapeResult.ok ? scrapeResult.odds.player2 : null,
    marketTitle: scrapeResult.ok ? scrapeResult.marketTitle : null,
    error: scrapeResult.ok ? null : (scrapeResult.error || "Match winner market not found"),
    updatedAt: new Date().toISOString()
  };

  const pushed = await pushOdds({
    workerBaseUrl: config.workerBaseUrl,
    secret: config.oddsPushSecret,
    payload
  });

  if (scrapeResult.ok) {
    log(`${matchPrefix} pushed to Worker`, {
      odds: pushed?.odds || null,
      invalid: pushed?.invalid ?? null
    });
  } else {
    log(`${matchPrefix} pushed null/null to Worker`, {
      invalid: pushed?.invalid ?? null,
      invalidReason: pushed?.invalidReason ?? null
    });
  }
}

async function resolveActiveMatches(config) {
  const remote = await fetchActiveMatchesFromWorker({
    workerBaseUrl: config.workerBaseUrl,
    secret: config.oddsPushSecret,
    timeoutMs: config.activeFetchTimeoutMs
  }).catch((error) => ({
    ok: false,
    error: error?.message || String(error),
    matches: []
  }));

  if (remote.ok) {
    return {
      source: "worker",
      matches: remote.matches
    };
  }

  if (config.allowFallbackActiveMatches) {
    const fallbackMatches = getFallbackActiveMatches();
    return {
      source: "fallback",
      matches: fallbackMatches,
      error: remote.error || `HTTP ${remote.status || "?"}`
    };
  }

  return {
    source: "worker",
    matches: [],
    error: remote.error || `HTTP ${remote.status || "?"}`
  };
}

async function discoverCandidateWithPage(browserContext, config, payload = {}) {
  const winlineUrl = String(payload.winlineUrl || "").trim();
  const player1Name = String(payload.player1Name || "").trim();
  const player2Name = String(payload.player2Name || "").trim();
  if (!winlineUrl) {
    return {
      ok: true,
      candidates: [],
      likelyReason: "discover-requires-explicit-winline-url",
      recommendation: "insert-winline-url-manually"
    };
  }

  const page = await browserContext.newPage();
  try {
    const result = await scrapeWinlineMatchWinnerOdds({
      page,
      winlineUrl,
      player1Name,
      player2Name,
      settleDelayMs: config.settleDelayMs,
      timeoutMs: config.pageTimeoutMs
    });

    if (!result.ok || !hasValidOddsPair(result.odds)) {
      return {
        ok: true,
        candidates: [],
        likelyReason: result.error || "match-winner-market-not-found",
        recommendation: "insert-winline-url-manually",
        debug: result.debug || null
      };
    }

    return {
      ok: true,
      candidates: [
        {
          winlineUrl,
          player1Name,
          player2Name,
          odds: {
            player1: result.odds.player1,
            player2: result.odds.player2
          },
          confidence: 0.93,
          marketTitle: result.marketTitle || "Match winner"
        }
      ]
    };
  } finally {
    if (!page.isClosed()) await page.close();
  }
}

function buildRefreshMatch(payload = {}) {
  const normalized = normalizeMatch(payload);
  if (normalized) return normalized;
  const matchId = String(payload.matchId || "").trim();
  if (!matchId) return null;
  return {
    matchId,
    winlineUrl: String(payload.winlineUrl || "").trim(),
    player1Name: String(payload.player1Name || "").trim(),
    player2Name: String(payload.player2Name || "").trim()
  };
}

function closeStalePages(pageByMatchId, activeMatchIds) {
  for (const [matchId, page] of pageByMatchId.entries()) {
    if (activeMatchIds.has(matchId)) continue;
    pageByMatchId.delete(matchId);
    if (!page.isClosed()) {
      page.close().catch(() => {});
    }
  }
}

async function run() {
  const config = getConfig();

  const browser = await chromium.launch({ headless: config.headless });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
  });
  const pageByMatchId = new Map();
  const forcedRefreshByMatchId = new Map();

  const server = http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url || "/", "http://127.0.0.1");

    if (requestUrl.pathname === "/health" && req.method === "GET") {
      toJson(res, 200, {
        ok: true,
        service: "listen-bolshe-odds-sidecar",
        pollIntervalMs: config.pollIntervalMs
      });
      return;
    }

    if (requestUrl.pathname === "/refresh" && req.method === "POST") {
      if (!ensureSecret(req.headers, config.serviceSecret)) {
        toJson(res, 401, { ok: false, error: "forbidden" });
        return;
      }
      try {
        const payload = await readJsonBody(req);
        const refreshMatch = buildRefreshMatch(payload);
        if (!refreshMatch?.matchId) {
          toJson(res, 400, { ok: false, error: "matchId is required" });
          return;
        }
        forcedRefreshByMatchId.set(refreshMatch.matchId, refreshMatch);
        toJson(res, 200, {
          ok: true,
          queued: true,
          matchId: refreshMatch.matchId
        });
      } catch (error) {
        toJson(res, 400, { ok: false, error: error?.message || String(error) });
      }
      return;
    }

    if (requestUrl.pathname === "/discover" && req.method === "POST") {
      if (!ensureSecret(req.headers, config.serviceSecret)) {
        toJson(res, 401, { ok: false, error: "forbidden" });
        return;
      }
      try {
        const payload = await readJsonBody(req);
        const discovered = await discoverCandidateWithPage(context, config, payload);
        toJson(res, 200, discovered);
      } catch (error) {
        toJson(res, 500, { ok: false, error: error?.message || String(error) });
      }
      return;
    }

    toJson(res, 404, { ok: false, error: "not-found" });
  });

  await new Promise((resolve) => {
    server.listen(config.servicePort, resolve);
  });

  log("odds-service starting", {
    workerBaseUrl: config.workerBaseUrl,
    pollIntervalMs: config.pollIntervalMs,
    headless: config.headless,
    servicePort: config.servicePort,
    allowFallbackActiveMatches: config.allowFallbackActiveMatches
  });

  let isStopping = false;
  const stop = async (signal) => {
    if (isStopping) return;
    isStopping = true;
    log(`received ${signal}, shutting down...`);
    try {
      server.close();
      for (const page of pageByMatchId.values()) {
        if (!page.isClosed()) await page.close();
      }
      await context.close();
      await browser.close();
    } finally {
      process.exit(0);
    }
  };
  process.on("SIGINT", () => void stop("SIGINT"));
  process.on("SIGTERM", () => void stop("SIGTERM"));

  while (true) {
    const active = await resolveActiveMatches(config);
    const combinedByMatchId = new Map();
    for (const match of active.matches) {
      combinedByMatchId.set(match.matchId, match);
    }
    for (const [matchId, refreshMatch] of forcedRefreshByMatchId.entries()) {
      const merged = normalizeMatch({
        ...(combinedByMatchId.get(matchId) || {}),
        ...refreshMatch,
        matchId
      });
      if (merged) combinedByMatchId.set(matchId, merged);
    }

    const matches = Array.from(combinedByMatchId.values()).filter(Boolean);
    closeStalePages(pageByMatchId, new Set(matches.map((item) => item.matchId)));

    if (!matches.length) {
      if (active.error) {
        log(`no active matches (${active.source}): ${active.error}`);
      }
      await sleep(config.pollIntervalMs);
      continue;
    }

    for (const match of matches) {
      try {
        await processOneMatch({ browserContext: context, pageByMatchId, config, match });
      } catch (error) {
        logError(`[${match.matchId}] cycle error`, error);
      } finally {
        forcedRefreshByMatchId.delete(match.matchId);
      }
    }

    await sleep(config.pollIntervalMs);
  }
}

run().catch((error) => {
  logError("odds-service fatal", error);
  process.exit(1);
});
