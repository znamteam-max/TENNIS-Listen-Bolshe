export async function proxyTickerRoute(req, res, config) {
  // Fallback proxy: Worker keeps the exact current ticker renderer for MVP.
  const response = await fetch(new URL(req.originalUrl, config.workerFallbackBaseUrl), { redirect: "follow" });
  res.status(response.status);
  for (const [name, value] of response.headers.entries()) {
    if (["content-encoding", "content-length"].includes(name.toLowerCase())) continue;
    res.setHeader(name, value);
  }
  const html = await response.text();
  res.send(html);
}
