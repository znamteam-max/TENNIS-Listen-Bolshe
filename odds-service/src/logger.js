function nowIso() {
  return new Date().toISOString();
}

export function log(message, extra = null) {
  if (extra === null || extra === undefined) {
    console.log(`[${nowIso()}] ${message}`);
    return;
  }
  console.log(`[${nowIso()}] ${message}`, extra);
}

export function logError(message, error) {
  const detail = error?.stack || error?.message || String(error);
  console.error(`[${nowIso()}] ${message}: ${detail}`);
}
