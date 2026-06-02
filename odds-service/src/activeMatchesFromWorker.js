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

function requestInit(secret, timeoutMs = 8000) {
  const init = {
    headers: {
      "x-odds-secret": secret
    }
  };
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    init.signal = AbortSignal.timeout(timeoutMs);
  }
  return init;
}

export async function fetchActiveMatchesFromWorker({ workerBaseUrl, secret, timeoutMs = 8000 }) {
  const endpoint = `${String(workerBaseUrl || "").replace(/\/+$/, "")}/api/odds/active`;
  const response = await fetch(endpoint, requestInit(secret, timeoutMs));
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
      endpoint,
      status: response.status,
      error: (body && body.error) || rawText || `HTTP ${response.status}`,
      matches: []
    };
  }

  const items = Array.isArray(body?.matches) ? body.matches : [];
  const matches = items.map((item) => normalizeMatch(item)).filter(Boolean);
  return {
    ok: true,
    endpoint,
    status: response.status,
    count: matches.length,
    matches,
    rawCount: Number(body?.count || 0)
  };
}
