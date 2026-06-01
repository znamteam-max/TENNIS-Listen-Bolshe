export async function pushOdds({ workerBaseUrl, secret, payload }) {
  const endpoint = `${String(workerBaseUrl || "").replace(/\/+$/, "")}/api/odds/push`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-odds-secret": secret
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Push failed ${response.status}: ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch (_error) {
    return { ok: true, raw: text };
  }
}
