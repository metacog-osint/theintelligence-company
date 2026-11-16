// A stand-in product page carrying the house bar, served at a program's own address under a strict CSP, the way the
// program sites serve tic-nav.js and tic-nav.css. Used by nav.test.js and a11y.test.js.
// v1.12: the page is long enough to scroll; `stickyHeader` makes its own header sticky below the bar with
// var(--tic-house-h), as a program site with a sticky header does; `slot` mounts the bar in <div id="tic-nav"> inside
// a short wrapper instead of first in <body>; `alsoServe` lists other program origins served the same page, so a test
// can follow the visitor from one program to another in the same browser.
// v2.0: `health` serves COP's health check at https://cop.theintelligence.company/data/health.json (a fixture file name
// in tests/fixtures, or { status } for a failure) with open CORS, and lets the page's CSP connect to COP, as a site
// that turns on the freshness dots does. Requests to COP are counted in `healthHits`.
import { read } from "./source.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const COP = "https://cop.theintelligence.company";

const PAGE = ({ attrs = "", slot = false } = {}) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Stand-in product</title>
<link rel="stylesheet" href="/tic-nav.css"><link rel="stylesheet" href="/page.css"></head><body>
${slot ? '<div class="wrap"><a class="skip" href="#main">Skip to content</a><div id="tic-nav"></div></div>' : ""}
<header class="product">A stand-in product header <a href="#limits">Limits</a></header>
<main id="main"><h1>Stand-in product page</h1><p>Content.</p>
<section><h2>Method</h2><p>More content.</p></section>
<section><h2 id="limits">Limits</h2><p>An anchor target.</p></section>
<section><h2>Sources</h2><p><a href="#main">Back to the top</a></p></section></main>
<script src="/tic-nav.js"${attrs}></script></body></html>`;
const PAGE_CSS = ({ stickyHeader = false } = {}) => `body { margin: 0; font: 16px/1.5 system-ui, sans-serif; }
header.product { display: flex; justify-content: space-between; padding: 16px 24px; background: #fff; color: #111;
  border-bottom: 1px solid #ccc; ${stickyHeader ? "position: sticky; top: var(--tic-house-h, 0px); z-index: 50;" : ""} }
header.product a { color: #1a4fa0; }
main { padding: 0 24px; }
section { min-height: 900px; }
.wrap { padding: 4px 0; }
.skip { position: absolute; left: -9999px; }`;
const CSP = "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:";
const CSP_COP = CSP + "; connect-src 'self' " + COP;

export async function openStandIn(browser, { origin = "https://vigil.theintelligence.company", attrs = "", phone = false,
  width = 375, colorScheme = "light", bypassCSP = false, slot = false, stickyHeader = false, alsoServe = [],
  reducedMotion = "no-preference", initScript = null, health = null } = {}) {
  const context = await browser.newContext({
    viewport: phone ? { width, height: 812 } : { width: 1440, height: 900 }, hasTouch: phone, isMobile: phone,
    colorScheme, bypassCSP, reducedMotion,
  });
  if (initScript) await context.addInitScript(initScript);
  const strays = [];
  const served = [origin, ...alsoServe];
  const hits = { n: 0, cookie: [] };
  await context.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (health && u.origin === COP && u.pathname === "/data/health.json") {
      hits.n++;
      hits.cookie.push(route.request().headers().cookie || "");
      const cors = { "access-control-allow-origin": "*", "content-type": "application/json" };
      if (typeof health === "object") return route.fulfill({ status: health.status, headers: cors, body: "" });
      return route.fulfill({ status: 200, headers: cors, body: fs.readFileSync(path.join(FIXTURES, health), "utf8") });
    }
    if (!served.includes(u.origin)) { strays.push(u.href); return route.abort(); }
    const headers = { "content-security-policy": health ? CSP_COP : CSP };
    if (u.pathname === "/") return route.fulfill({ headers, contentType: "text/html", body: PAGE({ attrs, slot }) });
    if (u.pathname === "/page.css") return route.fulfill({ headers, contentType: "text/css", body: PAGE_CSS({ stickyHeader }) });
    if (u.pathname === "/tic-nav.js") return route.fulfill({ headers, contentType: "text/javascript", body: read("site/shared/tic-nav.js") });
    if (u.pathname === "/tic-nav.css") return route.fulfill({ headers, contentType: "text/css", body: read("site/shared/tic-nav.css") });
    return route.fulfill({ status: 404, headers, body: "" });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.goto(origin + "/", { waitUntil: "load" });
  return { page, context, errors, strays, healthHits: hits, close: () => context.close() };
}
