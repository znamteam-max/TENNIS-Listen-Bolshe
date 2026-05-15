import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getFlashscoreMatch } from "./lib/flashscore-adapter.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = resolve(__dirname, "public");
const port = Number(process.env.PORT || 5173);

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"]
]);

const sendJson = (res, status, payload) => {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*"
  });
  res.end(body);
};

const sendText = (res, status, body, type = "text/plain; charset=utf-8") => {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(body);
};

const safeStaticPath = (pathname) => {
  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const normalized = normalize(decodeURIComponent(requestPath)).replace(/^(\.\.[/\\])+/, "");
  const absolute = resolve(join(publicDir, normalized));
  return absolute.startsWith(publicDir) ? absolute : null;
};

const handleProxy = async (req, res, url) => {
  const target = url.searchParams.get("url");
  if (!target || !/^https?:\/\//i.test(target)) {
    sendJson(res, 400, { error: "Query parameter url must be an http(s) URL." });
    return;
  }

  const upstream = await fetch(target, {
    headers: {
      "user-agent": "Mozilla/5.0 Tennis Overlay Local Proxy",
      accept: "application/json,text/plain,*/*"
    }
  });
  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  const body = await upstream.arrayBuffer();
  res.writeHead(upstream.status, {
    "content-type": contentType,
    "cache-control": "no-store",
    "access-control-allow-origin": "*"
  });
  res.end(Buffer.from(body));
};

const handleFlashscore = async (req, res, url) => {
  const id = url.searchParams.get("id");
  const sourceUrl = url.searchParams.get("url");
  const data = await getFlashscoreMatch({ id, url: sourceUrl });
  sendJson(res, 200, data);
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);

    if (url.pathname === "/api/health") {
      sendJson(res, 200, { ok: true, service: "tennis-overlay", time: new Date().toISOString() });
      return;
    }

    if (url.pathname === "/api/proxy") {
      await handleProxy(req, res, url);
      return;
    }

    if (url.pathname === "/api/match/flashscore") {
      await handleFlashscore(req, res, url);
      return;
    }

    const filePath = safeStaticPath(url.pathname);
    if (!filePath || !existsSync(filePath)) {
      sendText(res, 404, "Not found");
      return;
    }

    const contentType = mimeTypes.get(extname(filePath).toLowerCase()) || "application/octet-stream";
    res.writeHead(200, {
      "content-type": contentType,
      "cache-control": contentType.includes("html") ? "no-store" : "public, max-age=60"
    });
    createReadStream(filePath).pipe(res);
  } catch (error) {
    sendJson(res, 500, {
      error: "Server error",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Tennis overlay server: http://127.0.0.1:${port}/`);
});
