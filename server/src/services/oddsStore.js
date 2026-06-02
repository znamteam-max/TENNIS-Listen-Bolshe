const ODDS_PREFIX = "odds:";
const ACTIVE_KEY = "odds:active";

function nowIso() {
  return new Date().toISOString();
}

function matchKey(matchId) {
  const key = String(matchId || "").trim();
  if (!key) throw new Error("matchId is required");
  return key;
}

function asOdd(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric.toFixed(2);
}

function oddsObject(player1, player2) {
  const home = asOdd(player1);
  const away = asOdd(player2);
  return { player1: home, player2: away, home, away };
}

function defaultState(matchId) {
  return {
    matchId,
    source: "none",
    mode: "off",
    autoUpdate: false,
    odds: oddsObject(null, null),
    updatedAt: null,
    lastSuccessAt: null,
    lastError: null,
    invalid: false,
    invalidReason: null,
    stale: false
  };
}

function normalizeState(matchId, value) {
  return {
    ...defaultState(matchId),
    ...(value || {}),
    matchId,
    odds: {
      ...oddsObject(null, null),
      ...(value?.odds || {})
    }
  };
}

async function activeMap(store) {
  const value = await store.get(ACTIVE_KEY);
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function createOddsStore(stateStore, config) {
  function assertSecret(req, allowServiceSecret = true) {
    const provided = String(req.get("x-odds-secret") || "").trim();
    const allowed = [config.oddsPushSecret];
    if (allowServiceSecret) allowed.push(config.oddsServiceSecret);
    if (!provided || !allowed.filter(Boolean).includes(provided)) {
      const error = new Error("forbidden");
      error.status = 401;
      throw error;
    }
  }

  async function getState(matchIdRaw) {
    const matchId = matchKey(matchIdRaw);
    const stored = await stateStore.get(`${ODDS_PREFIX}${matchId}`);
    return normalizeState(matchId, stored);
  }

  async function setState(matchIdRaw, patch) {
    const matchId = matchKey(matchIdRaw);
    const current = await getState(matchId);
    const next = normalizeState(matchId, {
      ...current,
      ...patch,
      odds: patch.odds ? { ...oddsObject(null, null), ...patch.odds } : current.odds,
      updatedAt: patch.updatedAt || nowIso()
    });
    await stateStore.set(`${ODDS_PREFIX}${matchId}`, next);
    return next;
  }

  async function removeActive(matchIdRaw) {
    const matchId = matchKey(matchIdRaw);
    const active = await activeMap(stateStore);
    delete active[matchId];
    await stateStore.set(ACTIVE_KEY, active);
  }

  async function upsertActive(matchIdRaw, entry) {
    const matchId = matchKey(matchIdRaw);
    const active = await activeMap(stateStore);
    const timestamp = nowIso();
    active[matchId] = {
      ...(active[matchId] || {}),
      matchId,
      winlineUrl: String(entry.winlineUrl || active[matchId]?.winlineUrl || "").trim(),
      player1Name: String(entry.player1Name || active[matchId]?.player1Name || "").trim(),
      player2Name: String(entry.player2Name || active[matchId]?.player2Name || "").trim(),
      source: entry.source || active[matchId]?.source || "winline",
      mode: entry.mode || active[matchId]?.mode || "sidecar_pending",
      autoUpdate: entry.autoUpdate ?? active[matchId]?.autoUpdate ?? true,
      createdAt: active[matchId]?.createdAt || timestamp,
      updatedAt: timestamp
    };
    await stateStore.set(ACTIVE_KEY, active);
    return active[matchId];
  }

  return {
    assertSecret,

    async current(matchId) {
      return getState(matchId);
    },

    async manual(payload) {
      const matchId = matchKey(payload.matchId);
      const state = await setState(matchId, {
        source: "manual",
        mode: "manual",
        autoUpdate: false,
        odds: oddsObject(payload.player1 ?? payload.home ?? payload.homeOdd, payload.player2 ?? payload.away ?? payload.awayOdd),
        player1Name: payload.player1Name,
        player2Name: payload.player2Name,
        lastSuccessAt: nowIso(),
        lastError: null,
        invalid: false,
        invalidReason: null,
        stale: false
      });
      await removeActive(matchId);
      return state;
    },

    async link(payload) {
      const matchId = matchKey(payload.matchId);
      const state = await setState(matchId, {
        source: "winline",
        mode: "sidecar_pending",
        autoUpdate: true,
        winlineUrl: String(payload.winlineUrl || "").trim(),
        player1Name: String(payload.player1Name || "").trim(),
        player2Name: String(payload.player2Name || "").trim(),
        odds: oddsObject(null, null),
        lastError: "Waiting for sidecar",
        invalid: true,
        invalidReason: "missing-or-not-finite",
        stale: true
      });
      await upsertActive(matchId, state);
      return state;
    },

    async disable(payload) {
      const matchId = matchKey(payload.matchId);
      const state = await setState(matchId, {
        mode: "off",
        source: "off",
        autoUpdate: false,
        odds: oddsObject(null, null),
        lastError: null,
        invalid: false,
        invalidReason: null,
        stale: false
      });
      await removeActive(matchId);
      return state;
    },

    async reset(payload) {
      const matchId = matchKey(payload.matchId);
      await stateStore.delete(`${ODDS_PREFIX}${matchId}`);
      await removeActive(matchId);
      return defaultState(matchId);
    },

    async push(payload) {
      const matchId = matchKey(payload.matchId);
      const current = await getState(matchId);
      if (current.mode === "manual" && current.autoUpdate === false) {
        return { ...current, ignored: true, ignoreReason: "manual-mode" };
      }

      const odds = oddsObject(payload.player1 ?? payload.home, payload.player2 ?? payload.away);
      const hasOdds = odds.player1 !== null && odds.player2 !== null;
      const state = await setState(matchId, {
        source: payload.source || "winline-playwright",
        mode: "sidecar",
        autoUpdate: false,
        winlineUrl: String(payload.winlineUrl || current.winlineUrl || "").trim(),
        player1Name: String(payload.player1Name || current.player1Name || "").trim(),
        player2Name: String(payload.player2Name || current.player2Name || "").trim(),
        marketTitle: payload.marketTitle || current.marketTitle || "",
        odds,
        lastSuccessAt: hasOdds ? payload.updatedAt || nowIso() : current.lastSuccessAt,
        lastError: hasOdds ? null : payload.lastError || "Sidecar returned empty odds",
        invalid: !hasOdds,
        invalidReason: hasOdds ? null : "missing-or-not-finite",
        stale: !hasOdds
      });
      await upsertActive(matchId, state);
      return state;
    },

    async active() {
      const active = await activeMap(stateStore);
      return Object.values(active).sort((left, right) => String(left.matchId).localeCompare(String(right.matchId)));
    }
  };
}

export function oddsPayload(state) {
  return {
    ok: true,
    buildVersion: "node-mirror-v1",
    matchId: state.matchId,
    source: state.source,
    mode: state.mode,
    autoUpdate: state.autoUpdate,
    odds: state.odds,
    updatedAt: state.updatedAt,
    lastSuccessAt: state.lastSuccessAt,
    lastError: state.lastError,
    invalid: state.invalid,
    invalidReason: state.invalidReason,
    stale: state.stale,
    winlineUrl: state.winlineUrl,
    player1Name: state.player1Name,
    player2Name: state.player2Name,
    ignored: state.ignored,
    ignoreReason: state.ignoreReason
  };
}
