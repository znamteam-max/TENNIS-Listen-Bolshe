import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const workerPath = join(repoRoot, "cloudflare/overlay-worker/src/index.js");

function escapeForTemplate(input) {
  return String(input)
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

function replaceTemplateConst(source, name, nextName, content) {
  const startMarker = `const ${name} = `;
  const endMarker = `const ${nextName} = `;
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`Missing template const start: ${name}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`Missing template const end anchor: ${nextName}`);
  const replacement = `const ${name} = \`${escapeForTemplate(content)}\`;\n\n`;
  return `${source.slice(0, start)}${replacement}${source.slice(end)}`;
}

function replaceBase64Const(source, name, bytes) {
  const pattern = new RegExp(`const ${name} = "[^"]*";\\n`);
  const replacement = `const ${name} = "${Buffer.from(bytes).toString("base64")}";\n`;
  if (pattern.test(source)) return source.replace(pattern, replacement);
  const anchor = "const NEWS_TICKER_LOGO_BASE64 = \"";
  const index = source.indexOf(anchor);
  if (index < 0) throw new Error(`Missing insertion anchor for ${name}`);
  return `${source.slice(0, index)}${replacement}${source.slice(index)}`;
}

function patchCssHelpers(source) {
  let next = source.replace(
    'if (url.pathname === "/overlay.css") return text(OVERLAY_CSS, "text/css; charset=utf-8");',
    'if (url.pathname === "/overlay.css") return text(overlayCss(), "text/css; charset=utf-8");'
  );

  const helperPattern = /function overlayCss\(\) \{[\s\S]*?\n\}\n\nfunction newsTickerCss\(\) \{[\s\S]*?\n\}/;
  const legacyHelperPattern = /function newsTickerCss\(\) \{[\s\S]*?\n\}/;
  const helperReplacement = `function overlayCss() {
  return OVERLAY_CSS
    .replace('url("/news-ticker-bg.png")', \`url("data:image/png;base64,\${NEWS_TICKER_BG_PNG_BASE64}")\`)
    .replace('url("/news-ticker-logo.png")', \`url("data:image/png;base64,\${NEWS_TICKER_LOGO_BASE64}")\`);
}

function newsTickerCss() {
  return NEWS_TICKER_CSS
    .replace('url("/news-ticker-bg.png")', \`url("data:image/png;base64,\${NEWS_TICKER_BG_PNG_BASE64}")\`)
    .replace('url("/news-ticker-logo.png")', \`url("data:image/png;base64,\${NEWS_TICKER_LOGO_BASE64}")\`);
}`;

  if (helperPattern.test(next)) return next.replace(helperPattern, helperReplacement);
  if (legacyHelperPattern.test(next)) return next.replace(legacyHelperPattern, helperReplacement);
  throw new Error("Missing newsTickerCss helper");
}

async function run() {
  let worker = await readFile(workerPath, "utf8");

  const overlayHtml = await readFile(join(repoRoot, "public/overlay.html"), "utf8");
  const overlayCss = await readFile(join(repoRoot, "public/overlay.css"), "utf8");
  const overlayJs = await readFile(join(repoRoot, "public/overlay.js"), "utf8");
  const tickerHtml = await readFile(join(repoRoot, "public/news-ticker.html"), "utf8");
  const tickerCss = await readFile(join(repoRoot, "public/news-ticker.css"), "utf8");
  const tickerJs = await readFile(join(repoRoot, "public/news-ticker.js"), "utf8");

  worker = replaceTemplateConst(worker, "OVERLAY_HTML", "OVERLAY_CSS", overlayHtml);
  worker = replaceTemplateConst(worker, "OVERLAY_CSS", "OVERLAY_JS", overlayCss);
  worker = replaceTemplateConst(worker, "OVERLAY_JS", "NEWS_TICKER_HTML", overlayJs);
  worker = replaceTemplateConst(worker, "NEWS_TICKER_HTML", "NEWS_TICKER_CSS", tickerHtml);
  worker = replaceTemplateConst(worker, "NEWS_TICKER_CSS", "NEWS_TICKER_JS", tickerCss);
  worker = replaceTemplateConst(worker, "NEWS_TICKER_JS", "NEWS_TICKER_BG_PNG_BASE64", tickerJs);

  const logoBytes = await readFile(join(repoRoot, "public/news-ticker-logo.png"));
  const tickerBgBytes = await readFile(join(repoRoot, "public/news-ticker-bg.png"));
  const promoBytes = await readFile(join(repoRoot, "public/assets/promo-top-left.jpg"));

  worker = replaceBase64Const(worker, "NEWS_TICKER_BG_PNG_BASE64", tickerBgBytes);
  worker = replaceBase64Const(worker, "NEWS_TICKER_LOGO_BASE64", logoBytes);
  worker = replaceBase64Const(worker, "PROMO_TOP_LEFT_JPG_BASE64", promoBytes);
  worker = patchCssHelpers(worker);

  await writeFile(workerPath, worker, "utf8");
  console.log("Synced worker static assets");
}

await run();
