import { chromium } from "playwright";
import { getActiveMatches } from "./activeMatches.js";
import { getConfig } from "./config.js";
import { log, logError } from "./logger.js";
import { pushOdds } from "./pushOdds.js";
import { scrapeWinlineMatchWinnerOdds } from "./winlineScraper.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  log(`${matchPrefix} scraping ${match.player1Name} — ${match.player2Name}`);
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

async function run() {
  const config = getConfig();
  const matches = getActiveMatches();
  if (!matches.length) throw new Error("No active matches configured");

  log("odds-service starting", {
    workerBaseUrl: config.workerBaseUrl,
    pollIntervalMs: config.pollIntervalMs,
    headless: config.headless,
    matches: matches.map((item) => ({ matchId: item.matchId, winlineUrl: item.winlineUrl }))
  });

  const browser = await chromium.launch({ headless: config.headless });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
  });
  const pageByMatchId = new Map();

  let isStopping = false;
  const stop = async (signal) => {
    if (isStopping) return;
    isStopping = true;
    log(`received ${signal}, shutting down...`);
    try {
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
    for (const match of matches) {
      try {
        await processOneMatch({ browserContext: context, pageByMatchId, config, match });
      } catch (error) {
        logError(`[${match.matchId}] cycle error`, error);
      }
    }
    await sleep(config.pollIntervalMs);
  }
}

run().catch((error) => {
  logError("odds-service fatal", error);
  process.exit(1);
});
